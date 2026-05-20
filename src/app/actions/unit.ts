"use server";

import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";

/**
 * Retorna o ID da unidade selecionada pelo usuário atual (lido a partir do cookie ou da sessão do usuário).
 * Se o usuário for um CAIXA ou GERENTE DE UNIDADE, ele sempre retornará a unidade específica dele.
 * Para administradores da empresa, retorna a unidade selecionada no seletor do cabeçalho (ou null para "Todas").
 */
export async function getSelectedUnitId(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;

  // CASHIER e UNIT_MANAGER são restritos à sua unidade de cadastro
  if (session.role === "CASHIER" || session.role === "UNIT_MANAGER") {
    return session.unitId || null;
  }

  // Administradores podem escolher a unidade ativa
  const cookieStore = await cookies();
  const cookieUnitId = cookieStore.get("selectedUnitId")?.value;
  
  return cookieUnitId || null;
}
