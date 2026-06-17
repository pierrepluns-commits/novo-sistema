"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { getSelectedUnitId } from "./unit";

export type SaleItemData = {
  productId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  isFreebie: boolean;
};

export async function createSale(
  items: SaleItemData[],
  paymentMethod: string = "CASH",
  installments: number = 1,
  cardFee: number = 0,
  sellerId?: string,
  customDate?: string
) {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("Não autorizado ou sessão expirada");
  }

  const selectedUnitId = await getSelectedUnitId();

  if (!selectedUnitId) {
    throw new Error("Não autorizado ou unidade não definida");
  }

  if (items.length === 0) throw new Error("Carrinho vazio");

  const totalAmount = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

  // Buscar caixa aberto para a unidade ativa
  const register = await prisma.cashRegister.findFirst({
    where: { unitId: selectedUnitId, status: "OPEN" }
  });

  if (!register) {
    throw new Error("CAIXA_FECHADO");
  }

  // Verificar se há algum caixa aberto de dias anteriores
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const openYesterdayRegister = await prisma.cashRegister.findFirst({
    where: {
      unitId: selectedUnitId,
      status: "OPEN",
      openedAt: {
        lt: startOfToday
      }
    }
  });

  if (openYesterdayRegister) {
    throw new Error("CAIXA_DIA_ANTERIOR_ABERTO");
  }

  const saleDate = customDate ? new Date(customDate) : new Date();

  const sale = await prisma.$transaction(async (tx) => {
    // 1. Create Sale
    const newSale = await tx.sale.create({
      data: {
        userId: sellerId || session.userId,
        companyId: session.companyId!,
        unitId: selectedUnitId,
        totalAmount,
        paymentMethod,
        installments,
        cardFee,
        status: "COMPLETED",
        createdAt: saleDate,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: item.unitCost || 0,
            isFreebie: item.isFreebie
          }))
        }
      },
      include: {
        items: { include: { product: true } }
      }
    });

    // 2. Decrement inventory from Stock table (Baixa Inteligente)
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { kitItems: true }
      });

      if (!product) continue;

      if (product.isKit && product.kitItems.length > 0) {
        // É um Kit: dar baixa nos ingredientes/componentes
        for (const bundle of product.kitItems) {
          const qtyToDeduct = bundle.quantity * item.quantity;
          const compStock = await tx.stock.findUnique({
            where: { productId_unitId: { productId: bundle.componentId, unitId: selectedUnitId } }
          });
          if (compStock) {
            await tx.stock.update({
              where: { id: compStock.id },
              data: { quantity: { decrement: qtyToDeduct } }
            });
          }
        }
      } else {
        // Produto normal: dar baixa nele mesmo
        const stock = await tx.stock.findUnique({
          where: { productId_unitId: { productId: item.productId, unitId: selectedUnitId } }
        });
        if (stock) {
          await tx.stock.update({
            where: { id: stock.id },
            data: { quantity: { decrement: item.quantity } }
          });
        }
      }
    }

    // 3. Create a financial transaction
    const productSummary = newSale.items.map(item => `${item.quantity}x ${item.product?.name || 'Produto'}`).join(", ");
    const paymentMethodLabel = 
      paymentMethod === "CASH" ? "Dinheiro" : 
      paymentMethod === "PIX" ? "PIX" : 
      paymentMethod === "CREDIT_CARD" ? "Crédito" : "Débito";
    
    const shortId = newSale.id.split("-")[0].toUpperCase();
    const timeStr = saleDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (totalAmount > 0) {
      await tx.financialTransaction.create({
        data: {
          type: "INCOME",
          companyId: session.companyId!,
          unitId: selectedUnitId,
          amount: totalAmount,
          description: `Venda #${shortId}: (${productSummary}) - ${paymentMethodLabel} - ${timeStr}`,
          category: "Venda de Produtos",
          transactionDate: saleDate,
          userId: sellerId || session.userId,
          cashRegisterId: register.id
        }
      });
    }

    // Se houver taxa de cartão, registra como despesa vinculada
    if (cardFee > 0) {
      await tx.financialTransaction.create({
        data: {
          type: "EXPENSE",
          companyId: session.companyId!,
          unitId: selectedUnitId,
          amount: cardFee,
          description: `Taxa Cartão - Venda #${shortId} - ${paymentMethodLabel} - ${timeStr}`,
          category: "Taxas e Tarifas",
          transactionDate: saleDate,
          userId: sellerId || session.userId,
          cashRegisterId: register.id
        }
      });
    }

    const totalCost = items.reduce((acc, item) => acc + (item.quantity * (item.unitCost || 0)), 0);
    if (totalCost > 0) {
      await tx.financialTransaction.create({
        data: {
          type: "EXPENSE",
          companyId: session.companyId!,
          unitId: selectedUnitId,
          amount: totalCost,
          description: `Custo Mercadoria Venda #${shortId}: (${productSummary}) - ${paymentMethodLabel} - ${timeStr}`,
          category: "Custo de Produtos",
          transactionDate: saleDate,
          userId: sellerId || session.userId,
          cashRegisterId: register.id
        }
      });
    }

    // 4. Create StockMovement Audit
    for (const item of items) {
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          unitId: selectedUnitId,
          userId: sellerId || session.userId,
          type: "OUT",
          quantity: item.quantity,
          reason: "SALE",
          referenceId: newSale.id,
          createdAt: saleDate
        }
      });
    }

    return newSale;
  });

  revalidatePath("/pdv");
  revalidatePath("/estoque");
  revalidatePath("/financeiro");
  
  return sale;
}

