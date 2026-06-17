"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getSelectedUnitId } from "./unit";

export type TriagemOSData = {
  clientId: string;
  equipmentType: string;
  equipmentBrand: string;
  equipmentModel: string;
  equipmentSerial?: string;
  equipmentColor?: string;
  equipmentPassword?: string;
  reportedDefect: string;
  physicalState?: string;
  accessories?: string;
  checklistJson: string; // checklist state stringified
  prepayment?: number; // Sinal
  prepaymentMethod?: string; // CASH, PIX, CREDIT_CARD, DEBIT_CARD
  prepaymentCardFee?: number;
  prepaymentInstallments?: number;
};

// 1. Create Service Order (Abertura e Triagem)
export async function createServiceOrderAction(data: TriagemOSData) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  const selectedUnitId = await getSelectedUnitId();
  if (!selectedUnitId) {
    return { error: "Por favor, selecione uma unidade/loja para trabalhar." };
  }

  if (!data.clientId) return { error: "Cliente é obrigatório." };
  if (!data.equipmentType || !data.equipmentBrand || !data.equipmentModel) {
    return { error: "Tipo, Marca e Modelo do aparelho são obrigatórios." };
  }
  if (!data.reportedDefect) return { error: "Defeito relatado é obrigatório." };

  // Verificar se há algum caixa aberto de dias anteriores na unidade selecionada
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
    return { error: "CAIXA_DIA_ANTERIOR_ABERTO" };
  }

  try {
    const os = await prisma.$transaction(async (tx) => {
      // Generate incremental O.S. Number
      const lastOS = await tx.serviceOrder.findFirst({
        where: { companyId: session.companyId! },
        orderBy: { osNumber: "desc" },
      });

      const nextOSNumber = lastOS ? lastOS.osNumber + 1 : 1001;

      const newOS = await tx.serviceOrder.create({
        data: {
          osNumber: nextOSNumber,
          companyId: session.companyId!,
          unitId: selectedUnitId,
          clientId: data.clientId,
          userId: session.userId,
          equipmentType: data.equipmentType.trim(),
          equipmentBrand: data.equipmentBrand.trim(),
          equipmentModel: data.equipmentModel.trim(),
          equipmentSerial: data.equipmentSerial ? data.equipmentSerial.trim() : null,
          equipmentColor: data.equipmentColor ? data.equipmentColor.trim() : null,
          equipmentPassword: data.equipmentPassword ? data.equipmentPassword : null,
          reportedDefect: data.reportedDefect.trim(),
          physicalState: data.physicalState ? data.physicalState.trim() : null,
          accessories: data.accessories ? data.accessories.trim() : null,
          checklist: data.checklistJson || "{}",
          status: "BUDGET",
          prepayment: data.prepayment || 0,
          totalAmount: 0,
        },
      });

      // Se houver sinal/adiantamento e caixa aberto, cria transação financeira de entrada
      if (data.prepayment && data.prepayment > 0) {
        const register = await tx.cashRegister.findFirst({
          where: { unitId: selectedUnitId, status: "OPEN" },
        });

        if (register) {
          const methodLabel = 
            data.prepaymentMethod === "CASH" ? "Dinheiro" : 
            data.prepaymentMethod === "PIX" ? "PIX" : 
            data.prepaymentMethod === "CREDIT_CARD" ? "Crédito" : 
            data.prepaymentMethod === "DEBIT_CARD" ? "Débito" : "Dinheiro";

          await tx.financialTransaction.create({
            data: {
              type: "INCOME",
              companyId: session.companyId!,
              unitId: selectedUnitId,
              amount: data.prepayment,
              description: `Sinal O.S. #${nextOSNumber} - ${data.equipmentBrand} ${data.equipmentModel} - ${methodLabel}`,
              category: "Entrada Adiantamento O.S.",
              transactionDate: new Date(),
              userId: session.userId,
              cashRegisterId: register.id,
            },
          });

          // Se houver taxa de cartão para o sinal, registra como despesa de taxa
          if (data.prepaymentCardFee && data.prepaymentCardFee > 0 && (data.prepaymentMethod === "CREDIT_CARD" || data.prepaymentMethod === "DEBIT_CARD")) {
            await tx.financialTransaction.create({
              data: {
                type: "EXPENSE",
                companyId: session.companyId!,
                unitId: selectedUnitId,
                amount: data.prepaymentCardFee,
                description: `Taxa Cartão Sinal - O.S. #${nextOSNumber}`,
                category: "Taxas e Tarifas",
                transactionDate: new Date(),
                userId: session.userId,
                cashRegisterId: register.id,
              },
            });
          }
        }
      }

      return newOS;
    });

    revalidatePath("/os");
    return { success: true, osId: os.id, osNumber: os.osNumber };
  } catch (error: any) {
    console.error(error);
    return { error: "Erro ao abrir Ordem de Serviço: " + error.message };
  }
}

