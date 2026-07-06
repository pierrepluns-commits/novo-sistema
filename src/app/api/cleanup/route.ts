import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    const mkUnitId = "772cfca9-538f-4708-a907-664d52bec3e0";

    if (action === "execute") {
      let deletedStocks = 0;
      let deletedMovements = 0;

      await prisma.$transaction(async (tx) => {
        // Delete all stock records for MK Imports
        const stockDelete = await tx.stock.deleteMany({
          where: {
            unitId: mkUnitId
          }
        });
        deletedStocks = stockDelete.count;

        // Delete all stock movements for MK Imports
        const movementDelete = await tx.stockMovement.deleteMany({
          where: {
            unitId: mkUnitId
          }
        });
        deletedMovements = movementDelete.count;
      }, {
        maxWait: 15000,
        timeout: 60000
      });

      return NextResponse.json({
        success: true,
        message: `Successfully cleared MK Imports unit inventory. Deleted ${deletedStocks} stock records and ${deletedMovements} stock movements. Zionix unit remains completely untouched.`
      });
    }

    // Default view: list what is currently in MK Imports
    const stocks = await prisma.stock.findMany({
      where: {
        unitId: mkUnitId
      },
      include: {
        product: true
      }
    });

    const movements = await prisma.stockMovement.findMany({
      where: {
        unitId: mkUnitId
      },
      include: {
        product: true
      }
    });

    return NextResponse.json({
      success: true,
      mkUnitId,
      stocksCount: stocks.length,
      movementsCount: movements.length,
      stocks: stocks.map(s => ({
        productName: s.product.name,
        sku: s.product.sku,
        quantity: s.quantity
      })),
      movements: movements.map(m => ({
        productName: m.product.name,
        sku: m.product.sku,
        quantity: m.quantity,
        type: m.type,
        reason: m.reason
      }))
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || e });
  }
}
