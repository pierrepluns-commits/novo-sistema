import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { UserForm } from "@/components/forms/UserForm";

export default async function NovoUsuarioPage() {
  const session = await getSession();
  if (!session || !session.companyId) {
    return <div>Não autorizado</div>;
  }

  const units = await prisma.unit.findMany({
    where: { companyId: session.companyId }
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title="Adicionar Novo Usuário" />
      <UserForm units={units} />
    </div>
  );
}
