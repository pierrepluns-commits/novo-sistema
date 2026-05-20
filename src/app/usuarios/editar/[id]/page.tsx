import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { UserForm } from "@/components/forms/UserForm";
import { redirect } from "next/navigation";

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getSession();
  
  if (!session || !session.companyId) {
    return <div>Não autorizado</div>;
  }

  const userToEdit = await prisma.user.findUnique({
    where: { id: resolvedParams.id }
  });

  if (!userToEdit || userToEdit.companyId !== session.companyId) {
    redirect("/usuarios");
  }

  const units = await prisma.unit.findMany({
    where: { companyId: session.companyId }
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title={`Editar Usuário: ${userToEdit.name}`} />
      <UserForm units={units} initialData={userToEdit} />
    </div>
  );
}
