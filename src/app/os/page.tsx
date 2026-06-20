import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { 
  Plus, Search, Edit, Printer, Wrench, ClipboardList, 
  ArrowRight, DollarSign, Calendar, Clock, Contact, AlertCircle, Phone, CheckSquare
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSelectedUnitId } from "@/app/actions/unit";

interface PageProps {
  searchParams: Promise<{ query?: string; tab?: string }>;
}

const statusMap: Record<string, { label: string; bg: string; text: string; border: string }> = {
  BUDGET: { label: "Orçamento", bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  WAITING_APPROVAL: { label: "Aguardando Aprovação", bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
  WAITING_PARTS: { label: "Aguardando Peças", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  IN_PROGRESS: { label: "Em Execução", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  COMPLETED: { label: "Pronta / Testada", bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  DELIVERED: { label: "Entregue e Finalizada", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  UNREPAIRABLE: { label: "Sem Conserto", bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
};

export default async function OSPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return redirect("/login");
  }

  const selectedUnitId = await getSelectedUnitId();
  if (!selectedUnitId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-yellow-500 animate-bounce" />
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Unidade não selecionada</h3>
        <p className="text-sm text-slate-400 max-w-sm">
          Por favor, utilize o seletor no cabeçalho para selecionar a sua loja/unidade de atendimento antes de gerenciar Ordens de Serviço.
        </p>
      </div>
    );
  }

  const { query = "", tab = "all" } = await searchParams;
  const cleanQuery = query.trim().toLowerCase();

  // O.S. Status Flow filtering tabs
  let statusFilter: string[] = [];
  if (tab === "budget") {
    statusFilter = ["BUDGET", "WAITING_APPROVAL"];
  } else if (tab === "progress") {
    statusFilter = ["IN_PROGRESS", "WAITING_PARTS"];
  } else if (tab === "ready") {
    statusFilter = ["COMPLETED", "UNREPAIRABLE"];
  } else if (tab === "delivered") {
    statusFilter = ["DELIVERED"];
  }

  // Build filter where clause
  let whereClause: any = {
    companyId: session.companyId,
    unitId: selectedUnitId,
  };

  if (statusFilter.length > 0) {
    whereClause.status = { in: statusFilter };
  }

  if (cleanQuery) {
    // Try to see if search is a direct OS Number (e.g. if it is a number)
    const osNumberSearch = parseInt(cleanQuery.replace(/\D/g, ""), 10);
    const orFilters: any[] = [
      { client: { name: { contains: cleanQuery } } },
      { client: { phone: { contains: cleanQuery } } },
      { equipmentBrand: { contains: cleanQuery } },
      { equipmentModel: { contains: cleanQuery } },
      { equipmentSerial: { contains: cleanQuery } },
      { reportedDefect: { contains: cleanQuery } },
    ];

    if (!isNaN(osNumberSearch)) {
      orFilters.push({ osNumber: osNumberSearch });
    }

    whereClause.OR = orFilters;
  }

  const osList = await prisma.serviceOrder.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      client: true,
      user: true,
    },
  });

  // Count items for sub-badges
  const countStats = await prisma.serviceOrder.groupBy({
    by: ["status"],
    where: {
      companyId: session.companyId,
      unitId: selectedUnitId,
    },
    _count: {
      id: true,
    },
  });

  const getStatsCount = (statuses: string[]) => {
    return countStats
      .filter((s) => statuses.includes(s.status))
      .reduce((sum, item) => sum + item._count.id, 0);
  };

  const totalCount = countStats.reduce((sum, item) => sum + item._count.id, 0);
  const budgetCount = getStatsCount(["BUDGET", "WAITING_APPROVAL"]);
  const progressCount = getStatsCount(["IN_PROGRESS", "WAITING_PARTS"]);
  const readyCount = getStatsCount(["COMPLETED", "UNREPAIRABLE"]);
  const deliveredCount = getStatsCount(["DELIVERED"]);

  const tabs = [
    { id: "all", label: "Todas", count: totalCount },
    { id: "budget", label: "Orçamentos", count: budgetCount },
    { id: "progress", label: "Em Execução", count: progressCount },
    { id: "ready", label: "Prontas / Sem Conserto", count: readyCount },
    { id: "delivered", label: "Entregues", count: deliveredCount },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader title="Gerenciamento de Ordens de Serviço" showBack={false} />
        
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/os?tab=ready">
            <Button 
              className="bg-emerald-650 hover:bg-emerald-600 text-white font-bold px-6 py-2.5 shadow-lg shadow-emerald-500/15 rounded-xl border-none"
              icon={CheckSquare}
            >
              Encerrar O.S. (Prontas)
            </Button>
          </Link>
          <Link href="/os/novo">
            <Button 
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold px-6 py-2.5 shadow-lg shadow-indigo-500/20 rounded-xl"
              icon={Plus}
            >
              Abrir Nova O.S. (Triagem)
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-px">
        {tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <Link
              key={t.id}
              href={`/os?tab=${t.id}${query ? `&query=${query}` : ""}`}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 border-b-2 rounded-t-xl -mb-[2px] ${
                isActive 
                  ? "border-indigo-500 text-indigo-400 bg-indigo-500/5 font-extrabold" 
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
              }`}
            >
              <span>{t.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isActive 
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20" 
                  : "bg-slate-800 text-slate-500 border border-slate-700/50"
              }`}>
                {t.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Search Input */}
      <form method="GET" action="/os" className="flex gap-2 max-w-lg">
        <input type="hidden" name="tab" value={tab} />
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text"
            name="query"
            defaultValue={query}
            placeholder="Nº O.S., cliente, celular, marca, modelo, defeito..."
            className="w-full bg-[#090e1a]/80 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
        <Button type="submit" variant="secondary" className="px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0f172a] text-slate-300 hover:text-white">
          Buscar
        </Button>
      </form>

      {/* OS Table Board / Cards */}
      <div className="bg-[#090e1a] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        {/* Desktop Table View */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#030712] border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Nº O.S.</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Aparelho / Equipamento</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Valor Total</th>
                <th className="px-6 py-4">Sinal / Restante</th>
                <th className="px-6 py-4">Garantia</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {osList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ClipboardList className="w-8 h-8 text-slate-700 animate-pulse" />
                      <p className="font-semibold text-slate-400 text-sm">Nenhuma O.S. encontrada</p>
                      <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                        Não encontramos registros correspondentes à busca ou aos filtros aplicados nesta unidade.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                osList.map((os) => {
                  const badge = statusMap[os.status] || { label: os.status, bg: "bg-slate-800", text: "text-slate-400", border: "border-slate-700" };
                  const remainder = Math.max(0, os.totalAmount - os.prepayment);
                  
                  let warrantyBadge = "-";
                  if (os.status === "DELIVERED" && os.warrantyPeriod > 0) {
                    if (os.warrantyStatus === "ACTIVE") {
                      if (os.warrantyExpiresAt && new Date(os.warrantyExpiresAt) < new Date()) {
                        warrantyBadge = "Expirada";
                      } else {
                        warrantyBadge = `Ativa (${os.warrantyPeriod}d)`;
                      }
                    } else if (os.warrantyStatus === "VOIDED") {
                      warrantyBadge = "Sem Garantia / Anulada";
                    }
                  } else if (os.warrantyPeriod > 0) {
                    warrantyBadge = `Pendente (${os.warrantyPeriod}d)`;
                  }

                  return (
                    <tr key={os.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4 align-middle">
                        <Link href={`/os/editar/${os.id}`}>
                          <span className="font-mono font-bold text-white bg-[#111827] border border-slate-800 px-2.5 py-1.5 rounded-lg group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all shadow-inner">
                            #{String(os.osNumber).padStart(4, "0")}
                          </span>
                        </Link>
                      </td>
                      
                      <td className="px-6 py-4 align-middle">
                        <div className="font-bold text-white leading-snug">{os.client.name}</div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                          <Contact className="w-3 h-3 shrink-0" />
                          <span>{os.client.phone}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 align-middle">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{os.equipmentBrand} {os.equipmentModel}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium truncate max-w-[200px]">
                          {os.equipmentType} {os.equipmentColor ? `| ${os.equipmentColor}` : ""} {os.equipmentSerial ? `| S/N: ${os.equipmentSerial}` : ""}
                        </div>
                      </td>

                      <td className="px-6 py-4 align-middle">
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold border rounded-md ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 align-middle text-white font-extrabold text-sm">
                        R$ {os.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-6 py-4 align-middle">
                        {os.prepayment > 0 ? (
                          <div className="space-y-0.5 text-xs">
                            <div className="text-[10px] text-emerald-400 font-bold">
                              Sinal: R$ {os.prepayment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-white font-extrabold">
                              Restam: R$ {remainder.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 align-middle">
                        {os.warrantyPeriod > 0 ? (
                          <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded border ${
                            os.warrantyStatus === "ACTIVE" 
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                              : "bg-slate-800 text-slate-500 border-slate-700/50"
                          }`}>
                            {warrantyBadge}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/os/imprimir/${os.id}`}>
                            <button 
                              title="Imprimir Via"
                              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-700/80 transition-all active:scale-95 cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </Link>
                          <Link href={`/os/editar/${os.id}`}>
                            <button 
                              title="Ver / Editar Detalhes"
                              className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all active:scale-95 cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </Link>
                          {os.status !== "DELIVERED" && (
                            <Link href={`/os/editar/${os.id}?tab=billing`}>
                              <button 
                                title="Encerrar / Faturar O.S."
                                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                              >
                                <CheckSquare className="w-4 h-4" />
                              </button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-slate-800/30">
          {osList.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <div className="flex flex-col items-center justify-center space-y-2">
                <ClipboardList className="w-8 h-8 text-slate-700 animate-pulse" />
                <p className="font-semibold text-slate-400 text-sm">Nenhuma O.S. encontrada</p>
              </div>
            </div>
          ) : (
            osList.map((os) => {
              const badge = statusMap[os.status] || { label: os.status, bg: "bg-slate-800", text: "text-slate-400", border: "border-slate-700" };
              const remainder = Math.max(0, os.totalAmount - os.prepayment);
              
              let warrantyBadge = "-";
              if (os.status === "DELIVERED" && os.warrantyPeriod > 0) {
                if (os.warrantyStatus === "ACTIVE") {
                  if (os.warrantyExpiresAt && new Date(os.warrantyExpiresAt) < new Date()) {
                    warrantyBadge = "Expirada";
                  } else {
                    warrantyBadge = `Ativa (${os.warrantyPeriod}d)`;
                  }
                } else if (os.warrantyStatus === "VOIDED") {
                  warrantyBadge = "Sem Garantia";
                }
              } else if (os.warrantyPeriod > 0) {
                warrantyBadge = `Pendente (${os.warrantyPeriod}d)`;
              }

              return (
                <div key={os.id} className="p-4 space-y-3.5 hover:bg-slate-800/10 transition-colors">
                  <div className="flex justify-between items-start">
                    <Link href={`/os/editar/${os.id}`}>
                      <span className="font-mono font-bold text-white bg-[#111827] border border-slate-800 px-2 py-1 rounded-lg text-xs hover:text-indigo-400 hover:border-indigo-500/30 transition-all shadow-inner">
                        #{String(os.osNumber).padStart(4, "0")}
                      </span>
                    </Link>
                    <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold border rounded-md ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{os.equipmentBrand} {os.equipmentModel}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {os.equipmentType} {os.equipmentColor ? `| ${os.equipmentColor}` : ""}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-900/40 pt-2.5">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Cliente</span>
                      <span className="font-bold text-slate-200 block truncate max-w-[120px]">{os.client.name}</span>
                      <a 
                        href={`https://wa.me/55${os.client.phone.replace(/\D/g, "")}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:underline font-bold"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{os.client.phone}</span>
                      </a>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Financeiro</span>
                      <span className="font-extrabold text-white block">R$ {os.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      {os.prepayment > 0 ? (
                        <span className="text-[9px] text-emerald-400 font-bold block">Sinal: R$ {os.prepayment.toFixed(2)}</span>
                      ) : (
                        <span className="text-[9px] text-slate-500 block">Sem sinal</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-800/40">
                    <div>
                      {os.warrantyPeriod > 0 && warrantyBadge !== "-" && (
                        <span className={`inline-flex px-1.5 py-0.5 text-[8px] font-black rounded border ${
                          os.warrantyStatus === "ACTIVE" 
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                            : "bg-slate-800 text-slate-500 border-slate-700/50"
                        }`}>
                          Garantia: {warrantyBadge}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/os/imprimir/${os.id}`}>
                        <button className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer">
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimir</span>
                        </button>
                      </Link>
                      <Link href={`/os/editar/${os.id}`}>
                        <button className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 text-xs font-bold transition-all active:scale-95 cursor-pointer">
                          <Edit className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      </Link>
                      {os.status !== "DELIVERED" && (
                        <Link href={`/os/editar/${os.id}?tab=billing`}>
                          <button className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-bold transition-all active:scale-95 cursor-pointer">
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Encerrar</span>
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