// 2. Full Edit / Retrospective Update O.S. details
export async function updateServiceOrderAction(osId: string, data: Partial<TriagemOSData> & { status?: string }) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  try {
    const existing = await prisma.serviceOrder.findUnique({
      where: { id: osId, companyId: session.companyId },
    });

    if (!existing) return { error: "O.S. não encontrada." };
    if (existing.status === "DELIVERED") return { error: "Não é possível editar uma O.S. já entregue." };

    await prisma.serviceOrder.update({
      where: { id: osId },
      data: {
        ...(data.clientId ? { clientId: data.clientId } : {}),
        ...(data.equipmentType ? { equipmentType: data.equipmentType.trim() } : {}),
        ...(data.equipmentBrand ? { equipmentBrand: data.equipmentBrand.trim() } : {}),
        ...(data.equipmentModel ? { equipmentModel: data.equipmentModel.trim() } : {}),
        equipmentSerial: data.equipmentSerial !== undefined ? (data.equipmentSerial ? data.equipmentSerial.trim() : null) : undefined,
        equipmentColor: data.equipmentColor !== undefined ? (data.equipmentColor ? data.equipmentColor.trim() : null) : undefined,
        equipmentPassword: data.equipmentPassword !== undefined ? (data.equipmentPassword ? data.equipmentPassword : null) : undefined,
        ...(data.reportedDefect ? { reportedDefect: data.reportedDefect.trim() } : {}),
        physicalState: data.physicalState !== undefined ? (data.physicalState ? data.physicalState.trim() : null) : undefined,
        accessories: data.accessories !== undefined ? (data.accessories ? data.accessories.trim() : null) : undefined,
        ...(data.checklistJson ? { checklist: data.checklistJson } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });

    revalidatePath(`/os/editar/${osId}`);
    revalidatePath("/os");
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao atualizar dados da O.S.: " + error.message };
  }
}

// 3. Technical Update (Laudo, Mão de Obra, Status, Garantia e Técnico)
export async function updateServiceOrderTechnicalAction(
  osId: string,
  report: string,
  servicePrice: number,
  status: string,
  warrantyPeriod: number,
  warrantyTerms: string,
  userId?: string,
  technicianName?: string,
  cardServicePrice?: number
) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  try {
    const os = await prisma.serviceOrder.findUnique({
      where: { id: osId, companyId: session.companyId },
    });

    if (!os) return { error: "O.S. não encontrada." };
    if (os.status === "DELIVERED") return { error: "Não é possível alterar uma O.S. já entregue." };

    const totalAmount = servicePrice - os.discount;

    // Parse existing checklist and inject technicianName and cardServicePrice
    let checklistObj: Record<string, any> = {};
    try {
      checklistObj = JSON.parse(os.checklist || "{}");
    } catch {
      checklistObj = {};
    }

    if (technicianName !== undefined) {
      checklistObj.technicianName = technicianName.trim();
    }
    if (cardServicePrice !== undefined) {
      checklistObj.cardServicePrice = cardServicePrice;
    }

    await prisma.serviceOrder.update({
      where: { id: osId },
      data: {
        technicalReport: report ? report.trim() : null,
        servicePrice: servicePrice || 0,
        status,
        warrantyPeriod: warrantyPeriod || 0,
        warrantyTerms: warrantyTerms ? warrantyTerms.trim() : null,
        totalAmount,
        userId: userId || null,
        checklist: JSON.stringify(checklistObj),
      },
    });

    revalidatePath(`/os/editar/${osId}`);
    revalidatePath("/os");
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao atualizar laudo técnico: " + error.message };
  }
}

