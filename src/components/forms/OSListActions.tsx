"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2, Loader2 } from "lucide-react";
import { reopenServiceOrderAction, deleteServiceOrderAction } from "@/app/actions/os";

interface OSListActionsProps {
  osId: string;
  osNumber: number;
  status: string;
  equipmentBrand: string;
  equipmentModel: string;
  currentUserRole?: string;
  currentUserPermissions?: string[];
}

export default function OSListActions({
  osId,
  osNumber,
  status,
  equipmentBrand,
  equipmentModel,
  currentUserRole,
  currentUserPermissions = [],
}: OSListActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const canDelete =
    currentUserRole === "SUPER_ADMIN" ||
    currentUserRole === "COMPANY_ADMIN" ||
    currentUserPermissions.includes("DELETE_OS") ||
    currentUserPermissions.includes("ALL");

  const handleReopen = async () => {
    if (
      !confirm(
        `Tem certeza que deseja reabrir a O.S. #${String(osNumber).padStart(4, "0")} (${equipmentBrand} ${equipmentModel})? Os lançamentos de faturamento no caixa e as baixas de estoque correspondentes serão estornados/excluídos.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await reopenServiceOrderAction(osId);
      if (res.error) {
        alert(res.error);
      } else {
        alert("Ordem de Serviço reaberta com sucesso!");
        router.refresh();
      }
    });
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `ATENÇÃO: Deseja EXCLUIR DEFINITIVAMENTE a O.S. #${String(osNumber).padStart(4, "0")} (${equipmentBrand} ${equipmentModel})? Todos os lançamentos financeiros vinculados e baixas de estoque correspondentes serão apagados permanentemente.`
      )
    ) {
      return;
    }

    const pwd = prompt("Para confirmar a exclusão definitiva, digite 'EXCLUIR':");
    if (pwd !== "EXCLUIR") {
      alert("Confirmação incorreta. Operação cancelada.");
      return;
    }

    startTransition(async () => {
      const res = await deleteServiceOrderAction(osId);
      if (res.error) {
        alert(res.error);
      } else {
        alert("Ordem de Serviço excluída definitivamente!");
        router.refresh();
      }
    });
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-2 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Reopen quick action */}
      {status === "DELIVERED" && (
        <button
          onClick={handleReopen}
          title="Reabrir O.S. (Estornar faturamento/estoque)"
          className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all active:scale-95 cursor-pointer font-bold"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}

      {/* Delete quick action */}
      {canDelete && (
        <button
          onClick={handleDelete}
          title="Excluir O.S. Definitivamente"
          className="p-2 rounded-lg bg-rose-500/10 text-rose-450 hover:bg-rose-500/20 border border-rose-500/20 transition-all active:scale-95 cursor-pointer font-bold"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
