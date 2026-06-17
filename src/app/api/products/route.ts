import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSelectedUnitId } from "@/app/actions/unit";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const activeUnitId = await getSelectedUnitId();

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
            unitId: activeUnitId || undefined 
          }
        }
      }
    });

    const formatted = products.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      price: p.price,
      cost: p.cost,
      quantity: p.stocks.length > 0 ? p.stocks[0].quantity : 0
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