// 3.1 Update O.S. Custom/Outsourced Cost (Pode lançar depois!)
export async function updateServiceOrderCostAction(osId: string, cost: number) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  try {
    const os = await prisma.serviceOrder.findUnique({
      where: { id: osId, companyId: session.companyId },
    });

    if (!os) return { error: "O.S. não encontrada." };

    // 1. Atualiza no banco de dados da O.S.
    await prisma.serviceOrder.update({
      where: { id: osId },
      data: { cost: cost || 0 },
    });

    // 2. Se a O.S. estiver DELIVERED (Faturada), sincroniza retroativamente com o Livro Caixa
    if (os.status === "DELIVERED") {
      const register = await prisma.cashRegister.findFirst({
        where: { unitId: os.unitId, status: "OPEN" },
      });

      const existingTx = await prisma.financialTransaction.findFirst({
        where: {
          companyId: session.companyId!,
          description: { startsWith: `Custo Terceirizado O.S. #${os.osNumber}` },
        },
      });

      if (existingTx) {
        if (cost > 0) {
          await prisma.financialTransaction.update({
            where: { id: existingTx.id },
            data: { amount: cost },
          });
        } else {
          await prisma.financialTransaction.delete({
            where: { id: existingTx.id },
          });
        }
      } else if (cost > 0) {
        await prisma.financialTransaction.create({
          data: {
            type: "EXPENSE",
            companyId: session.companyId!,
            unitId: os.unitId,
            amount: cost,
            description: `Custo Terceirizado O.S. #${os.osNumber}: (${os.equipmentBrand} ${os.equipmentModel})`,
            category: "Custo de Serviços",
            transactionDate: new Date(),
            userId: session.userId,
            cashRegisterId: register ? register.id : null,
          },
        });
      }
    }

    revalidatePath(`/os/editar/${osId}`);
    revalidatePath("/os");
    revalidatePath("/financeiro");
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao atualizar custo da O.S.: " + error.message };
  }
}

// 4. Add Part/Piece from Stock to O.S. Budget
export async function addPartToServiceOrderAction(
  osId: string,
  productId: string,
  quantity: number,
  unitPrice: number,
  unitCost?: number
) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  const selectedUnitId = await getSelectedUnitId();
  if (!selectedUnitId) return { error: "Selecione uma unidade/loja." };

  try {
    const os = await prisma.serviceOrder.findUnique({
      where: { id: osId, companyId: session.companyId },
    });

    if (!os) return { error: "O.S. não encontrada." };
    if (os.status === "DELIVERED") return { error: "O.S. já foi entregue." };

    // Validar se tem estoque disponível
    const stock = await prisma.stock.findUnique({
      where: { productId_unitId: { productId, unitId: selectedUnitId } },
      include: { product: true },
    });

    if (!stock || stock.quantity < quantity) {
      return { error: `Estoque insuficiente. Disponível no estoque: ${stock ? stock.quantity : 0} unidades.` };
    }

    const itemCost = unitCost !== undefined ? unitCost : (stock.product?.cost || 0);

    await prisma.$transaction(async (tx) => {
      // Verifica se a peça já existe na O.S.
      const existingItem = await tx.serviceOrderItem.findFirst({
        where: { serviceOrderId: osId, productId },
      });

      if (existingItem) {
        // Atualiza quantidade
        await tx.serviceOrderItem.update({
          where: { id: existingItem.id },
          data: { 
            quantity: existingItem.quantity + quantity,
            unitCost: itemCost,
            unitPrice: unitPrice
          },
        });
      } else {
        // Cria item
        await tx.serviceOrderItem.create({
          data: {
            serviceOrderId: osId,
            productId,
            quantity,
            unitPrice,
            unitCost: itemCost,
          },
        });
      }

      // Atualiza valores totais na O.S.
      const partsTotal = os.partsPrice + (quantity * unitPrice);
      const totalAmount = os.servicePrice - os.discount;

      await tx.serviceOrder.update({
        where: { id: osId },
        data: {
          partsPrice: partsTotal,
          totalAmount,
        },
      });
    });

    revalidatePath(`/os/editar/${osId}`);
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao adicionar peça: " + error.message };
  }
}

