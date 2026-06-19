"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createSupplier(formData: FormData) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Não autorizado" };
  }

  const name = formData.get("name") as string;
  const document = formData.get("document") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;

  if (!name) {
    return { error: "Nome do fornecedor é obrigatório." };
  }

  try {
    const supplier = await prisma.supplier.create({
      data: {
        companyId: session.companyId,
        name,
        document: document || null,
        phone: phone || null,
        email: email || null,
      },
    });

    revalidatePath("/estoque/fornecedores");
    return { success: true, supplier };
  } catch (error: any) {
    console.error("ERRO AO CRIAR FORNECEDOR:", error);
    return { error: `Erro ao cadastrar fornecedor: ${error.message || error}` };
  }
}

export async function updateSupplier(formData: FormData) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Não autorizado" };
  }

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const document = formData.get("document") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;

  if (!id || !name) {
    return { error: "ID e Nome do fornecedor são obrigatórios." };
  }

  try {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing || existing.companyId !== session.companyId) {
      return { error: "Fornecedor não encontrado ou não autorizado." };
    }

    await prisma.supplier.update({
      where: { id },
      data: {
        name,
        document: document || null,
        phone: phone || null,
        email: email || null,
      },
    });

    revalidatePath("/estoque/fornecedores");
    return { success: true };
  } catch (error: any) {
    console.error("ERRO AO ATUALIZAR FORNECEDOR:", error);
    return { error: `Erro ao atualizar fornecedor: ${error.message || error}` };
  }
}

export async function deleteSupplier(id: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Não autorizado" };
  }

  try {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing || existing.companyId !== session.companyId) {
      return { error: "Fornecedor não encontrado ou não autorizado." };
    }

    await prisma.supplier.delete({ where: { id } });

    revalidatePath("/estoque/fornecedores");
    return { success: true };
  } catch (error: any) {
    console.error("ERRO AO EXCLUIR FORNECEDOR:", error);
    return { error: `Este fornecedor não pode ser excluído pois possui produtos associados.` };
  }
}