export async function getRecentSales() {
  const session = await getSession();
  if (!session) return [];

  const selectedUnitId = await getSelectedUnitId();

  if (!selectedUnitId) return [];

  const sales = await prisma.sale.findMany({
    where: { unitId: selectedUnitId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      items: { include: { product: true } },
      user: true
    }
  });
  return sales;
}

export async function cancelSale(saleId: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("Não autorizado");
  }

  const selectedUnitId = await getSelectedUnitId();

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { items: true }
    });

    if (!sale) throw new Error("Venda não encontrada");
    if (sale.status === "CANCELLED") throw new Error("Venda já está cancelada");
    
    // Admins podem gerenciar vendas de qualquer unidade da empresa
    if (session.role !== "COMPANY_ADMIN" && sale.unitId !== selectedUnitId) {
      throw new Error("Venda de outra unidade");
    }

    const updatedSale = await tx.sale.update({
      where: { id: saleId },
      data: { status: "CANCELLED" }
    });

    // Restore inventory (Baixa Inteligente)
    for (const item of sale.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { kitItems: true }
      });

      if (!product) continue;

      if (product.isKit && product.kitItems.length > 0) {
        for (const bundle of product.kitItems) {
          const qtyToRestore = bundle.quantity * item.quantity;
          const compStock = await tx.stock.findUnique({
            where: { productId_unitId: { productId: bundle.componentId, unitId: sale.unitId } }
          });
          if (compStock) {
            await tx.stock.update({
              where: { id: compStock.id },
              data: { quantity: { increment: qtyToRestore } }
            });
          }
        }
      } else {
        const stock = await tx.stock.findUnique({
          where: { productId_unitId: { productId: item.productId, unitId: sale.unitId } }
        });
        if (stock) {
          await tx.stock.update({
            where: { id: stock.id },
            data: { quantity: { increment: item.quantity } }
          });
        }
      }
    }

    if (sale.totalAmount > 0) {
      // Tentar achar caixa aberto para atrelar estorno
      const register = await tx.cashRegister.findFirst({
        where: { unitId: sale.unitId, status: "OPEN" }
      });

      const paymentMethodLabel = 
        sale.paymentMethod === "CASH" ? "Dinheiro" : 
        sale.paymentMethod === "PIX" ? "PIX" : 
        sale.paymentMethod === "CREDIT_CARD" ? "Crédito" : "Débito";

      await tx.financialTransaction.create({
        data: {
          type: "EXPENSE",
          companyId: session.companyId!,
          unitId: sale.unitId,
          amount: sale.totalAmount,
          description: `Estorno Venda #${sale.id.split("-")[0]} - ${paymentMethodLabel}`,
          category: "Estorno",
          transactionDate: new Date(),
          userId: session.userId,
          cashRegisterId: register ? register.id : null
        }
      });
    }

    // Gerar log de auditoria de estorno
    for (const item of sale.items) {
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          unitId: sale.unitId,
          userId: session.userId,
          type: "IN",
          quantity: item.quantity,
          reason: "CANCEL",
          referenceId: sale.id
        }
      });
    }

    return updatedSale;
  });

  revalidatePath("/pdv");
  revalidatePath("/estoque");
  revalidatePath("/financeiro");

  return result;
}

export async function updateSaleFee(saleId: string, fee: number) {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("Não autorizado");
  }

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: saleId } });
    if (!sale) throw new Error("Venda não encontrada");

    const updatedSale = await tx.sale.update({
      where: { id: saleId },
      data: { cardFee: fee }
    });

    // Encontra despesa existente de taxa dessa venda
    const existingTx = await tx.financialTransaction.findFirst({
      where: {
        companyId: session.companyId!,
        description: { startsWith: `Taxa Cartão - Venda #${sale.id.split("-")[0]}` }
      }
    });

    if (existingTx) {
      if (fee > 0) {
        // Atualiza a transação existente
        await tx.financialTransaction.update({
          where: { id: existingTx.id },
          data: { amount: fee }
        });
      } else {
        // Exclui a transação existente se a nova taxa for zero
        await tx.financialTransaction.delete({
          where: { id: existingTx.id }
        });
      }
    } else if (fee > 0) {
      // Cria uma nova transação de despesa se não existia e a taxa é maior que zero
      const register = await tx.cashRegister.findFirst({
        where: { unitId: sale.unitId, status: "OPEN" }
      });
      
      await tx.financialTransaction.create({
        data: {
          type: "EXPENSE",
          companyId: session.companyId!,
          unitId: sale.unitId,
          amount: fee,
          description: `Taxa Cartão - Venda #${sale.id.split("-")[0]}`,
          category: "Taxas e Tarifas",
          transactionDate: new Date(),
          userId: session.userId,
          cashRegisterId: register ? register.id : null
        }
      });
    }
    
    return updatedSale;
  });

  revalidatePath("/pdv");
  revalidatePath("/financeiro");
  revalidatePath("/caixa");
  
  return result;
}

