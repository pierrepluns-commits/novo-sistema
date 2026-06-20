"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

import { getSelectedUnitId } from "./unit";

export async function createTransaction(formData: FormData) {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("Não autorizado");
  }

  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const type = formData.get("type") as string;
  const transactionDate = new Date(formData.get("transactionDate") as string);
  const category = formData.get("category") as string;
  
  const selectedUnitId = await getSelectedUnitId();
  const unitId = selectedUnitId || session.unitId;
  
  if (!unitId) {
    throw new Error("Selecione uma unidade ativa para realizar lançamentos.");
  }
  
  await prisma.financialTransaction.create({
    data: {
      companyId: session.companyId,
      unitId,
      userId: session.userId,
      description,
      amount,
      type,
      transactionDate,
      category,
    },
  });

  revalidatePath("/financeiro");
  redirect("/financeiro?tab=extrato");
}

export async function deleteTransaction(id: string) {
  const session = await getSession();
  if (!session || !session.companyId) throw new Error("Não autorizado");

  // Verificar permissão de exclusão do financeiro
  const permissions = session.permissions ? JSON.parse(session.permissions) : [];
  const canDelete = session.role === "SUPER_ADMIN" || session.role === "COMPANY_ADMIN" || permissions.includes("ALL") || permissions.includes("DELETE_FINANCE");
  
  if (!canDelete) {
    throw new Error("Você não tem permissão para excluir lançamentos financeiros.");
  }

  const tx = await prisma.financialTransaction.findUnique({ where: { id } });
  if (tx?.companyId === session.companyId) {
    await prisma.financialTransaction.delete({
      where: { id },
    });
  }
  revalidatePath("/financeiro");
}
