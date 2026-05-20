"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// 1. Fetch system branding config (Singleton)
export async function getSystemConfig() {
  try {
    let config = await prisma.systemConfig.findUnique({
      where: { id: "default" }
    });

    if (!config) {
      // Create defaults if not exists
      config = await prisma.systemConfig.create({
        data: {
          id: "default",
          appName: "CyberERP",
          primaryColor: "#00f3ff",
          secondaryColor: "#0055ff",
          plansConfig: JSON.stringify([
            { id: "BASIC", name: "Básico", price: 49.90, maxUnits: 1, desc: "Para pequenos comércios ou MEI. Permite 1 unidade/loja." },
            { id: "PRO", name: "Pro", price: 99.90, maxUnits: 5, desc: "Para empresas em crescimento. Permite até 5 unidades/lojas." },
            { id: "ENTERPRISE", name: "Enterprise", price: 199.90, maxUnits: 99, desc: "Gestão ilimitada para redes e franquias. Unidades ilimitadas." }
          ])
        }
      });
    }

    return config;
  } catch (error) {
    console.error("Erro ao obter SystemConfig:", error);
    return null;
  }
}

// 2. Update system config
export async function updateSystemConfig(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return { error: "Acesso restrito ao Mestre." };
  }

  const appName = formData.get("appName") as string;
  const primaryColor = formData.get("primaryColor") as string;
  const secondaryColor = formData.get("secondaryColor") as string;
  const plansJson = formData.get("plansConfig") as string;

  if (!appName) {
    return { error: "Nome do sistema é obrigatório." };
  }

  try {
    await prisma.systemConfig.upsert({
      where: { id: "default" },
      update: { appName, primaryColor, secondaryColor, plansConfig: plansJson },
      create: { id: "default", appName, primaryColor, secondaryColor, plansConfig: plansJson }
    });

    revalidatePath("/");
    revalidatePath("/mestre/empresas");
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao salvar configurações: " + error.message };
  }
}

// 3. Create a license request (from public landing page)
export async function createLicenseRequestAction(formData: FormData) {
  const companyName = formData.get("companyName") as string;
  const ownerName = formData.get("ownerName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const plan = formData.get("plan") as string;

  if (!companyName || !ownerName || !email || !plan) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  try {
    // Determine maxUnits based on plans in SystemConfig
    const config = await getSystemConfig();
    let maxUnits = 1;
    if (config) {
      const plans = JSON.parse(config.plansConfig);
      const chosenPlan = plans.find((p: any) => p.id === plan);
      if (chosenPlan) maxUnits = chosenPlan.maxUnits;
    }

    const request = await prisma.licenseRequest.create({
      data: {
        companyName,
        ownerName,
        email,
        phone: phone || null,
        plan,
        maxUnits,
        status: "PENDING",
        paymentStatus: "UNPAID"
      }
    });

    return { success: true, requestId: request.id };
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return { error: "Já existe uma solicitação ou empresa cadastrada com este e-mail." };
    }
    return { error: "Erro ao processar solicitação: " + error.message };
  }
}

// 4. Toggle payment status
export async function toggleRequestPaymentStatus(requestId: string, newStatus: string) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return { error: "Acesso restrito." };
  }

  try {
    await prisma.licenseRequest.update({
      where: { id: requestId },
      data: { paymentStatus: newStatus }
    });

    revalidatePath("/mestre/empresas");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// 5. Approve license request (Generates Company, Default Unit, COMPANY_ADMIN user and License)
export async function approveLicenseRequest(requestId: string, customMaxUnits?: number, expiresAtStr?: string) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return { error: "Acesso restrito." };
  }

  try {
    const request = await prisma.licenseRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return { error: "Solicitação não encontrada." };
    }

    if (request.status === "APPROVED") {
      return { error: "Esta solicitação já foi aprovada." };
    }

    const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;
    const finalMaxUnits = customMaxUnits !== undefined ? customMaxUnits : request.maxUnits;
    
    // Generate temporary password
    const tempPassword = "lumus-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    await prisma.$transaction(async (tx) => {
      // 1. Create Company
      const company = await tx.company.create({
        data: {
          name: request.companyName,
          isActive: true
        }
      });

      // 2. Create Default Unit (Headquarters)
      await tx.unit.create({
        data: {
          companyId: company.id,
          name: "Unidade Principal (Sede)",
          isHeadquarters: true
        }
      });

      // 3. Create License
      await tx.license.create({
        data: {
          companyId: company.id,
          plan: request.plan,
          status: "ACTIVE",
          maxUnits: finalMaxUnits,
          expiresAt
        }
      });

      // 4. Create Company Admin User
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

      // 5. Mark request as APPROVED
      await tx.licenseRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" }
      });
    });

    revalidatePath("/mestre/empresas");
    return { success: true, credentials: { email: request.email, password: tempPassword } };
  } catch (error: any) {
    console.error(error);
    return { error: "Erro ao aprovar solicitação: " + error.message };
  }
}

// 6. Manual creation (Updated to support maxUnits and default Unit creation)
export async function createCompanyWithLicense(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return { error: "Acesso restrito ao Mestre." };
  }

  const name = formData.get("name") as string;
  const document = formData.get("document") as string;
  const plan = formData.get("plan") as string;
  const maxUnitsStr = formData.get("maxUnits") as string;
  const expiresAtStr = formData.get("expiresAt") as string;
  
  const adminEmail = formData.get("adminEmail") as string;
  const adminPassword = formData.get("adminPassword") as string;
  const adminName = formData.get("adminName") as string;

  if (!name || !plan || !adminEmail || !adminPassword) {
    return { error: "Preencha os campos obrigatórios." };
  }

  try {
    const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;
    const maxUnits = parseInt(maxUnitsStr, 10) || 1;

    await prisma.$transaction(async (tx) => {
      // 1. Create Company
      const company = await tx.company.create({
        data: {
          name,
          document: document || null,
          isActive: true
        }
      });

      // 2. Create Default Unit (Headquarters)
      await tx.unit.create({
        data: {
          companyId: company.id,
          name: "Unidade Principal (Sede)",
          document: document || null,
          isHeadquarters: true
        }
      });

      // 3. Create License
      await tx.license.create({
        data: {
          companyId: company.id,
          plan,
          status: "ACTIVE",
          maxUnits,
          expiresAt
        }
      });

      // 4. Create Company Admin User
      await tx.user.create({
        data: {
          companyId: company.id,
          name: adminName,
          email: adminEmail,
          password_hash: adminPassword,
          role: "COMPANY_ADMIN",
          permissions: JSON.stringify(["ALL"])
        }
      });
    });

    revalidatePath("/mestre/empresas");
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { error: "Erro ao criar empresa: " + error.message };
  }
}
