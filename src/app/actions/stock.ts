"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type TransferItem = {
  productId: string;
  quantity: number;
};

export async function transferStock(
  sourceUnitId: string,
  targetUnitId: string,
  items: TransferItem[]
) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Não autorizado" };
  }

  if (!sourceUnitId || !targetUnitId) {
    return { error: "Selecione as unidades de origem e destino." };
  }

  if (sourceUnitId === targetUnitId) {
    return { error: "As unidades de origem e destino devem ser diferentes." };
  }

  const validItems = items.filter(item => item.productId && item.quantity > 0);
  if (validItems.length === 0) {
    return { error: "Selecione pelo menos um produto com quantidade válida para transferência." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of validItems) {
        // 1. Verificar estoque na origem
        const sourceStock = await tx.stock.findUnique({
          where: {
            productId_unitId: {
              productId: item.productId,
              unitId: sourceUnitId,
            },
          },
        });

        if (!sourceStock || sourceStock.quantity < item.quantity) {
          throw new Error(`Estoque insuficiente para transferir a quantidade informada do item.`);
        }

        // 2. Decrementar na origem
        await tx.stock.update({
          where: { id: sourceStock.id },
          data: { quantity: { decrement: item.quantity } },
        });

        // 3. Registrar movimentação de saída (OUT) na origem
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            unitId: sourceUnitId,
            userId: session.userId,
            type: "OUT",
            quantity: item.quantity,
            reason: "TRANSFER",
            referenceId: `FROM_${sourceUnitId}_TO_${targetUnitId}`,
          },
        });

        // 4. Incrementar no destino (upsert)
        await tx.stock.upsert({
          where: {
            productId_unitId: {
              productId: item.productId,
              unitId: targetUnitId,
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            productId: item.productId,
            unitId: targetUnitId,
            quantity: item.quantity,
          },
        });

        // 5. Registrar movimentação de entrada (IN) no destino
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            unitId: targetUnitId,
            userId: session.userId,
            type: "IN",
            quantity: item.quantity,
            reason: "TRANSFER",
            referenceId: `FROM_${sourceUnitId}_TO_${targetUnitId}`,
          },
        });
      }
    });

    revalidatePath("/estoque");
    return { success: true };
  } catch (error: any) {
    console.error("ERRO TRANSFERENCIA ESTOQUE:", error);
    return { error: error.message || "Erro ao transferir estoque." };
  }
}

export async function getProductsByUnit(unitId: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("Não autorizado");
  }

  // Buscar produtos da empresa com a quantidade de estoque na unidade selecionada
  const products = await prisma.product.findMany({
    where: {
      companyId: session.companyId,
      NOT: {
        sku: {
          startsWith: "OS-CUSTOM-"
        }
      }
    },
    include: {
      stocks: {
        where: {
          unitId: unitId
        }
      }
    },
    orderBy: { name: "asc" }
  });

  return products.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    quantity: p.stocks.length > 0 ? p.stocks[0].quantity : 0
  })).filter(p => p.quantity > 0);
}
