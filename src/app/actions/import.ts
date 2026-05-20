"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function importProducts(data: any[], unitId: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Não autorizado." };
  }

  // Permissão
  let permissions: string[] = [];
  try {
    permissions = session.permissions ? JSON.parse(session.permissions) : [];
  } catch (e) {}
  
  if (session.role !== "SUPER_ADMIN" && session.role !== "COMPANY_ADMIN" && !permissions.includes("MANAGE_STOCK") && !permissions.includes("ALL")) {
    return { error: "Sem permissão para importar estoque." };
  }

  try {
    let successCount = 0;
    
    // Processamento em lote
    await prisma.$transaction(async (tx) => {
      for (const row of data) {
        if (!row.Nome || !row.SKU || row.Custo === undefined || row.Preco === undefined) {
          continue; // Pula linha inválida
        }

        const cost = parseFloat(String(row.Custo).replace(",", "."));
        const price = parseFloat(String(row.Preco).replace(",", "."));
        const initialQuantity = parseInt(String(row.Quantidade || 0), 10);

        // Verifica se produto já existe pelo SKU na empresa
        let product = await tx.product.findFirst({
          where: { companyId: session.companyId!, sku: String(row.SKU) }
        });

        if (!product) {
          product = await tx.product.create({
            data: {
              companyId: session.companyId!,
              name: String(row.Nome),
              sku: String(row.SKU),
              barcode: row.CodigoBarras ? String(row.CodigoBarras) : null,
              description: row.Descricao ? String(row.Descricao) : null,
              cost: isNaN(cost) ? 0 : cost,
              price: isNaN(price) ? 0 : price,
              isKit: false
            }
          });
        }

        // Adiciona/Atualiza o estoque na unidade selecionada
        const stock = await tx.stock.upsert({
          where: {
            productId_unitId: {
              productId: product.id,
              unitId: unitId
            }
          },
          update: {
            quantity: { increment: initialQuantity }
          },
          create: {
            productId: product.id,
            unitId: unitId,
            quantity: initialQuantity
          }
        });

        if (initialQuantity > 0) {
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              unitId: unitId,
              userId: session.userId,
              type: "IN",
              quantity: initialQuantity,
              reason: "MANUAL_ADJUST",
              referenceId: "IMPORT_CSV"
            }
          });
        }

        successCount++;
      }
    });

    revalidatePath("/estoque");
    return { success: true, count: successCount };
  } catch (error: any) {
    console.error("ERRO IMPORTAÇÃO CSV:", error);
    return { error: `Erro ao importar: ${error.message || error}` };
  }
}
