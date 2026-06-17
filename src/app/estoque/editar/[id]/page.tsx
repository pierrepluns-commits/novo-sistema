import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/forms/ProductForm";
import { redirect } from "next/navigation";

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getSession();
  
  if (!session || !session.companyId) return <div>Acesso Negado</div>;

  const productToEdit = await prisma.product.findUnique({
    where: { id: resolvedParams.id },
    include: {
      kitItems: true
    }
  });

  if (!productToEdit || productToEdit.companyId !== session.companyId) {
    redirect("/estoque");
  }

  // Units only matter for initial creation, but we pass it anyway
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title={`Editar Produto: ${productToEdit.name}`} />
      <ProductForm units={units} sessionUnitId={session.unitId} initialData={productToEdit} allProducts={allProducts} />
    </div>
  );
}