// 5. Remove Part/Piece from O.S. Budget
export async function removePartFromServiceOrderAction(itemId: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  try {
    const item = await prisma.serviceOrderItem.findUnique({
      where: { id: itemId },
      include: { serviceOrder: true },
    });

    if (!item || item.serviceOrder.companyId !== session.companyId) {
      return { error: "Item não encontrado." };
    }

    if (item.serviceOrder.status === "DELIVERED") {
      return { error: "O.S. já foi entregue." };
    }

    const osId = item.serviceOrderId;
    const itemTotal = item.quantity * item.unitPrice;

    await prisma.$transaction(async (tx) => {
      await tx.serviceOrderItem.delete({
        where: { id: itemId },
      });

      const partsTotal = Math.max(0, item.serviceOrder.partsPrice - itemTotal);
      const totalAmount = item.serviceOrder.servicePrice - item.serviceOrder.discount;

      await tx.serviceOrder.update({
        where: { id: osId },
        data: {
          partsPrice: partsTotal,
          totalAmount,
        },
      });
    });

    revalidatePath(`/os/editar/${osId}`);
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao remover peça: " + error.message };
  }
}

// 6. Finish, Bill and Deliver O.S. (Deduce Stock, Register Faturamento)
export async function finishAndBillServiceOrderAction(
  osId: string,
  paymentMethod: string,
  cardFee: number = 0,
  installments: number = 1,
  discount: number = 0,
  servicePrice?: number,
  cardServicePrice?: number
) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  try {
    const os = await prisma.serviceOrder.findUnique({
      where: { id: osId, companyId: session.companyId },
      include: { items: { include: { product: true } }, client: true },
    });

    if (!os) return { error: "O.S. não encontrada." };
    if (os.status === "DELIVERED") return { error: "Esta O.S. já foi entregue e faturada." };

    // Get cardServicePrice from checklist
    let checklistObj: Record<string, any> = {};
    try {
      checklistObj = JSON.parse(os.checklist || "{}");
    } catch {
      checklistObj = {};
    }

    const currentServicePrice = servicePrice !== undefined ? servicePrice : os.servicePrice;
    if (cardServicePrice !== undefined) {
      checklistObj.cardServicePrice = cardServicePrice;
    }

    const cardPrice = checklistObj.cardServicePrice !== undefined && checklistObj.cardServicePrice !== null
      ? parseFloat(checklistObj.cardServicePrice)
      : currentServicePrice;

    // Determine the base labor price based on payment method
    const isCard = paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD";
    const baseLaborPrice = isCard ? cardPrice : currentServicePrice;

    // Calcular valores finais a receber
    const totalAmount = baseLaborPrice - discount;
    const remainder = Math.max(0, totalAmount - os.prepayment);

    // Buscar caixa aberto
    const register = await prisma.cashRegister.findFirst({
      where: { unitId: os.unitId, status: "OPEN" },
    });

    if (remainder > 0 && !register) {
      return { error: "Não há nenhum caixa aberto nesta unidade. Abra o caixa para finalizar a O.S." };
    }

    // Calcula garantia expiração
    const warrantyExpiresAt = os.warrantyPeriod > 0
      ? new Date(Date.now() + os.warrantyPeriod * 24 * 60 * 60 * 1000)
      : null;

    await prisma.$transaction(async (tx) => {
      // 1. Dar baixa física real no estoque (Stock) de cada peça aplicada
      for (const item of os.items) {
        const stock = await tx.stock.findUnique({
          where: { productId_unitId: { productId: item.productId, unitId: os.unitId } },
        });

        if (stock) {
          // decrementa o estoque
          await tx.stock.update({
            where: { id: stock.id },
            data: { quantity: { decrement: item.quantity } },
          });

          // Registra a movimentação de estoque física (StockMovement)
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              unitId: os.unitId,
              userId: session.userId,
              type: "OUT",
              quantity: item.quantity,
              reason: "SALE", // Venda/Uso em assistência
              referenceId: os.id,
            },
          });
        }
      }

      const shortId = os.id.split("-")[0].toUpperCase();
      const timeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      // 2. Criar Transação de Receita do Saldo Restante (Se houver restante)
      if (remainder > 0 && register) {
        const methodLabel = 
          paymentMethod === "CASH" ? "Dinheiro" : 
          paymentMethod === "PIX" ? "PIX" : 
          paymentMethod === "CREDIT_CARD" ? "Crédito" : "Débito";

        await tx.financialTransaction.create({
          data: {
            type: "INCOME",
            companyId: session.companyId!,
            unitId: os.unitId,
            amount: remainder,
            description: `Fecham. O.S. #${os.osNumber}: (${os.equipmentBrand} ${os.equipmentModel}) - ${methodLabel} - ${timeStr}`,
            category: "Venda de Serviços/Assistência",
            transactionDate: new Date(),
            userId: session.userId,
            cashRegisterId: register.id,
          },
        });
      }

      // 3. Se houver taxa de cartão, registra como despesa de taxa
      if (cardFee > 0 && register && (paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD")) {
        await tx.financialTransaction.create({
          data: {
            type: "EXPENSE",
            companyId: session.companyId!,
            unitId: os.unitId,
            amount: cardFee,
            description: `Taxa Cartão - O.S. #${os.osNumber} - ${timeStr}`,
            category: "Taxas e Tarifas",
            transactionDate: new Date(),
            userId: session.userId,
            cashRegisterId: register.id,
          },
        });
      }

      // 4. Registrar custo das peças como CMV na O.S. (Gera transparência no lucro total do mês)
      const totalPartsCost = os.partsPrice || 0;
      if (totalPartsCost > 0 && register) {
        await tx.financialTransaction.create({
          data: {
            type: "EXPENSE",
            companyId: session.companyId!,
            unitId: os.unitId,
            amount: totalPartsCost,
            description: `Custo Peças O.S. #${os.osNumber}: (${os.equipmentBrand} ${os.equipmentModel})`,
            category: "Custo de Produtos",
            transactionDate: new Date(),
            userId: session.userId,
            cashRegisterId: register.id,
          },
        });
      }

      // 4.1 Registrar custo terceirizado / insumos adicionais se houver
      if (os.cost > 0 && register) {
        await tx.financialTransaction.create({
          data: {
            type: "EXPENSE",
            companyId: session.companyId!,
            unitId: os.unitId,
            amount: os.cost,
            description: `Custo Terceirizado O.S. #${os.osNumber}: (${os.equipmentBrand} ${os.equipmentModel})`,
            category: "Custo de Serviços",
            transactionDate: new Date(),
            userId: session.userId,
            cashRegisterId: register.id,
          },
        });
      }

      // 5. Atualizar O.S. como entregue, confirmando as taxas, adiantamento, desconto e garantias
      await tx.serviceOrder.update({
        where: { id: osId },
        data: {
          status: "DELIVERED",
          discount,
          paymentMethod,
          installments,
          cardFee,
          warrantyExpiresAt,
          warrantyStatus: os.warrantyPeriod > 0 ? "ACTIVE" : "VOIDED",
          totalAmount,
          servicePrice: baseLaborPrice,
          checklist: JSON.stringify(checklistObj),
        },
      });
    });

    revalidatePath(`/os/editar/${osId}`);
    revalidatePath("/os");
    revalidatePath("/financeiro");
    revalidatePath("/estoque");

    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao finalizar faturamento da O.S.: " + error.message };
  }
}

