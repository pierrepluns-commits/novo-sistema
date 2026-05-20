import React from "react";
import { ArrowUpRight, ArrowDownRight, RefreshCcw, AlertCircle, PackagePlus } from "lucide-react";

interface Props {
  type: string;
  reason: string;
}

export function StockBadge({ type, reason }: Props) {
  const isInput = type === "IN";

  const config: Record<string, { label: string, icon: any, color: string, bg: string }> = {
    SALE: { label: "Venda", icon: ArrowDownRight, color: "text-red-400", bg: "bg-red-500/20" },
    CANCEL: { label: "Cancelamento", icon: RefreshCcw, color: "text-emerald-400", bg: "bg-emerald-500/20" },
    TRANSFER: { label: "Transferência", icon: ArrowUpRight, color: "text-blue-400", bg: "bg-blue-500/20" },
    MANUAL_ADJUST: { label: "Ajuste Manual", icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/20" },
    KIT_ASSEMBLY: { label: "Montagem de Kit", icon: PackagePlus, color: "text-purple-400", bg: "bg-purple-500/20" },
  };

  const current = config[reason] || { label: reason, icon: isInput ? ArrowUpRight : ArrowDownRight, color: isInput ? "text-emerald-400" : "text-red-400", bg: isInput ? "bg-emerald-500/20" : "bg-red-500/20" };
  const Icon = current.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${current.bg} ${current.color} whitespace-nowrap`}>
      <Icon className="w-3 h-3" />
      {current.label}
    </span>
  );
}
