import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import CaixaPrintClient from "./CaixaPrintClient";

export default async function ImprimirCaixaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const register = await prisma.cashRegister.findUnique({
    where: { id },
    include: {
      user: true,
      unit: true,
      transactions: {
        include: { user: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!register) {
    return <div className="p-8 text-center text-red-500 font-bold">Caixa não encontrado.</div>;
  }

  // Fetch sales during the shift
  const sales = await prisma.sale.findMany({
    where: {
      unitId: register.unitId,
      createdAt: {
        gte: register.openedAt,
        lte: register.closedAt || new Date()
      }
    },
    include: {
      user: true,
      items: {
        include: { product: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  // Fetch service orders delivered during the shift
  const serviceOrders = await prisma.serviceOrder.findMany({
    where: {
      unitId: register.unitId,
      status: "DELIVERED",
      updatedAt: {
        gte: register.openedAt,
        lte: register.closedAt || new Date()
      }
    },
    include: {
      client: true,
      user: true
    },
    orderBy: { updatedAt: "asc" }
  });

  return (
    <CaixaPrintClient register={register as any} sales={sales as any} serviceOrders={serviceOrders as any} />
  );
}
