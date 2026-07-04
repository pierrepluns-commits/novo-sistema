"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSelectedUnitId } from "@/app/actions/unit";

export async function calculateSalaryPayrollAction(
  userId: string,
  startDateStr: string,
  endDateStr: string
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

    // 1. Fetch finished Service Orders in this unit & period
    const osList = await prisma.serviceOrder.findMany({
      where: {
        companyId: session.companyId,
        unitId: selectedUnitId,
        status: "DELIVERED",
        updatedAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        user: true
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
        commission: os.cost || 0
      };
    });

    const totalOSCommissions = formattedOSList.reduce((sum, item) => sum + item.commission, 0);

    // 2. Fetch completed Sales made by the user in this unit & period
    const sales = await prisma.sale.findMany({
      where: {
        companyId: session.companyId,
        unitId: selectedUnitId,
        userId: user.id,
        status: "COMPLETED",
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
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
        // Calculate 2% commission on physical/retail items sold in PDV (excluding custom OS parts)
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
            commission
          });
        }
      });
    });

    const totalAccessoryCommissions = formattedSalesList.reduce((sum, item) => sum + item.commission, 0);

    return {
      success: true,
      employeeName: user.name,
      osList: formattedOSList,
      totalOSCommissions,
      salesList: formattedSalesList,
      totalAccessoryCommissions
    };
  } catch (error: any) {
    return { error: "Erro ao processar cálculo salarial: " + error.message };
  }
}