export async function updateSaleDetails(
  saleId: string,
  paymentMethod: string,
  cardFee: number,
  customDate?: string
) {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("Não autorizado");
  }

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { items: { include: { product: true } } }
    });
    if (!sale) throw new Error("Venda não encontrada");
    if (sale.status === "CANCELLED") throw new Error("Venda cancelada não pode ser editada");

    // 1. Update the sale record
    const newSaleDate = customDate ? new Date(customDate) : undefined;

    const updatedSale = await tx.sale.update({
      where: { id: saleId },
      data: {
        paymentMethod,
        cardFee,
        ...(newSaleDate ? { createdAt: newSaleDate } : {})
      }
    });

    const paymentMethodLabel = 
      paymentMethod === "CASH" ? "Dinheiro" : 
      paymentMethod === "PIX" ? "PIX" : 
      paymentMethod === "CREDIT_CARD" ? "Crédito" : "Débito";

    const productSummary = sale.items.map(item => `${item.quantity}x ${item.product?.name || 'Produto'}`).join(", ");
    const shortId = sale.id.split("-")[0].toUpperCase();
    const finalDate = newSaleDate || sale.createdAt;
    const timeStr = finalDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // 2. Find and update the related INCOME transaction (the sale itself)
    const incomeTx = await tx.financialTransaction.findFirst({
      where: {
        companyId: session.companyId!,
        unitId: sale.unitId,
        type: "INCOME",
        amount: sale.totalAmount,
        description: { contains: `#${shortId}` }
      }
    });

    if (incomeTx) {
      await tx.financialTransaction.update({
        where: { id: incomeTx.id },
        data: {
          description: `Venda #${shortId}: (${productSummary}) - ${paymentMethodLabel} - ${timeStr}`,
          ...(newSaleDate ? { transactionDate: newSaleDate } : {})
        }
      });
    }

    // 3. Find and update the Custo de Produtos transaction description if it exists
    const costTx = await tx.financialTransaction.findFirst({
      where: {
        companyId: session.companyId!,
        unitId: sale.unitId,
        type: "EXPENSE",
        category: "Custo de Produtos",
        description: { contains: `#${shortId}` }
      }
    });

    if (costTx) {
      await tx.financialTransaction.update({
        where: { id: costTx.id },
        data: {
          description: `Custo Mercadoria Venda #${shortId}: (${productSummary}) - ${paymentMethodLabel} - ${timeStr}`,
          ...(newSaleDate ? { transactionDate: newSaleDate } : {})
        }
      });
    }

    // 4. Update the card fee EXPENSE transaction
    const existingFeeTx = await tx.financialTransaction.findFirst({
      where: {
        companyId: session.companyId!,
        unitId: sale.unitId,
        type: "EXPENSE",
        category: "Taxas e Tarifas",
        description: { contains: `#${shortId}` }
      }
    });

    if (existingFeeTx) {
      if (cardFee > 0 && (paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD")) {
        await tx.financialTransaction.update({
          where: { id: existingFeeTx.id },
          data: {
            amount: cardFee,
            description: `Taxa Cartão - Venda #${shortId} - ${paymentMethodLabel} - ${timeStr}`,
            ...(newSaleDate ? { transactionDate: newSaleDate } : {})
          }
        });
      } else {
        await tx.financialTransaction.delete({
          where: { id: existingFeeTx.id }
        });
      }
    } else if (cardFee > 0 && (paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD")) {
      const register = await tx.cashRegister.findFirst({
        where: { unitId: sale.unitId, status: "OPEN" }
      });
      
      await tx.financialTransaction.create({
        data: {
          type: "EXPENSE",
          companyId: session.companyId!,
          unitId: sale.unitId,
          amount: cardFee,
          description: `Taxa Cartão - Venda #${shortId} - ${paymentMethodLabel} - ${timeStr}`,
          category: "Taxas e Tarifas",
          transactionDate: finalDate,
          userId: session.userId,
          cashRegisterId: register ? register.id : null
        }
      });
    }

    // 5. Update StockMovement dates if retroactive
    if (newSaleDate) {
      await tx.stockMovement.updateMany({
        where: {
          referenceId: sale.id
        },
        data: {
          createdAt: newSaleDate
        }
      });
    }

    return updatedSale;
  });

  revalidatePath("/pdv");
  revalidatePath("/financeiro");
  revalidatePath("/caixa");
  
  return result;
}

