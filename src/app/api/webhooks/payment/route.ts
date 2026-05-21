import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  console.log("\n==================================================");
  console.log("[WEBHOOK] Recebendo notificação de pagamento...");
  console.log("==================================================");

  try {
    // 1. Opcional: Validar token secreto do webhook para segurança de acordo com a configuração do painel
    const systemConfig = await prisma.systemConfig.findUnique({
      where: { id: "default" }
    });

    const isSimulator = !systemConfig || systemConfig.paymentGateway === "SIMULATOR";
    const webhookSecret = systemConfig?.webhookSecret || process.env.PAYMENT_WEBHOOK_SECRET;

    if (!isSimulator && webhookSecret) {
      const clientSecret = req.headers.get("x-webhook-secret");
      if (clientSecret !== webhookSecret) {
        console.warn("[WEBHOOK] Assinatura do webhook inválida ou não autorizada.");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    console.log("[WEBHOOK] Payload recebido:", JSON.stringify(body, null, 2));

    // Suporta vários formatos de payload comum de gateways (Stripe, Mercado Pago, Asaas, etc)
    // Procuramos o ID da solicitação de licença no metadata ou na raiz
    const requestId = body.requestId || 
                      body.external_reference || 
                      body.metadata?.requestId || 
                      body.data?.object?.metadata?.requestId;

    if (!requestId) {
      console.error("[WEBHOOK] Erro: requestId não encontrado no payload do webhook.");
      return NextResponse.json({ error: "requestId is required" }, { status: 400 });
    }

    // 2. Localiza a solicitação de licença pendente
    const request = await prisma.licenseRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      console.error(`[WEBHOOK] Erro: Solicitação com ID ${requestId} não encontrada.`);
      return NextResponse.json({ error: "LicenseRequest not found" }, { status: 404 });
    }

    if (request.status === "APPROVED") {
      console.log(`[WEBHOOK] A solicitação ${requestId} (${request.companyName}) já foi aprovada anteriormente.`);
      return NextResponse.json({ success: true, message: "Already approved" });
    }

    // 3. Define uma senha provisória aleatória para o novo dono
    const tempPassword = "lumus-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // 4. Executa a criação automatizada do tenant/cliente no banco de dados (Transação)
    await prisma.$transaction(async (tx) => {
      // 4.1. Cria a Empresa (Tenant)
      const company = await tx.company.create({
        data: {
          name: request.companyName,
          isActive: true
        }
      });

      // 4.2. Cria a Unidade Matriz
      await tx.unit.create({
        data: {
          companyId: company.id,
          name: "Unidade Principal (Sede)",
          isHeadquarters: true
        }
      });

      // 4.3. Cria a Licença comercial
      await tx.license.create({
        data: {
          companyId: company.id,
          plan: request.plan,
          status: "ACTIVE",
          maxUnits: request.maxUnits,
          expiresAt: null // Renovação automática ou anual
        }
      });

      // 4.4. Cria a conta do Proprietário (Admin da Empresa)
      await tx.user.create({
        data: {
          companyId: company.id,
          name: request.ownerName,
          email: request.email,
          password_hash: tempPassword,
          role: "COMPANY_ADMIN",
          permissions: JSON.stringify(["ALL"])
        }
      });

      // 4.5. Atualiza o status da Solicitação de Licença
      await tx.licenseRequest.update({
        where: { id: requestId },
        data: { 
          status: "APPROVED",
          paymentStatus: "PAID"
        }
      });
    });

    console.log(`\n==================================================`);
    console.log(`🎉 [SUCESSO WEBHOOK] LICENÇA GERADA AUTOMATICAMENTE!`);
    console.log(`Empresa Criada: ${request.companyName}`);
    console.log(`Administrador: ${request.ownerName} (${request.email})`);
    console.log(`Senha Gerada: ${tempPassword}`);
    console.log(`Status de Pagamento: CONFIRMADO (PAID)`);
    console.log(`==================================================\n`);

    // Aqui você pode acoplar seu serviço real de envio de e-mails (como SendGrid, Resend ou SMTP)
    console.log(`[SIMULAÇÃO DISPARO E-MAIL CHECKOUT AUTOMÁTICO]`);
    console.log(`Para: ${request.email}`);
    console.log(`Mensagem: Olá ${request.ownerName}, seu pagamento foi confirmado! Acesse o CyberERP e use a senha: ${tempPassword}`);
    console.log(`==================================================\n`);

    return NextResponse.json({ 
      success: true, 
      message: "License generated successfully",
      companyName: request.companyName,
      adminEmail: request.email,
      tempPassword
    });

  } catch (error: any) {
    console.error("[WEBHOOK ERROR] Falha ao processar webhook:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
