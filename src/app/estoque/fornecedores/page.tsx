import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SuppliersClient } from "@/components/forms/SuppliersClient";

export default async function FornecedoresPage() {
  const session = await getSession();
  if (!session || !session.companyId) {
    redirect("/login");
  }

  // Verificar permissão
  let permissions: string[] = [];
  try {
    permissions = session.permissions ? JSON.parse(session.permissions) : [];
  } catch (e) {}
  
  const canManage = session.role === "SUPER_ADMIN" || session.role === "COMPANY_ADMIN" || permissions.includes("MANAGE_STOCK") || permissions.includes("ALL");

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Negado</h2>
          <p className="text-slate-400">Você não possui permissão para gerenciar fornecedores.</p>
        </div>
      </div>
    );
  }

  // Buscar todos os fornecedores cadastrados
  const suppliers = await prisma.supplier.findMany({
    where: { companyId: session.companyId },
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-6">
      <SuppliersClient initialSuppliers={suppliers as any} />
    </div>
  );
}
