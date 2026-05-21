"use server";

import { prisma } from "@/lib/prisma";
import { setSession, clearSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginUser(formData: FormData) {
  const rawEmail = formData.get("email") as string;
  const rawPassword = formData.get("password") as string;

  if (!rawEmail || !rawPassword) {
    return { error: "Preencha todos os campos" };
  }

  const email = rawEmail.trim().toLowerCase();
  const password = rawPassword.trim();

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || user.password_hash !== password) {
    return { error: "Credenciais inválidas" };
  }

  await setSession({
    userId: user.id,
    role: user.role,
    companyId: user.companyId,
    unitId: user.unitId,
    name: user.name,
    permissions: user.permissions,
  });

  // Role based redirection
  if (user.role === "SUPER_ADMIN") redirect("/mestre/empresas");
  if (user.role === "CASHIER") redirect("/pdv");
  redirect("/dashboard");
}

export async function logoutUser() {
  await clearSession();
  redirect("/login");
}

export async function recoverPassword(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) {
    return { error: "Por favor, preencha o campo de e-mail." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!user) {
    return { error: "E-mail não encontrado no sistema." };
  }

  // Generate a random temporary password (8 characters)
  const chars = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789";
  let tempPassword = "";
  for (let i = 0; i < 8; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Update in database
  await prisma.user.update({
    where: { id: user.id },
    data: { password_hash: tempPassword }
  });

  // Log in server console for visibility
  console.log(`\n==================================================`);
  console.log(`[SIMULAÇÃO DE ENVIO DE E-MAIL]`);
  console.log(`Para: ${user.email}`);
  console.log(`Assunto: Sua nova senha de acesso`);
  console.log(`Mensagem: Olá ${user.name}, sua senha temporária é: ${tempPassword}`);
  console.log(`==================================================\n`);

  return {
    success: true,
    email: user.email,
    name: user.name,
    tempPassword: tempPassword,
  };
}

