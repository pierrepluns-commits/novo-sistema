import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import PrintLayoutClient from "./PrintLayoutClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ImprimirOSPage({ params }: PageProps) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return redirect("/login");
  }

  const { id } = await params;

  // Fetch the service order with client, company, unit, user, and items
  const os = await prisma.serviceOrder.findUnique({
    where: {
      id,
      companyId: session.companyId,
    },
    include: {
      client: true,
      company: true,
      unit: true,
      user: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!os) {
    return (
      <div className="p-8 text-center text-slate-400 font-bold">
        Ordem de Serviço não encontrada.
      </div>
    );
  }

  return (
    <PrintLayoutClient os={os as any} />
  );
}
