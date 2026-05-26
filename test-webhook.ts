import { prisma } from "./src/lib/prisma";

async function runTest() {
  console.log("=== SIMULANDO CADASTRO DA COCA-COLA BRASIL ===");
  
  // 1. Cria uma solicitação de licença pendente simulada
  const email = `coca.brasil-${Math.floor(Math.random() * 10000)}@cocacola.com`;
  const request = await prisma.licenseRequest.create({
    data: {
      companyName: "Coca-Cola Brasil",
      ownerName: "Roberto Coca",
      email: email,
      phone: "+5511988887777",
      plan: "PRO",
      maxUnits: 5,
      status: "PENDING",
      paymentStatus: "UNPAID"
    }
  });

  console.log("Solicitação criada com sucesso no Banco de Dados:", request.id);
  console.log("Status atual da solicitação:", request.status);
  console.log("Status de pagamento atual:", request.paymentStatus);

  // 2. Dispara a requisição HTTP POST simulando o gateway de pagamento (Stripe / Asaas / Mercado Pago)
  console.log("\n=== DISPARANDO WEBHOOK DE CONFIRMAÇÃO DE PAGAMENTO ===");
  try {
    const response = await fetch("http://localhost:3000/api/webhooks/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requestId: request.id,
        event: "payment.succeeded"
      })
    });

    const result = await response.json();
    console.log("Resposta do Webhook Server:", result);

    // 3. Verifica se as tabelas foram criadas com sucesso no banco de dados
    console.log("\n=== VERIFICANDO PROVISIONAMENTO AUTOMÁTICO ===");
    
    // Procura a empresa criada
    const company = await prisma.company.findFirst({
      where: { name: "Coca-Cola Brasil" },
      include: {
        license: true,
        users: true,
        units: true
      }
    });

    if (company) {
      console.log("✅ Empresa criada com sucesso:", company.name);
      console.log("✅ Unidade Matriz gerada:", company.units[0]?.name);
      console.log("✅ Licença comercial ativa:", company.license?.plan, `(Cota: ${company.license?.maxUnits} lojas)`);
      console.log("✅ Dono cadastrado administrativamente:", company.users[0]?.name, `(${company.users[0]?.email})`);
      console.log("✅ Senha provisória gerada:", result.tempPassword);
      console.log("\n=== TESTE COMPLETADO COM SUCESSO! INTEGRAÇÃO AUTOMÁTICA VALIDADA ===");
    } else {
      console.error("❌ Erro: Empresa não encontrada no banco de dados.");
    }

  } catch (err: any) {
    console.error("❌ Falha na conexão com o servidor local (certifique-se de que o servidor do Next.js está rodando na porta 3000):", err.message);
  }
}

runTest().finally(() => prisma.$disconnect());
