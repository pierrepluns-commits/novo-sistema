import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    const startOfToday = new Date("2026-07-06T00:00:00.000Z");
    
    if (action === "execute") {
      let updatedCount = 0;
      await prisma.$transaction(async (tx) => {
        const movements = await tx.stockMovement.findMany({
          where: {
            unitId: "772cfca9-538f-4708-a907-664d52bec3e0",
            referenceId: "IMPORT_CSV",
            createdAt: {
              gte: startOfToday
            }
          }
        });

        for (const m of movements) {
          const stock = await tx.stock.findUnique({
            where: {
              productId_unitId: {
                productId: m.productId,
                unitId: m.unitId
              }
            }
          });

          if (stock) {
            const newQty = Math.max(0, stock.quantity - m.quantity);
            await tx.stock.update({
              where: { id: stock.id },
              data: { quantity: newQty }
            });
            updatedCount++;
          }
        }

        // Delete the movements
        await tx.stockMovement.deleteMany({
          where: {
            unitId: "772cfca9-538f-4708-a907-664d52bec3e0",
            referenceId: "IMPORT_CSV",
            createdAt: {
              gte: startOfToday
            }
          }
        });
      }, {
        maxWait: 15000,
        timeout: 60000
      });

      return NextResponse.json({
        success: true,
        message: `Successfully reversed import for MK Imports. Reset stock for ${updatedCount} products.`
      });
    }

    const units = await prisma.unit.findMany();
    const companies = await prisma.company.findMany();
    
    const movements = await prisma.stockMovement.findMany({
      where: {
        createdAt: {
          gte: startOfToday
        }
      },
      include: {
        product: true,
        unit: true
      }
    });

    return NextResponse.json({
      success: true,
      databaseUrl: process.env.DATABASE_URL ? "present" : "missing",
      companies: companies.map(c => ({ id: c.id, name: c.name })),
      units: units.map(u => ({ id: u.id, name: u.name, companyId: u.companyId })),
      movements: movements.map(m => ({
        id: m.id,
        time: m.createdAt,
        unitName: m.unit.name,
        unitId: m.unitId,
        productName: m.product.name,
        sku: m.product.sku,
        quantity: m.quantity,
        reason: m.reason,
        referenceId: m.referenceId
      }))
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || e });
  }
}
