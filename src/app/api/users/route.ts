import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSelectedUnitId } from "@/app/actions/unit";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryUnitId = searchParams.get("unitId");
    
    // Se não vier explicitamente na URL, tenta ler a unidade ativa selecionada
    const activeUnitId = queryUnitId || (await getSelectedUnitId());

    // Se a unidade for informada, filtra por ela; caso contrário, busca todos da empresa
    const users = await prisma.user.findMany({
      where: {
        companyId: session.companyId,
        unitId: activeUnitId || undefined,
      },
      select: {
        id: true,
        name: true,
        role: true,
        unitId: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Erro ao buscar usuários da unidade:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
