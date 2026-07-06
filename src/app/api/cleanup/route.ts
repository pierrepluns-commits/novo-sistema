import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const stocks = await prisma.stock.findMany({
      where: {
        unitId: "772cfca9-538f-4708-a907-664d52bec3e0"
      },
      include: {
        product: true
      }
    });

    return NextResponse.json({
      success: true,
      stocks: stocks.map(s => ({
        productName: s.product.name,
        sku: s.product.sku,
        quantity: s.quantity
      }))
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || e });
  }
}
