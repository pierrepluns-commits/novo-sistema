"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSelectedUnitId } from "@/app/actions/unit";
import { revalidatePath } from "next/cache";

export async function calculateSalaryPayrollAction(
  userId: string,
  startDateStr: string,
  endDateStr: string,
  unitFilter: "current" | "all" = "current"
) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  const selectedUnitId = await getSelectedUnitId();
  if (!selectedUnitId) {
    return { error: "Unidade não selecionada." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, companyId: session.companyId }
    });

    if (!user) {
      return { error: "Funcionário não encontrado." };
    }

    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    // Build unit condition based on filter parameter
    const unitCondition = unitFilter === "all" ? {} : { unitId: selectedUnitId };

    // 1. Fetch finished Service Orders in this unit range & period
    const osList = await prisma.serviceOrder.findMany({
      where: {
        companyId: session.companyId,
        ...unitCondition,
        status: "DELIVERED",
        deliveredAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        user: true,
        unit: true
      }
    });

    // Filter in-memory by technician name or userId
    const matchedOSList = osList.filter(os => {
      let checklistObj: Record<string, any> = {};
      try {
        checklistObj = JSON.parse(os.checklist || "{}");
      } catch {
        checklistObj = {};
      }
      const techName = checklistObj.technicianName?.trim().toLowerCase();
      if (techName) {
        return techName === user.name.trim().toLowerCase();
      }
      return os.userId === user.id;
    });

    const formattedOSList = matchedOSList.map(os => {
      let checklistObj: Record<string, any> = {};
      try {
        checklistObj = JSON.parse(os.checklist || "{}");
      } catch {
        checklistObj = {};
      }
      const date = checklistObj.billingDate ? new Date(checklistObj.billingDate) : os.updatedAt;
      return {
        id: os.id,
        osNumber: os.osNumber,
        date: date.toLocaleDateString("pt-BR"),
        equipment: `${os.equipmentBrand} ${os.equipmentModel}`,
        commission: os.cost || 0,
        unitName: os.unit.name
      };
    });

    const totalOSCommissions = formattedOSList.reduce((sum, item) => sum + item.commission, 0);

    // 2. Fetch completed Sales made by the user in this unit range & period
    const sales = await prisma.sale.findMany({
      where: {
        companyId: session.companyId,
        ...unitCondition,
        userId: user.id,
        status: "COMPLETED",
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        unit: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    const formattedSalesList: any[] = [];
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const isCustom = item.product.sku.startsWith("OS-CUSTOM");
        // Calculate 2% commission on physical items sold in PDV (accessories)
        if (!isCustom) {
          const grossValue = item.quantity * item.unitPrice;
          const commission = grossValue * 0.02;
          formattedSalesList.push({
            id: item.id,
            date: sale.createdAt.toLocaleDateString("pt-BR"),
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            grossValue,
            commission,
            unitName: sale.unit.name
          });
        }
      });
    });

    const totalAccessoryCommissions = formattedSalesList.reduce((sum, item) => sum + item.commission, 0);

    // 3. Fetch advances (Vales) recorded in this unit range & period for this user
    const valesList = await prisma.financialTransaction.findMany({
      where: {
        companyId: session.companyId,
        ...unitCondition,
        userId: user.id,
        type: "SALARY_VALE",
        category: "VALE",
        transactionDate: {
          gte: start,
          lte: end
        }
      },
      include: {
        unit: true
      },
      orderBy: {
        transactionDate: "asc"
      }
    });

    const formattedValesList = valesList.map(v => ({
      id: v.id,
      date: new Date(v.transactionDate).toISOString().split("T")[0], // ISO for inputs
      dateStr: new Date(v.transactionDate).toLocaleDateString("pt-BR"), // user friendly
      description: v.description.replace(/^VALE:\s*/i, ""),
      amount: v.amount,
      unitName: v.unit.name
    }));

    const totalVales = formattedValesList.reduce((sum, item) => sum + item.amount, 0);

    return {
      success: true,
      employeeName: user.name,
      osList: formattedOSList,
      totalOSCommissions,
      salesList: formattedSalesList,
      totalAccessoryCommissions,
      valesList: formattedValesList,
      totalVales
    };
  } catch (error: any) {
    return { error: "Erro ao processar cálculo salarial: " + error.message };
  }
}

export async function createSalaryValeAction(
  userId: string,
  amount: number,
  description: string,
  dateStr: string
) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  const selectedUnitId = await getSelectedUnitId();
  if (!selectedUnitId) {
    return { error: "Unidade não selecionada." };
  }

  if (amount <= 0) return { error: "O valor do vale deve ser maior que zero." };
  if (!description.trim()) return { error: "O motivo do vale é obrigatório." };

  try {
    await prisma.financialTransaction.create({
      data: {
        companyId: session.companyId,
        unitId: selectedUnitId,
        userId: userId, // Tag transaction to this user/employee
        type: "SALARY_VALE",
        amount,
        description: `VALE: ${description.trim()}`,
        category: "VALE",
        transactionDate: new Date(dateStr)
      }
    });

    revalidatePath("/financeiro");
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao registrar vale: " + error.message };
  }
}

export async function updateSalaryValeAction(
  valeId: string,
  amount: number,
  description: string,
  dateStr: string
) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  if (amount <= 0) return { error: "O valor do vale deve ser maior que zero." };
  if (!description.trim()) return { error: "O motivo do vale é obrigatório." };

  try {
    const transaction = await prisma.financialTransaction.findFirst({
      where: { id: valeId, companyId: session.companyId }
    });

    if (!transaction) {
      return { error: "Vale não encontrado." };
    }

    await prisma.financialTransaction.update({
      where: { id: valeId },
      data: {
        amount,
        description: `VALE: ${description.trim()}`,
        transactionDate: new Date(dateStr)
      }
    });

    revalidatePath("/financeiro");
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao editar vale: " + error.message };
  }
}

export async function deleteSalaryValeAction(valeId: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  try {
    const transaction = await prisma.financialTransaction.findFirst({
      where: { id: valeId, companyId: session.companyId }
    });

    if (!transaction) {
      return { error: "Vale não encontrado." };
    }

    await prisma.financialTransaction.delete({
      where: { id: valeId }
    });

    revalidatePath("/financeiro");
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao excluir vale: " + error.message };
  }
}
