"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export async function createProduct(formData: FormData) {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("Não autorizado");
  }

  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const barcode = formData.get("barcode") as string;
  const description = formData.get("description") as string;
  const quantity = parseInt(formData.get("quantity") as string) || 0;
  const price = parseFloat(formData.get("price") as string) || 0;
  const cost = parseFloat(formData.get("cost") as string) || 0;
  const isKit = formData.get("isKit") === "true";
  
  // Se o usuário tem uma unitId na sessão, usa ela. Senão, tenta pegar do form (caso seja Admin)
  const targetUnitId = session.unitId || (formData.get("unitId") as string);

  if (!targetUnitId && quantity > 0) {
    throw new Error("Para adicionar quantidade inicial, é necessário selecionar uma unidade.");
  }

  await prisma.product.create({
    data: {
      companyId: session.companyId,
      name,
      sku,
      barcode: barcode || null,
      description,
      price,
      cost,
      isKit,
      // Se for kit, vincula os ingredientes/componentes
      kitItems: isKit && formData.get("kitItems") ? {
        create: JSON.parse(formData.get("kitItems") as string).map((item: any) => ({
          componentId: item.componentId,
          quantity: item.quantity
        }))
      } : undefined,
      // Se houver uma unidade alvo, já cria o estoque inicial pra ela
      stocks: (!isKit && targetUnitId) ? {
        create: [
          {
            unitId: targetUnitId,
            quantity
          }
        ]
      } : undefined
    },
  });

  revalidatePath("/estoque");
  return { success: true };
}

export async function updateProduct(formData: FormData) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Não autorizado" };
  }

  const id = formData.get("id") as string;
  if (!id) return { error: "ID do produto ausente." };

  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const barcode = formData.get("barcode") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string) || 0;
  const cost = parseFloat(formData.get("cost") as string) || 0;
  const isKit = formData.get("isKit") === "true";

  if (!name || !sku) {
    return { error: "Nome e SKU são obrigatórios." };
  }

  try {
    const productToUpdate = await prisma.product.findUnique({ where: { id } });
    if (!productToUpdate || productToUpdate.companyId !== session.companyId) {
      return { error: "Produto não encontrado ou não autorizado." };
    }

    await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        barcode: barcode || null,
        description,
        price,
        cost,
        isKit
      },
    });

    if (isKit) {
      const kitItemsStr = formData.get("kitItems");
      if (kitItemsStr) {
        const kitItemsData = JSON.parse(kitItemsStr as string);
        // Deleta todos e recria (simples)
        await prisma.productBundle.deleteMany({
          where: { kitId: id }
        });
        if (kitItemsData.length > 0) {
          await prisma.productBundle.createMany({
            data: kitItemsData.map((item: any) => ({
              kitId: id,
              componentId: item.componentId,
              quantity: item.quantity
            }))
          });
        }
      }
    } else {
      // Se deixou de ser Kit, apaga as relações
      await prisma.productBundle.deleteMany({
        where: { kitId: id }
      });
    }

  } catch (error: any) {
    console.error("ERRO AO ATUALIZAR PRODUTO:", error);
    if (error.code === 'P2002') {
      return { error: "Este SKU já está sendo utilizado por outro produto." };
    }
    return { error: `Erro interno: ${error.message || error}` };
  }

  revalidatePath("/estoque");
  return { success: true };
}

export async function deleteProduct(id: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("Não autorizado");
  }

  // Ensure it belongs to the company
  const product = await prisma.product.findUnique({ where: { id } });
  if (product?.companyId === session.companyId) {
    await prisma.product.delete({
      where: { id },
    });
  }
  revalidatePath("/estoque");
}
