import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ConfigPageClient } from "./ConfigPageClient";

export default async function ConfiguracaoPage() {
  const session = await getSession();
  if (!session || !session.companyId) {
    redirect("/login");
  }

  // Only COMPANY_ADMIN and SUPER_ADMIN are allowed to change company settings
  if (session.role !== "COMPANY_ADMIN" && session.role !== "SUPER_ADMIN") {
    return (
      <div className="max-w-md mx-auto mt-12 bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl p-6 text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">Acesso Negado</h2>
        <p className="text-slate-400 text-sm">
          Apenas administradores da empresa têm permissão para acessar as configurações de impressão e gerenciar filiais.
        </p>
      </div>
    );
  }

  // 1. Fetch Company details
  const company = await prisma.company.findUnique({
    where: { id: session.companyId }
  });

  if (!company) {
    return <div>Empresa não encontrada.</div>;
  }

  // 2. Fetch all Units for this Company
  const units = await prisma.unit.findMany({
    where: { companyId: session.companyId },
    orderBy: { name: "asc" }
  });

  // 3. Fetch Company License limit
  const license = await prisma.license.findUnique({
    where: { companyId: session.companyId }
  });

  return (
    <ConfigPageClient 
      company={company}
      units={units}
      license={license}
    />
  );
}
