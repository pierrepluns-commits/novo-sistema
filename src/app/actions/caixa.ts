"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getSelectedUnitId } from "@/app/actions/unit";

export async function getCurrentCashRegister() {
  const session = await getSession();
  if (!session) return null;

  const unitId = await getSelectedUnitId();
  if (!unitId) return null;

  const register = await prisma.cashRegister.findFirst({
    where: {
      unitId: unitId,
      status: "OPEN",
    },
    include: {
      user: true,
      transactions: {
        include: {
          user: true
        },
        orderBy: { createdAt: "desc" }
      },
    },
    orderBy: { openedAt: "desc" }
  });

  return register;
}

export async function openCashRegister(initialBalance: number) {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("Não autorizado");
  }

  const unitId = await getSelectedUnitId();
  if (!unitId) {
    throw new Error("Nenhuma unidade selecionada");
  }

  // Verificar se já existe um caixa aberto
  const existing = await getCurrentCashRegister();
  if (existing) {
    throw new Error("Já existe um caixa aberto para esta unidade.");
  }

  const register = await prisma.cashRegister.create({
    data: {
      unitId: unitId,
      userId: session.userId,
      openingBalance: initialBalance,
      status: "OPEN"
    }
  });

  revalidatePath("/pdv");
  revalidatePath("/caixa");
  return register;
}

export async function closeCashRegister(
  registerId: string, 
  closingData: {
    closingBalance: number;
    closingCash: number;
    closingPix: number;
    closingDebit: number;
    closingCredit: number;
  }
) {
  const session = await getSession();
  if (!session) {
    throw new Error("Não autorizado");
  }

  const register = await prisma.cashRegister.findUnique({
    where: { id: registerId }
  });

  if (!register || register.status === "CLOSED") {
    throw new Error("Caixa não encontrado ou já fechado");
  }

  const updated = await prisma.cashRegister.update({
    where: { id: registerId },
    data: {
      status: "CLOSED",
      closingBalance: closingData.closingBalance,
      closingCash: closingData.closingCash,
      closingPix: closingData.closingPix,
      closingDebit: closingData.closingDebit,
      closingCredit: closingData.closingCredit,
      closedAt: new Date()
    }
  });

  revalidatePath("/pdv");
  revalidatePath("/caixa");
  return updated;
}

export async function addManualCashTransaction(type: 'INCOME' | 'EXPENSE', amount: number, description: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("Não autorizado");
  }

  const unitId = await getSelectedUnitId();
  if (!unitId) {
    throw new Error("Nenhuma unidade selecionada");
  }

  const register = await getCurrentCashRegister();
  if (!register) {
    throw new Error("Não há caixa aberto");
  }

  const tx = await prisma.financialTransaction.create({
    data: {
      type,
      companyId: session.companyId,
      unitId: unitId,
      amount,
      description: `[MANUAL] ${description}`,
      category: type === 'INCOME' ? 'Entrada Manual' : 'Saída Manual',
      transactionDate: new Date(),
      userId: session.userId,
      cashRegisterId: register.id
    }
  });

  revalidatePath("/caixa");
  revalidatePath("/financeiro");
  
  return tx;
}

export async function updateOpeningBalance(registerId: string, newBalance: number) {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("Não autorizado");
  }

  // Permitir apenas administradores (SUPER_ADMIN ou COMPANY_ADMIN)
  if (session.role !== "SUPER_ADMIN" && session.role !== "COMPANY_ADMIN") {
    throw new Error("Permissão negada. Apenas administradores podem alterar o saldo de abertura.");
  }

  const register = await prisma.cashRegister.findUnique({
    where: { id: registerId },
    include: { unit: true }
  });

  if (!register || register.unit.companyId !== session.companyId) {
    throw new Error("Caixa não encontrado ou não autorizado.");
  }

  // Atualizar saldo de abertura
  const updated = await prisma.cashRegister.update({
    where: { id: registerId },
    data: { openingBalance: newBalance }
  });

  revalidatePath("/pdv");
  revalidatePath("/caixa");
  return updated;
}
