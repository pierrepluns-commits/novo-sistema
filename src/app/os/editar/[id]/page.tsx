import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSelectedUnitId } from "@/app/actions/unit";
import OSEditorClient from "./OSEditorClient";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function EditOSPage({ params, searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return redirect("/login");
  }

  const selectedUnitId = await getSelectedUnitId();
  if (!selectedUnitId) {
    return redirect("/os");
  }

  const { id } = await params;

  // 1. Fetch O.S.
  const os = await prisma.serviceOrder.findUnique({
    where: {
      id,
      companyId: session.companyId,
    },
    include: {
      client: true,
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
        Ordem de Serviço não encontrada ou sem permissão de acesso.
      </div>
    );
  }

  // 2. Fetch all clients of this tenant for the customer retro edit dropdown
  const clients = await prisma.client.findMany({
    where: { companyId: session.companyId },
    orderBy: { name: "asc" },
  });

  // 3. Fetch products with stock > 0 for this unit to allow instant autocomplete budgeting
  const stockItems = await prisma.stock.findMany({
    where: {
      unitId: selectedUnitId,
    },
    include: {
      product: true,
    },
  });

  const availableParts = stockItems.map((item) => ({
    productId: item.productId,
    name: item.product.name,
    sku: item.product.sku,
    price: item.product.price,
    cost: item.product.cost,
    quantity: item.quantity,
  }));

  // 4. Fetch all users for technician assignment
  const users = await prisma.user.findMany({
    where: { companyId: session.companyId },
    orderBy: { name: "asc" },
  });

  const { tab = "general" } = await searchParams;

  return (
    <OSEditorClient 
      os={os as any} 
      clients={clients as any} 
      availableParts={availableParts} 
      users={users as any}
      defaultTab={tab}
    />
  );
}
