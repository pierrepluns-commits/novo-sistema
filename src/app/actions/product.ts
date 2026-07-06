"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export async function createProduct(formData: FormData) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Você não tem autorização." };
  }

  // Verificação de permissões
  let permissions: string[] = [];
  try {
    permissions = session.permissions ? JSON.parse(session.permissions) : [];
  } catch (e) {}

  const canManage = session.role === "SUPER_ADMIN" || 
                    session.role === "COMPANY_ADMIN" || 
                    permissions.includes("MANAGE_STOCK") || 
                    permissions.includes("ALL");

  if (!canManage) {
    return { error: "Você não tem autorização para cadastrar produtos no estoque." };
  }

  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const barcode = formData.get("barcode") as string;
  const description = formData.get("description") as string;
  const quantity = parseInt(formData.get("quantity") as string) || 0;
  const price = parseFloat(formData.get("price") as string) || 0;
  const cost = parseFloat(formData.get("cost") as string) || 0;
  const isKit = formData.get("isKit") === "true";
  const supplierId = formData.get("supplierId") as string;
  
  const targetUnitId = session.unitId || (formData.get("unitId") as string);

  if (!targetUnitId && quantity > 0) {
    return { error: "Para adicionar quantidade inicial, é necessário selecionar uma unidade." };
  }

  try {
    // Verificar se o SKU já existe na empresa
    const existingProduct = await prisma.product.findFirst({
      where: {
        companyId: session.companyId,
        sku: sku.trim()
      }
    });

    if (existingProduct) {
      return { error: "Este SKU já está sendo utilizado por outro produto." };
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
        supplierId: supplierId || null,
        kitItems: isKit && formData.get("kitItems") ? {
          create: JSON.parse(formData.get("kitItems") as string).map((item: any) => ({
            componentId: item.componentId,
            quantity: item.quantity
          }))
        } : undefined,
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
  } catch (error: any) {
    console.error("ERRO AO CRIAR PRODUTO:", error);
    if (error.code === 'P2002') {
      return { error: "Este SKU ou código já está sendo utilizado." };
    }
    return { error: "Erro ao cadastrar produto no estoque." };
  }
}

export async function updateProduct(formData: FormData) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Você não tem autorização." };
  }

  // Verificação de permissões
  let permissions: string[] = [];
  try {
    permissions = session.permissions ? JSON.parse(session.permissions) : [];
  } catch (e) {}

  const canManage = session.role === "SUPER_ADMIN" || 
                    session.role === "COMPANY_ADMIN" || 
                    permissions.includes("MANAGE_STOCK") || 
                    permissions.includes("ALL");

  if (!canManage) {
    return { error: "Você não tem autorização para editar produtos." };
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
  const supplierId = formData.get("supplierId") as string;

  if (!name || !sku) {
    return { error: "Nome e SKU são obrigatórios." };
  }

  try {
    const productToUpdate = await prisma.product.findUnique({ where: { id } });
    if (!productToUpdate || productToUpdate.companyId !== session.companyId) {
      return { error: "Produto não encontrado ou não autorizado." };
    }

    // Verificar se o SKU já existe em outro produto
    const existingProduct = await prisma.product.findFirst({
      where: {
        companyId: session.companyId,
        sku: sku.trim(),
        NOT: { id }
      }
    });

    if (existingProduct) {
      return { error: "Este SKU já está sendo utilizado por outro produto." };
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
        isKit,
        supplierId: supplierId || null
      },
    });

    if (isKit) {
      const kitItemsStr = formData.get("kitItems");
      if (kitItemsStr) {
        const kitItemsData = JSON.parse(kitItemsStr as string);
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
      await prisma.productBundle.deleteMany({
        where: { kitId: id }
      });
    }

    revalidatePath("/estoque");
    return { success: true };
  } catch (error: any) {
    console.error("ERRO AO ATUALIZAR PRODUTO:", error);
    if (error.code === 'P2002') {
      return { error: "Este SKU já está sendo utilizado por outro produto." };
    }
    return { error: "Erro ao editar produto." };
  }
}

export async function deleteProduct(id: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("Você não tem autorização.");
  }

  // Verificação de permissões
  let permissions: string[] = [];
  try {
    permissions = session.permissions ? JSON.parse(session.permissions) : [];
  } catch (e) {}

  const canManage = session.role === "SUPER_ADMIN" || 
                    session.role === "COMPANY_ADMIN" || 
                    permissions.includes("MANAGE_STOCK") || 
                    permissions.includes("ALL");

  if (!canManage) {
    throw new Error("Você não tem autorização para excluir produtos.");
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (product?.companyId === session.companyId) {
    await prisma.product.delete({
      where: { id },
    });
  }
  revalidatePath("/estoque");
}
