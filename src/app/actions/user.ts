"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export async function createUser(formData: FormData) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida. Faça login novamente." };
  }

  const name = formData.get("name") as string;
  const email = (formData.get("email") as string || "").trim().toLowerCase();
  const role = formData.get("role") as string;
  const password = formData.get("password") as string;
  const unitId = formData.get("unitId") as string;
  
  const permissions = formData.getAll("permissions") as string[];

  if (!name || !email || !password || !role) {
    return { error: "Por favor, preencha todos os campos obrigatórios." };
  }

  const password_hash = password;

  // Check if email is already in use by any user in the system
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });
    if (existingUser) {
      return { error: "Este e-mail já está cadastrado no sistema." };
    }
  } catch (err: any) {
    return { error: "Erro de validação: " + err.message };
  }

  // createUser logic (bottom part)
  try {
    await prisma.user.create({
      data: {
        companyId: session.companyId,
        unitId: unitId || null,
        name,
        email,
        role,
        password_hash,
        permissions: JSON.stringify(permissions)
      },
    });
  } catch (error: any) {
    console.error("ERRO AO CRIAR USUÁRIO:", error);
    if (error.code === 'P2002') {
      return { error: "Este e-mail já está em uso por outro usuário." };
    }
    return { error: `Erro interno ao criar o usuário: ${error.message || error}` };
  }

  revalidatePath("/usuarios");
  return { success: true };
}

export async function updateUser(formData: FormData) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida. Faça login novamente." };
  }

  const id = formData.get("id") as string;
  if (!id) return { error: "ID do usuário ausente." };

  const name = formData.get("name") as string;
  const email = (formData.get("email") as string || "").trim().toLowerCase();
  const role = formData.get("role") as string;
  const unitId = formData.get("unitId") as string;
  const password = formData.get("password") as string;
  
  const permissions = formData.getAll("permissions") as string[];

  if (!name || !email || !role) {
    return { error: "Por favor, preencha todos os campos obrigatórios." };
  }

  const dataToUpdate: any = {
    name,
    email,
    role,
    unitId: unitId || null,
    permissions: JSON.stringify(permissions)
  };

  if (password && password.trim() !== "") {
    dataToUpdate.password_hash = password;
  }

  // Check if email is already in use by another user in the system
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });
    if (existingUser && existingUser.id !== id) {
      return { error: "Este e-mail já está cadastrado no sistema por outro usuário." };
    }
  } catch (err: any) {
    return { error: "Erro de validação: " + err.message };
  }

  try {
    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate || userToUpdate.companyId !== session.companyId) {
       return { error: "Usuário não encontrado ou não autorizado." };
    }

    await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });
  } catch (error: any) {
    console.error("ERRO AO ATUALIZAR:", error);
    if (error.code === 'P2002') {
      return { error: "Este e-mail já está em uso por outro usuário." };
    }
    return { error: `Erro no banco de dados: ${error.message || error}` };
  }

  revalidatePath("/usuarios");
  return { success: true };
}

export async function deleteUser(id: string) {
  const session = await getSession();
  if (!session || !session.companyId) throw new Error("Não autorizado");

  const user = await prisma.user.findUnique({ where: { id } });
  if (user?.companyId === session.companyId) {
    await prisma.user.delete({
      where: { id },
    });
  }
  revalidatePath("/usuarios");
}
