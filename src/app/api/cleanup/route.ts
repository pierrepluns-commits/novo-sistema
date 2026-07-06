import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const units = await prisma.unit.findMany();
    const companies = await prisma.company.findMany();
    
    // Find all stock movements of today
    const startOfToday = new Date("2026-07-06T00:00:00.000Z");
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
