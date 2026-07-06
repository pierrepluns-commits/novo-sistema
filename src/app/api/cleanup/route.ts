import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const mkUnitId = "772cfca9-538f-4708-a907-664d52bec3e0";

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
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      success: true,
      stocks: stocks.map(s => ({
        productName: s.product.name,
        sku: s.product.sku,
        quantity: s.quantity,
        updatedAt: s.updatedAt
      })),
      movements: movements.map(m => ({
        productName: m.product.name,
        sku: m.product.sku,
        quantity: m.quantity,
        type: m.type,
        reason: m.reason,
        referenceId: m.referenceId,
        createdAt: m.createdAt
      }))
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || e });
  }
}
