import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { prisma } from "@/lib/prisma";
import { Users, Package, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getSelectedUnitId } from "@/app/actions/unit";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || !session.companyId) {
    return <div>Não autorizado</div>;
  }

  const selectedUnitId = await getSelectedUnitId();

  // Filtros dinâmicos baseados na unidade selecionada
  const userFilter = {
    companyId: session.companyId,
    unitId: selectedUnitId || undefined
  };

  const productFilter = {
    companyId: session.companyId
  };

  const saleFilter = {
    companyId: session.companyId,
    unitId: selectedUnitId || undefined
  };

  const transactionFilter: any = {
    companyId: session.companyId
  };
  if (selectedUnitId) {
    transactionFilter.unitId = selectedUnitId;
  } else if (session.role !== "COMPANY_ADMIN") {
    transactionFilter.unitId = session.unitId || "NONE";
  }

  const [usersCount, productsCount, salesCount, transactions] = await Promise.all([
    prisma.user.count({ where: userFilter }),
    prisma.product.count({ where: productFilter }),
    prisma.sale.count({ where: saleFilter }),
    prisma.financialTransaction.findMany({ where: transactionFilter })
  ]);

  const totalIncome = transactions
    .filter(t => t.type === "INCOME")
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === "EXPENSE")
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const stats = [
    { label: "Usuários Ativos", value: usersCount, icon: Users, iconColor: "text-purple-400", bgLight: "bg-purple-500/10", borderHover: "hover:border-purple-500/50 hover:shadow-purple-500/10", href: "/usuarios" },
    { label: "Itens em Estoque", value: productsCount, icon: Package, iconColor: "text-orange-400", bgLight: "bg-orange-500/10", borderHover: "hover:border-orange-500/50 hover:shadow-orange-500/10", href: "/estoque" },
    { label: "Vendas Concluídas", value: salesCount, icon: ShoppingCart, iconColor: "text-blue-400", bgLight: "bg-blue-500/10", borderHover: "hover:border-blue-500/50 hover:shadow-blue-500/10", href: "/pdv" },
    { label: "Saldo Atual", value: `R$ ${balance.toFixed(2)}`, icon: DollarSign, iconColor: balance >= 0 ? "text-emerald-400" : "text-rose-400", bgLight: balance >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10", borderHover: balance >= 0 ? "hover:border-emerald-500/50 hover:shadow-emerald-500/10" : "hover:border-rose-500/50 hover:shadow-rose-500/10", href: "/financeiro", valueColor: balance >= 0 ? "text-emerald-400" : "text-rose-400" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Visão Geral</h1>
        <p className="text-sm md:text-base text-slate-400 font-medium">Acompanhe os principais indicadores do seu negócio hoje.</p>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Link key={i} href={stat.href}>
              <div className={`bg-[#0f172a] border border-slate-800 p-3.5 md:p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.2)] transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between gap-3 min-h-[110px] md:min-h-0 ${stat.borderHover}`}>
                <div className={`p-1.5 md:p-2.5 w-fit rounded-xl ${stat.bgLight} ${stat.iconColor}`}>
                  <Icon className="w-4.5 h-4.5 md:w-5.5 md:h-5.5 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-[10px] md:text-sm font-semibold text-slate-400 uppercase tracking-wider leading-tight">{stat.label}</p>
                  <p className={`text-base sm:text-lg md:text-3xl font-black mt-0.5 md:mt-1 truncate ${stat.valueColor || "text-white"}`}>{stat.value}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 md:mt-8 bg-gradient-to-br from-blue-900/60 to-[#0a0f1c] border border-blue-950/60 p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-xl shadow-blue-900/10 text-white flex flex-col md:flex-row items-center gap-4 md:gap-6 justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-blue-500/5 blur-[100px] pointer-events-none"></div>
        <div className="relative z-10 text-center md:text-left flex-1">
          <h2 className="text-lg md:text-2xl font-bold mb-1.5 flex items-center justify-center md:justify-start gap-2.5">
            <TrendingUp className="w-5.5 h-5.5 text-blue-400" />
            Sistema Operacional
          </h2>
          <p className="text-xs md:text-base text-blue-200/80 font-medium max-w-xl leading-relaxed">
            Seu ERP está funcionando perfeitamente. Use o menu lateral ou o menu móvel para navegar rapidamente entre os módulos.
          </p>
        </div>
        <Link href="/pdv" className="relative z-10 w-full md:w-auto flex justify-center">
          <button className="w-full md:w-auto bg-blue-600 text-white hover:bg-blue-500 font-bold py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-sm md:text-base">
            <ShoppingCart className="w-4.5 h-4.5" />
            Abrir PDV
          </button>
        </Link>
      </div>
    </div>
  );
}
