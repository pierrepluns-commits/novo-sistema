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
        },
        // Only fetch products with a stock record in the selected unit
        stocks: activeUnitId ? {
          some: {
            unitId: activeUnitId
          }
        } : undefined
      },
      include: {
        stocks: {
          where: {
            unitId: activeUnitId || undefined 
          }
        },
        kitItems: {
          include: {
            component: {
              include: {
                stocks: {
                  where: {
                    unitId: activeUnitId || undefined
                  }
                }
              }
            }
          }
        }
      }
    });

    const formatted = products.map(p => {
      let qty = 0;
      if (p.isKit) {
        if (p.kitItems.length === 0) {
          qty = 0;
        } else {
          // A quantidade virtual de um kit é o menor estoque de seus componentes / quantidade do componente no kit
          const componentQuantities = p.kitItems.map(bundle => {
            const compStock = bundle.component.stocks.length > 0 ? bundle.component.stocks[0].quantity : 0;
            return Math.floor(compStock / bundle.quantity);
          });
          qty = Math.min(...componentQuantities);
        }
      } else {
        qty = p.stocks.length > 0 ? p.stocks[0].quantity : 0;
      }

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        price: p.price,
        cost: p.cost,
        isKit: p.isKit,
        quantity: qty
      };
    });

    // Apenas retornar produtos com estoque disponível
    const filtered = formatted.filter(p => p.quantity > 0);

    return NextResponse.json(filtered);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