// 7. Cancel Service Order
export async function cancelServiceOrderAction(osId: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida." };
  }

  try {
    const os = await prisma.serviceOrder.findUnique({
      where: { id: osId, companyId: session.companyId },
    });

    if (!os) return { error: "O.S. não encontrada." };
    if (os.status === "DELIVERED") return { error: "O.S. já entregue não pode ser cancelada." };

    await prisma.serviceOrder.update({
      where: { id: osId },
      data: { status: "UNREPAIRABLE" }, // Ou "CANCELLED"
    });

    revalidatePath("/os");
    revalidatePath(`/os/editar/${osId}`);
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao cancelar O.S.: " + error.message };
  }
}

// 8. Add custom on-demand part to Service Order
export async function addCustomPartToServiceOrderAction(
  osId: string,
  name: string,
  quantity: number,
  unitPrice: number,
  unitCost: number
) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  const selectedUnitId = await getSelectedUnitId();
  if (!selectedUnitId) return { error: "Selecione uma unidade/loja." };

  if (!name.trim()) return { error: "Nome da peça é obrigatório." };
  if (quantity <= 0) return { error: "Quantidade deve ser maior que zero." };

  try {
    const os = await prisma.serviceOrder.findUnique({
      where: { id: osId, companyId: session.companyId },
    });

    if (!os) return { error: "O.S. não encontrada." };
    if (os.status === "DELIVERED") return { error: "O.S. já foi entregue." };

    // Criar o produto sob demanda no banco para esta empresa com SKU único
    const customSku = `OS-CUSTOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          companyId: session.companyId!,
          name: `${name.trim()} (O.S. #${os.osNumber})`,
          sku: customSku,
          price: unitPrice,
          cost: unitCost,
          description: `Peça sob demanda criada para a O.S. #${os.osNumber}`,
        },
      });

      // Adicionar o item à O.S.
      await tx.serviceOrderItem.create({
        data: {
          serviceOrderId: osId,
          productId: newProduct.id,
          quantity,
          unitPrice,
          unitCost,
        },
      });

      // Atualizar totais na O.S.
      const partsTotal = os.partsPrice + (quantity * unitPrice);
      const totalAmount = os.servicePrice - os.discount;

      await tx.serviceOrder.update({
        where: { id: osId },
        data: {
          partsPrice: partsTotal,
          totalAmount,
        },
      });
    });

    revalidatePath(`/os/editar/${osId}`);
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { error: "Erro ao adicionar peça sob demanda: " + error.message };
  }
}

// 9. Update Service Order simple part name and cost (stored in partsPrice and checklist.partName)
export async function updateServiceOrderPartAction(osId: string, partName: string, partCost: number) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  try {
    const os = await prisma.serviceOrder.findUnique({
      where: { id: osId, companyId: session.companyId },
    });

    if (!os) return { error: "O.S. não encontrada." };
    if (os.status === "DELIVERED") return { error: "Não é possível alterar uma O.S. já entregue." };

    // Parse checklist and set partName
    let checklistObj: Record<string, any> = {};
    try {
      checklistObj = JSON.parse(os.checklist || "{}");
    } catch {
      checklistObj = {};
    }

    checklistObj.partName = partName.trim();

    await prisma.serviceOrder.update({
      where: { id: osId },
      data: {
        partsPrice: partCost || 0,
        checklist: JSON.stringify(checklistObj),
      },
    });

    revalidatePath(`/os/editar/${osId}`);
    revalidatePath("/os");
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao atualizar peça da O.S.: " + error.message };
  }
}
