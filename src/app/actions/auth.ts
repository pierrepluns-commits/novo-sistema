"use server";

import { prisma } from "@/lib/prisma";
import { setSession, clearSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Preencha todos os campos" };
  }

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
