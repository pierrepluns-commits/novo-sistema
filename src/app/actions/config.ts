"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// 1. Save company receipt template config
export async function saveReceiptConfig(header: string, footer: string, configJson: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Não autorizado." };
  }

  try {
    await prisma.company.update({
      where: { id: session.companyId },
      data: {
        receiptHeader: header,
        receiptFooter: footer,
        receiptConfig: configJson
      }
    });

    revalidatePath("/configuracao");
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao salvar preferências de impressão: " + error.message };
  }
}

// 2. Create store unit with active license quota check
export async function createStoreUnit(
  name: string, 
  document: string | null, 
  address: string | null, 
  contact: string | null
) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Não autorizado." };
  }

  // Only company admin or super admin can manage store units
  if (session.role !== "COMPANY_ADMIN" && session.role !== "SUPER_ADMIN") {
    return { error: "Apenas administradores podem gerenciar filiais." };
  }

  if (!name.trim()) {
    return { error: "O nome da unidade é obrigatório." };
  }

  try {
    // Transaction to safely count and check quotas before creating
    const result = await prisma.$transaction(async (tx) => {
      // Find company license limit
      const license = await tx.license.findUnique({
        where: { companyId: session.companyId! }
      });

      if (!license) {
        throw new Error("Licença não encontrada para esta empresa.");
      }

      // Count active store units
      const activeUnitsCount = await tx.unit.count({
        where: { companyId: session.companyId! }
      });

      // Enforce quota
      if (activeUnitsCount >= license.maxUnits) {
        throw new Error("LIMITE_ATINGIDO");
      }

      // Create Unit
      const unit = await tx.unit.create({
        data: {
          companyId: session.companyId!,
          name,
          document: document || null,
          address: address || null,
          contact: contact || null,
          isHeadquarters: false // Default to false for additional stores
        }
      });

      return unit;
    });

    revalidatePath("/configuracao");
    return { success: true, unit: result };
  } catch (error: any) {
    console.error(error);
    if (error.message === "LIMITE_ATINGIDO") {
      return { 
        error: "Você atingiu o limite de unidades/lojas ativas do seu plano atual. Faça um upgrade de licença!" 
      };
    }
    return { error: "Erro ao criar unidade comercial: " + error.message };
  }
}

// 3. Edit/update store unit details
export async function updateStoreUnit(
  unitId: string,
  name: string,
  document: string | null,
  address: string | null,
  contact: string | null
) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Não autorizado." };
  }

  if (session.role !== "COMPANY_ADMIN" && session.role !== "SUPER_ADMIN") {
    return { error: "Apenas administradores podem gerenciar filiais." };
  }

  if (!name.trim()) {
    return { error: "O nome da unidade é obrigatório." };
  }

  try {
    await prisma.unit.update({
      where: { id: unitId, companyId: session.companyId },
      data: {
        name,
        document: document || null,
        address: address || null,
        contact: contact || null
      }
    });

    revalidatePath("/configuracao");
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao atualizar unidade: " + error.message };
  }
}
