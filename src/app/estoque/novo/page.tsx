import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/forms/ProductForm";

export default async function NovoProdutoPage() {
  const session = await getSession();
  if (!session || !session.companyId) return <div>Acesso Negado</div>;

  const units = !session.unitId ? await prisma.unit.findMany({
    where: { companyId: session.companyId }
  }) : [];

  const allProducts = await prisma.product.findMany({
    where: { 
      companyId: session.companyId, 
      isKit: false,
      NOT: {
        sku: {
          startsWith: "OS-CUSTOM-"
        }
      }
    },
    select: { id: true, name: true, sku: true, price: true }
  });

  const suppliers = await prisma.supplier.findMany({
    where: { companyId: session.companyId },
    orderBy: { name: "asc" }
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title="Adicionar Novo Produto no Estoque" />
      <ProductForm 
        units={units} 
        sessionUnitId={session.unitId} 
        allProducts={allProducts} 
        suppliers={suppliers as any[]} 
      />
    </div>
  );
}
