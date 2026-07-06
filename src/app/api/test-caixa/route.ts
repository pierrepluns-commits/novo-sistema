import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const register = await prisma.cashRegister.findFirst({
      where: {
        status: "OPEN",
      },
      include: {
        user: true,
        transactions: {
          include: {
            user: true
          },
          orderBy: { createdAt: "desc" }
        },
      },
      orderBy: { openedAt: "desc" }
    });

    if (!register) {
      return NextResponse.json({ success: true, message: "No open cash register found in DB." });
    }

    const sales = await prisma.sale.findMany({
      where: {
        unitId: register.unitId,
        createdAt: {
          gte: register.openedAt,
          lte: register.closedAt || new Date()
        }
      },
      include: {
        user: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const serviceOrders = await prisma.serviceOrder.findMany({
      where: {
        unitId: register.unitId,
        status: "DELIVERED",
        updatedAt: {
          gte: register.openedAt,
          lte: register.closedAt || new Date()
        }
      },
      include: {
        client: true,
        user: true
      },
      orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json({
      success: true,
      registerId: register.id,
      salesCount: sales.length,
      serviceOrdersCount: serviceOrders.length
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message || e,
      stack: e.stack
    });
  }
}
