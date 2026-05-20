import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { 
  TrendingUp, TrendingDown, DollarSign, FileText, Users, ShoppingBag, 
  Calendar, ArrowUpRight, ArrowDownRight, Award, Percent, ChevronRight, Trash2
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSelectedUnitId } from "@/app/actions/unit";
import { deleteTransaction } from "@/app/actions/finance";
import { EditSaleModal } from "@/components/forms/CaixaClientForms";

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    periodo?: string;
    startDate?: string;
    endDate?: string;
    sellerId?: string;
    type?: string;
    mesA?: string;
    anoA?: string;
    mesB?: string;
    anoB?: string;
    payment?: string;
    category?: string;
  }>;
}

export default async function FinanceiroPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return <div>Não autorizado</div>;
  }

  // Ação de servidor no nível do componente (evita o erro de definição dentro de loops)
  async function handleDeleteTransaction(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (id) {
      await deleteTransaction(id);
    }
  }

  const params = await searchParams;
  const activeTab = params.tab || "dashboard";
  const periodo = params.periodo || "mes";
  const startDateStr = params.startDate || "";
  const endDateStr = params.endDate || "";
  const sellerId = params.sellerId || "";
  const typeFilter = params.type || "all";
  const paymentFilter = params.payment || "all";
  const categoryFilter = params.category || "all";

  const now = new Date();

  // ==========================================
  // CONFIGURAÇÃO DOS SELETORES DO COMPARATIVO
  // ==========================================
  const meses = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" }
  ];

  const mesA = params.mesA ? parseInt(params.mesA) : now.getMonth() + 1;
  const anoA = params.anoA ? parseInt(params.anoA) : now.getFullYear();
  const startA = new Date(anoA, mesA - 1, 1, 0, 0, 0);
  const endA = new Date(anoA, mesA, 0, 23, 59, 59);

  const mesB = params.mesB ? parseInt(params.mesB) : (now.getMonth() === 0 ? 12 : now.getMonth());
  const anoB = params.anoB ? parseInt(params.anoB) : (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  const startB = new Date(anoB, mesB - 1, 1, 0, 0, 0);
  const endB = new Date(anoB, mesB, 0, 23, 59, 59);

  // Calcular limites de data normais para o Dashboard geral
  let start = new Date();
  let end = new Date();

  if (periodo === "hoje") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (periodo === "7dias") {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    end = now;
  } else if (periodo === "mes") {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (periodo === "ano") {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  } else if (periodo === "personalizado" && startDateStr && endDateStr) {
    start = new Date(startDateStr + "T00:00:00");
    end = new Date(endDateStr + "T23:59:59");
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  const selectedUnitId = await getSelectedUnitId();

  // Filtragem básica por empresa e unidade ativa
  let baseWhere: any = { companyId: session.companyId };
  if (selectedUnitId) {
    baseWhere.unitId = selectedUnitId;
  } else if (session.role !== 'COMPANY_ADMIN') {
    baseWhere.unitId = session.unitId || "NONE";
  }

  // Buscar dados em paralelo para otimização de velocidade
  const [
    transactions, sales, allUsers, allStocks,
    txsA, salesA, txsB, salesB
  ] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: {
        ...baseWhere,
        transactionDate: { gte: start, lte: end }
      },
      include: { user: true, unit: true },
      orderBy: { transactionDate: "desc" }
    }),
    prisma.sale.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: start, lte: end },
        status: "COMPLETED"
      },
      include: { 
        user: true, 
        unit: true,
        items: { include: { product: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.user.findMany({
      where: { companyId: session.companyId }
    }),
    prisma.stock.findMany({
      where: selectedUnitId ? { unitId: selectedUnitId } : { unit: { companyId: session.companyId } },
      include: { product: true }
    }),
    // Dados do Mês A
    prisma.financialTransaction.findMany({
      where: {
        ...baseWhere,
        transactionDate: { gte: startA, lte: endA }
      }
    }),
    prisma.sale.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: startA, lte: endA },
        status: "COMPLETED"
      },
      include: {
        items: { include: { product: true } }
      }
    }),
    // Dados do Mês B
    prisma.financialTransaction.findMany({
      where: {
        ...baseWhere,
        transactionDate: { gte: startB, lte: endB }
      }
    }),
    prisma.sale.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: startB, lte: endB },
        status: "COMPLETED"
      },
      include: {
        items: { include: { product: true } }
      }
    })
  ]);

  // ==========================================
  // CÁLCULOS FINANCEIROS TOTAIS (MÊS SELECIONADO ATUAL)
  // ==========================================
  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);

  // Total de Despesas Gerais (Sem CMV para evitar duplicar custo)
  const totalExpense = transactions
    .filter(t => t.type === "EXPENSE" && t.category !== "Custo de Produtos")
    .reduce((acc, t) => acc + t.amount, 0);

  // Custo das Mercadorias Vendidas (CMV)
  let totalCMV = 0;
  for (const sale of sales) {
    for (const item of sale.items) {
      const cost = item.unitCost || item.product?.cost || 0;
      totalCMV += item.quantity * cost;
    }
  }

  const totalStockCost = allStocks.reduce((sum, s) => sum + s.quantity * (s.product?.cost || 0), 0);
  const netProfit = totalRevenue - totalCMV - totalExpense;

  // ==========================================
  // CÁLCULOS DETALHADOS COMPARATIVOS: MÊS A e MÊS B
  // ==========================================
  const calcMonthData = (monthSales: any[], monthTxs: any[]) => {
    const revenue = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);
    
    // Taxas de Cartão cobradas (Salvas em EXPENSE categoria "Taxas e Tarifas")
    const cardFees = monthTxs
      .filter(t => t.type === "EXPENSE" && t.category === "Taxas e Tarifas")
      .reduce((acc, t) => acc + t.amount, 0);

    // Despesas Gerais Operacionais (Luz, Aluguel, etc.)
    const generalExpenses = monthTxs
      .filter(t => t.type === "EXPENSE" && t.category !== "Custo de Produtos" && t.category !== "Taxas e Tarifas")
      .reduce((acc, t) => acc + t.amount, 0);

    let cmv = 0;
    let qtyItems = 0;
    let phonesQty = 0;
    let phonesRevenue = 0;
    let accessoriesQty = 0;
    let accessoriesRevenue = 0;

    for (const sale of monthSales) {
      for (const item of sale.items) {
        qtyItems += item.quantity;
        const cost = item.unitCost || item.product?.cost || 0;
        cmv += item.quantity * cost;

        if (item.product) {
          const isPh = isPhone(item.product.name);
          if (isPh) {
            phonesQty += item.quantity;
            phonesRevenue += item.quantity * item.unitPrice;
          } else {
            accessoriesQty += item.quantity;
            accessoriesRevenue += item.quantity * item.unitPrice;
          }
        }
      }
    }

    const netProfit = revenue - cmv - cardFees - generalExpenses;

    return {
      revenue,
      cardFees,
      generalExpenses,
      cmv,
      netProfit,
      qtyItems,
      phonesQty,
      phonesRevenue,
      accessoriesQty,
      accessoriesRevenue
    };
  };

  const isPhone = (name: string) => {
    const n = name.toLowerCase();
    return n.includes("celular") || n.includes("telefone") || n.includes("aparelho") ||
           n.includes("iphone") || n.includes("samsung") || n.includes("xiaomi") ||
           n.includes("motorola") || n.includes("redmi") || n.includes("smartphone");
  };

  const dataA = calcMonthData(salesA, txsA);
  const dataB = calcMonthData(salesB, txsB);

  // Vendas por Funcionário (Ranking com detalhamento de itens)
  const sellerStats = allUsers
    .map(user => {
      const userSales = sales.filter(s => s.userId === user.id);
      const amount = userSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const count = userSales.length;

      // Agrupar e somar os produtos vendidos por este funcionário
      const itemGroup: Record<string, { name: string; sku: string; qty: number; rev: number }> = {};
      for (const sale of userSales) {
        for (const item of sale.items) {
          if (!item.product) continue;
          const pid = item.productId;
          if (!itemGroup[pid]) {
            itemGroup[pid] = {
              name: item.product.name,
              sku: item.product.sku,
              qty: 0,
              rev: 0
            };
          }
          itemGroup[pid].qty += item.quantity;
          itemGroup[pid].rev += item.quantity * item.unitPrice;
        }
      }
      const detailedItems = Object.values(itemGroup).sort((a, b) => b.qty - a.qty);

      return { user, amount, count, detailedItems };
    })
    .sort((a, b) => b.amount - a.amount);

  // Lógica dos Gráficos Gerais
  let phonesQty = 0;
  let phonesRevenue = 0;
  let accessoriesQty = 0;
  let accessoriesRevenue = 0;

  for (const sale of sales) {
    for (const item of sale.items) {
      if (!item.product) continue;
      const isPh = isPhone(item.product.name);
      if (isPh) {
        phonesQty += item.quantity;
        phonesRevenue += item.quantity * item.unitPrice;
      } else {
        accessoriesQty += item.quantity;
        accessoriesRevenue += item.quantity * item.unitPrice;
      }
    }
  }

  // Filtragem dinâmica do Extrato
  let filteredTransactions = transactions;
  if (sellerId) {
    filteredTransactions = transactions.filter(t => t.userId === sellerId);
  }
  if (typeFilter === "income") {
    filteredTransactions = filteredTransactions.filter(t => t.type === "INCOME");
  } else if (typeFilter === "expense") {
    filteredTransactions = filteredTransactions.filter(t => t.type === "EXPENSE");
  }

  // Filtrar por Método de Pagamento
  if (paymentFilter !== "all") {
    filteredTransactions = filteredTransactions.filter(t => {
      const desc = t.description.toUpperCase();
      if (paymentFilter === "CASH") {
        return desc.includes("CASH") || desc.includes("DINHEIRO") || t.category === "Entrada Manual";
      }
      if (paymentFilter === "PIX") {
        return desc.includes("PIX");
      }
      if (paymentFilter === "CREDIT_CARD") {
        return desc.includes("CREDIT") || desc.includes("CREDITO") || desc.includes("CRÉDITO");
      }
      if (paymentFilter === "DEBIT_CARD") {
        return desc.includes("DEBIT") || desc.includes("DEBITO") || desc.includes("DÉBITO");
      }
      return true;
    });
  }

  // Filtrar por Categoria de Transação
  if (categoryFilter !== "all") {
    filteredTransactions = filteredTransactions.filter(t => t.category === categoryFilter);
  }

  // Totais Consolidados do Período Filtrado
  const periodIn = filteredTransactions.filter(t => t.type === "INCOME").reduce((acc, t) => acc + t.amount, 0);
  const periodOut = filteredTransactions.filter(t => t.type === "EXPENSE").reduce((acc, t) => acc + t.amount, 0);
  const periodNet = periodIn - periodOut;

  // Agrupar transações filtradas por dia para exibição
  const groupedTransactions: Record<string, typeof filteredTransactions> = {};
  for (const t of filteredTransactions) {
    const dateStr = new Date(t.transactionDate).toLocaleDateString('pt-BR');
    if (!groupedTransactions[dateStr]) {
      groupedTransactions[dateStr] = [];
    }
    groupedTransactions[dateStr].push(t);
  }

  const sortedDays = Object.keys(groupedTransactions).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split("/").map(Number);
    const [dayB, monthB, yearB] = b.split("/").map(Number);
    const dateA = new Date(yearA, monthA - 1, dayA).getTime();
    const dateB = new Date(yearB, monthB - 1, dayB).getTime();
    return dateB - dateA; // Ordenação decrescente (mais recente primeiro)
  });

  // Obter Rankings de Produtos para o Comparativo em baixo
  const getProductRankings = (salesList: any[]) => {
    const perf: Record<string, { name: string; sku: string; qty: number; rev: number }> = {};
    for (const sale of salesList) {
      for (const item of sale.items) {
        if (!item.product) continue;
        const pid = item.productId;
        if (!perf[pid]) {
          perf[pid] = {
            name: item.product.name,
            sku: item.product.sku,
            qty: 0,
            rev: 0
          };
        }
        perf[pid].qty += item.quantity;
        perf[pid].rev += item.quantity * item.unitPrice;
      }
    }
    return Object.values(perf).sort((a, b) => b.qty - a.qty).slice(0, 5);
  };

  const rankingsA = getProductRankings(salesA);
  const rankingsB = getProductRankings(salesB);

  // Rankings de Produtos aba padrão
  const productPerformance: Record<string, { product: any; quantity: number; revenue: number; profit: number }> = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      if (!item.product) continue;
      const pid = item.productId;
      if (!productPerformance[pid]) {
        productPerformance[pid] = {
          product: item.product,
          quantity: 0,
          revenue: 0,
          profit: 0
        };
      }
      productPerformance[pid].quantity += item.quantity;
      productPerformance[pid].revenue += item.quantity * item.unitPrice;
      const cost = item.unitCost || item.product.cost || 0;
      productPerformance[pid].profit += item.quantity * (item.unitPrice - cost);
    }
  }

  const topSoldProducts = Object.values(productPerformance)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const topProfitableProducts = Object.values(productPerformance)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  // Estilos de aba ativa
  const tabClass = (tabName: string) => `px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
    activeTab === tabName 
      ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20" 
      : "bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-white"
  }`;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title="Painel Financeiro Avançado" 
        showBack={false}
      />
      
      {/* ==========================================
          BARRA DE FILTROS DE DATA (DASHBOARD)
          ========================================== */}
      {activeTab !== "comparativo" && (
        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl shadow-md animate-in fade-in duration-200">
          <form method="GET" action="/financeiro" className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <input type="hidden" name="tab" value={activeTab} />
            
            <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
              <span className="text-slate-400 font-semibold text-xs flex items-center gap-1 mr-2">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Período:
              </span>
              <Link href={`/financeiro?tab=${activeTab}&periodo=hoje`} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periodo === "hoje" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700"}`}>Hoje</Link>
              <Link href={`/financeiro?tab=${activeTab}&periodo=7dias`} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periodo === "7dias" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700"}`}>Últimos 7 dias</Link>
              <Link href={`/financeiro?tab=${activeTab}&periodo=mes`} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periodo === "mes" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700"}`}>Mês Atual</Link>
              <Link href={`/financeiro?tab=${activeTab}&periodo=ano`} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periodo === "ano" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700"}`}>Ano Atual</Link>
              <Link href={`/financeiro?tab=${activeTab}&periodo=personalizado&startDate=${startDateStr}&endDate=${endDateStr}`} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periodo === "personalizado" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700"}`}>Personalizado</Link>
            </div>

            {periodo === "personalizado" && (
              <div className="flex gap-2 items-center w-full lg:w-auto mt-2 lg:mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <input 
                  type="date" 
                  name="startDate"
                  defaultValue={startDateStr}
                  required
                  className="bg-[#0a0f1c] border border-slate-700 rounded-lg text-xs px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" 
                />
                <span className="text-slate-500 text-xs font-bold">até</span>
                <input 
                  type="date" 
                  name="endDate"
                  defaultValue={endDateStr}
                  required
                  className="bg-[#0a0f1c] border border-slate-700 rounded-lg text-xs px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500" 
                />
                <Button type="submit" size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-1.5 px-4 rounded-lg text-xs">Filtrar</Button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ==========================================
          BARRA DE NAVEGAÇÃO DE ABAS (TABS)
          ========================================== */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800/80 pb-3">
        <Link href={`/financeiro?tab=dashboard&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}`} className={tabClass("dashboard")}>
          <DollarSign className="w-4.5 h-4.5" />
          Dashboard & Lucro
        </Link>
        <Link href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}`} className={tabClass("extrato")}>
          <FileText className="w-4.5 h-4.5" />
          Extrato de Movimentações
        </Link>
        <Link href={`/financeiro?tab=graficos&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}`} className={tabClass("graficos")}>
          <TrendingUp className="w-4.5 h-4.5" />
          Gráficos de Vendas
        </Link>
        <Link href={`/financeiro?tab=comparativo&mesA=${mesA}&anoA=${anoA}&mesB=${mesB}&anoB=${anoB}`} className={tabClass("comparativo")}>
          <Percent className="w-4.5 h-4.5" />
          Comparativo Mensal
        </Link>
        <Link href={`/financeiro?tab=vendedores&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}`} className={tabClass("vendedores")}>
          <Users className="w-4.5 h-4.5" />
          Vendas por Funcionário
        </Link>
        <Link href={`/financeiro?tab=rankings&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}`} className={tabClass("rankings")}>
          <Award className="w-4.5 h-4.5" />
          Rankings de Produtos
        </Link>
      </div>

      {/* ==========================================
          TELA 1: DASHBOARD FINANCEIRO & CMV
          ========================================== */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-md flex flex-col justify-between h-36">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <h3 className="text-slate-400 font-semibold text-sm">Faturamento Bruto</h3>
              </div>
              <p className="text-3xl font-black text-emerald-400">R$ {totalRevenue.toFixed(2)}</p>
            </div>
            
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-md flex flex-col justify-between h-36">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <h3 className="text-slate-400 font-semibold text-sm">Despesas e Taxas</h3>
              </div>
              <p className="text-3xl font-black text-rose-400">R$ {totalExpense.toFixed(2)}</p>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-md flex flex-col justify-between h-36">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="text-slate-400 font-semibold text-sm">Custo Mercadoria Vendida (CMV)</h3>
              </div>
              <p className="text-3xl font-black text-amber-400">R$ {totalCMV.toFixed(2)}</p>
            </div>

            <div className={`bg-[#0f172a] border p-6 rounded-2xl shadow-md flex flex-col justify-between h-36 ${netProfit >= 0 ? "border-emerald-500/20" : "border-rose-500/20"}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${netProfit >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <h3 className="text-slate-400 font-semibold text-sm">Lucro Líquido / Real</h3>
              </div>
              <p className={`text-3xl font-black ${netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                R$ {netProfit.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Demonstração de Resultado */}
            <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Demonstração de Resultado Simplificada</h3>
                <p className="text-slate-400 text-xs font-semibold mb-6">Fórmula contábil do Lucro Real adotada.</p>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm font-semibold py-1.5 border-b border-slate-800 text-slate-300">
                    <span>(+) Receita Operacional (Faturamento)</span>
                    <span className="text-emerald-400">+ R$ {totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold py-1.5 border-b border-slate-800 text-slate-300">
                    <span>(-) Custo das Mercadorias Vendidas (CMV)</span>
                    <span className="text-amber-400">- R$ {totalCMV.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold py-1.5 border-b border-slate-800 text-slate-300">
                    <span>(-) Despesas Operacionais e Taxas de Cartão</span>
                    <span className="text-rose-400">- R$ {totalExpense.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-black pt-3 text-white">
                    <span>(=) Lucro Real do Período</span>
                    <span className={netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      R$ {netProfit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-cyan-950/20 border border-cyan-500/10 rounded-2xl p-4 flex items-center gap-3">
                <Percent className="w-8 h-8 text-cyan-400" />
                <div className="text-xs text-slate-400 leading-relaxed font-semibold">
                  <span className="font-bold text-white block">Margem de Lucro do Período</span>
                  A margem de lucro operacional líquida é de <span className="text-cyan-400 font-bold">{totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0"}%</span> das vendas brutas realizadas.
                </div>
              </div>
            </div>

            {/* Mercadoria Parada em Estoque */}
            <div className="lg:col-span-1 bg-gradient-to-br from-[#0c1524] to-[#0a0f1c] border border-blue-900/40 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-400" />
                  Capital em Estoque
                </h3>
                <p className="text-blue-200/60 text-xs font-medium leading-relaxed mb-6">
                  Custo total de mercadorias paradas em estoque atualmente. Este valor NÃO entra no cálculo de despesas do mês corrente, entrando apenas na venda de cada item (CMV).
                </p>
                
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center shadow-inner">
                  <p className="text-slate-400 font-semibold text-xs uppercase tracking-wider mb-2">Custo Total de Aquisição</p>
                  <p className="text-3xl font-black text-blue-400">R$ {totalStockCost.toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-6 text-[10px] text-slate-500 font-semibold leading-relaxed">
                * Calculado a partir do somatório de `custo * quantidade` física de todos os itens cadastrados no estoque da empresa/unidade ativa hoje.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TELA 2: EXTRATO DE MOVIMENTAÇÕES (LIVRO CAIXA)
          ========================================== */}
      {activeTab === "extrato" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-md space-y-4">
            {/* Linha 1: Tipo & Funcionário */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fluxo Financeiro</span>
                  <div className="flex bg-[#0a0f1c] p-0.5 border border-slate-700 rounded-lg">
                    <Link href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&sellerId=${sellerId}&payment=${paymentFilter}&category=${categoryFilter}&type=all`} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${typeFilter === "all" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}>Todos</Link>
                    <Link href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&sellerId=${sellerId}&payment=${paymentFilter}&category=${categoryFilter}&type=income`} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${typeFilter === "income" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white"}`}>Entradas</Link>
                    <Link href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&sellerId=${sellerId}&payment=${paymentFilter}&category=${categoryFilter}&type=expense`} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${typeFilter === "expense" ? "bg-rose-500/20 text-rose-400" : "text-slate-400 hover:text-white"}`}>Saídas</Link>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vendedor / Responsável</span>
                  <div className="flex bg-[#0a0f1c] p-0.5 border border-slate-700 rounded-lg flex-wrap gap-0.5 max-w-full">
                    <Link 
                      href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&type=${typeFilter}&payment=${paymentFilter}&category=${categoryFilter}&sellerId=`}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!sellerId ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
                    >
                      Todos
                    </Link>
                    {allUsers.map(u => (
                      <Link 
                        key={u.id}
                        href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&type=${typeFilter}&payment=${paymentFilter}&category=${categoryFilter}&sellerId=${u.id}`}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${sellerId === u.id ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
                      >
                        {u.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <Link href="/financeiro/novo" className="self-end">
                <Button className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 py-2 rounded-xl shadow-lg shadow-cyan-500/20 text-xs">Novo Lançamento</Button>
              </Link>
            </div>

            {/* Linha 2: Meio de Pagamento & Categorias */}
            <div className="flex flex-wrap gap-4 items-center pt-2 border-t border-slate-800/80">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Meio de Pagamento</span>
                <div className="flex bg-[#0a0f1c] p-0.5 border border-slate-700 rounded-lg flex-wrap gap-0.5">
                  <Link 
                    href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&sellerId=${sellerId}&type=${typeFilter}&category=${categoryFilter}&payment=all`}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${paymentFilter === "all" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
                  >
                    Todos
                  </Link>
                  <Link 
                    href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&sellerId=${sellerId}&type=${typeFilter}&category=${categoryFilter}&payment=CASH`}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${paymentFilter === "CASH" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white"}`}
                  >
                    Dinheiro
                  </Link>
                  <Link 
                    href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&sellerId=${sellerId}&type=${typeFilter}&category=${categoryFilter}&payment=PIX`}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${paymentFilter === "PIX" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"}`}
                  >
                    PIX
                  </Link>
                  <Link 
                    href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&sellerId=${sellerId}&type=${typeFilter}&category=${categoryFilter}&payment=CREDIT_CARD`}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${paymentFilter === "CREDIT_CARD" ? "bg-purple-500/20 text-purple-400" : "text-slate-400 hover:text-white"}`}
                  >
                    Crédito
                  </Link>
                  <Link 
                    href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&sellerId=${sellerId}&type=${typeFilter}&category=${categoryFilter}&payment=DEBIT_CARD`}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${paymentFilter === "DEBIT_CARD" ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:text-white"}`}
                  >
                    Débito
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Filtrar Categoria</span>
                <div className="flex bg-[#0a0f1c] p-0.5 border border-slate-700 rounded-lg flex-wrap gap-0.5">
                  <Link 
                    href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&sellerId=${sellerId}&type=${typeFilter}&payment=${paymentFilter}&category=all`}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${categoryFilter === "all" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
                  >
                    Todas Categorias
                  </Link>
                  <Link 
                    href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&sellerId=${sellerId}&type=${typeFilter}&payment=${paymentFilter}&category=Venda de Produtos`}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${categoryFilter === "Venda de Produtos" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"}`}
                  >
                    Vendas
                  </Link>
                  <Link 
                    href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&sellerId=${sellerId}&type=${typeFilter}&payment=${paymentFilter}&category=Custo de Produtos`}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${categoryFilter === "Custo de Produtos" ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:text-white"}`}
                  >
                    Custo de Mercadoria (CMV)
                  </Link>
                  <Link 
                    href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&sellerId=${sellerId}&type=${typeFilter}&payment=${paymentFilter}&category=Taxas e Tarifas`}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${categoryFilter === "Taxas e Tarifas" ? "bg-rose-500/20 text-rose-400" : "text-slate-400 hover:text-white"}`}
                  >
                    Taxas
                  </Link>
                  <Link 
                    href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&sellerId=${sellerId}&type=${typeFilter}&payment=${paymentFilter}&category=Entrada Manual`}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${categoryFilter === "Entrada Manual" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white"}`}
                  >
                    Ajustes Entradas
                  </Link>
                  <Link 
                    href={`/financeiro?tab=extrato&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&sellerId=${sellerId}&type=${typeFilter}&payment=${paymentFilter}&category=Saída Manual`}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${categoryFilter === "Saída Manual" ? "bg-orange-500/20 text-orange-400" : "text-slate-400 hover:text-white"}`}
                  >
                    Sangrias / Vales / Saídas
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0a0f1c] border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Data/Hora</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Funcionário</th>
                  <th className="px-6 py-4">Unidade</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      Nenhum lançamento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
                
                {sortedDays.map((day) => {
                  const dayTransactions = groupedTransactions[day];
                  
                  // Calcular totais do dia
                  const dayIn = dayTransactions.filter(t => t.type === "INCOME").reduce((acc, t) => acc + t.amount, 0);
                  const dayOut = dayTransactions.filter(t => t.type === "EXPENSE").reduce((acc, t) => acc + t.amount, 0);
                  const dayNet = dayIn - dayOut;

                  return (
                    <React.Fragment key={day}>
                      {/* Cabeçalho do Dia */}
                      <tr className="bg-[#0a0f1c]/50 font-black text-xs text-slate-400 border-y border-slate-800/80">
                        <td colSpan={7} className="px-6 py-2.5 font-bold tracking-wider text-cyan-400">
                          📅 {day}
                        </td>
                      </tr>

                      {/* Transações do Dia */}
                      {dayTransactions.map((transaction) => {
                        const match = transaction.description.match(/Venda #([A-Z0-9]+)/i);
                        const shortId = match ? match[1] : null;
                        const relatedSale = shortId ? sales.find(s => s.id.split("-")[0].toUpperCase() === shortId) : null;

                        return (
                          <tr key={transaction.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 text-slate-400 text-xs">
                              {new Date(transaction.transactionDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-4 font-semibold text-white">{transaction.description}</td>
                            <td className="px-6 py-4 text-slate-300 font-medium text-xs">
                              {transaction.user ? transaction.user.name : "Sistema"}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/50">
                                {transaction.unit ? transaction.unit.name : "Geral"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                transaction.type === "INCOME" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/10" : "bg-rose-500/20 text-rose-400 border border-rose-500/10"
                              }`}>
                                {transaction.type === "INCOME" ? "Receita" : "Despesa"}
                              </span>
                            </td>
                            <td className={`px-6 py-4 text-right font-black ${
                              transaction.type === "INCOME" ? "text-emerald-400" : "text-rose-400"
                            }`}>
                              {transaction.type === "INCOME" ? "+" : "-"} R$ {transaction.amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {transaction.category === "Venda de Produtos" && relatedSale ? (
                                <div className="flex items-center justify-center">
                                  <EditSaleModal sale={relatedSale as any} />
                                </div>
                              ) : transaction.category !== "Venda de Produtos" && transaction.category !== "Custo de Produtos" ? (
                                <form action={handleDeleteTransaction} className="inline">
                                  <input type="hidden" name="id" value={transaction.id} />
                                  <button 
                                    type="submit" 
                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all"
                                    title="Excluir Lançamento"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </form>
                              ) : (
                                <span className="text-[10px] text-slate-600 font-bold uppercase">Automático</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Subtotal do Dia */}
                      <tr className="bg-slate-900/30 border-b border-slate-800/80 text-xs font-bold text-slate-400">
                        <td colSpan={5} className="px-6 py-3 text-right uppercase tracking-wider font-semibold text-slate-500">Subtotal {day}:</td>
                        <td className="px-6 py-3 text-right font-black">
                          <span className={dayNet >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            Saldo: R$ {dayNet.toFixed(2)}
                          </span>
                          <div className="text-[9px] text-slate-500 font-semibold mt-0.5">
                            (In: +R$ {dayIn.toFixed(2)} | Out: -R$ {dayOut.toFixed(2)})
                          </div>
                        </td>
                        <td></td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* TOTAL DO MÊS / RESUMO DO PERÍODO */}
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Resumo Financeiro do Período Selecionado</h4>
              <p className="text-xs text-slate-500 font-semibold mt-1">Consolidação de todos os lançamentos listados acima.</p>
            </div>
            
            <div className="flex flex-wrap gap-6 justify-center md:justify-end text-sm">
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl px-5 py-3 text-center min-w-[140px]">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Entradas</span>
                <span className="text-emerald-400 font-black text-lg">+ R$ {periodIn.toFixed(2)}</span>
              </div>
              
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl px-5 py-3 text-center min-w-[140px]">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Saídas</span>
                <span className="text-rose-400 font-black text-lg">- R$ {periodOut.toFixed(2)}</span>
              </div>

              <div className={`bg-slate-900/60 border rounded-xl px-5 py-3 text-center min-w-[140px] ${periodNet >= 0 ? "border-emerald-500/20" : "border-rose-500/20"}`}>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Saldo Líquido</span>
                <span className={`font-black text-lg ${periodNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  R$ {periodNet.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TELA 3: GRÁFICOS E ANÁLISES (APARELHOS VS ACESSÓRIOS)
          ========================================== */}
      {activeTab === "graficos" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico 1: Faturamento (R$) */}
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Divisão de Faturamento (R$)</h3>
                <p className="text-slate-400 text-xs font-semibold mb-6">Comparativo financeiro bruto entre Aparelhos e Acessórios.</p>
                
                {/* Visual SVG Bars */}
                <div className="space-y-6 pt-4">
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-cyan-500 block"></span>
                        Aparelhos Telefônicos
                      </span>
                      <span>R$ {phonesRevenue.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-6 rounded-lg overflow-hidden relative border border-slate-700/30">
                      <div 
                        className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full transition-all duration-1000"
                        style={{ width: `${phonesRevenue + accessoriesRevenue > 0 ? (phonesRevenue / (phonesRevenue + accessoriesRevenue)) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-purple-500 block"></span>
                        Acessórios e Outros
                      </span>
                      <span>R$ {accessoriesRevenue.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-6 rounded-lg overflow-hidden relative border border-slate-700/30">
                      <div 
                        className="bg-gradient-to-r from-purple-600 to-purple-400 h-full transition-all duration-1000"
                        style={{ width: `${phonesRevenue + accessoriesRevenue > 0 ? (accessoriesRevenue / (phonesRevenue + accessoriesRevenue)) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-800/80 flex justify-between text-xs text-slate-400 font-bold mt-6">
                <span>Total Faturado no Período</span>
                <span className="text-emerald-400">R$ {(phonesRevenue + accessoriesRevenue).toFixed(2)}</span>
              </div>
            </div>

            {/* Gráfico 2: Quantidade Vendida (un) */}
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Unidades Físicas Vendidas (un)</h3>
                <p className="text-slate-400 text-xs font-semibold mb-6">Volume absoluto de itens entregues no período.</p>
                
                {/* Visual SVG Bars */}
                <div className="space-y-6 pt-4">
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-cyan-500 block"></span>
                        Aparelhos Telefônicos
                      </span>
                      <span>{phonesQty} un</span>
                    </div>
                    <div className="w-full bg-slate-800 h-6 rounded-lg overflow-hidden relative border border-slate-700/30">
                      <div 
                        className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full transition-all duration-1000"
                        style={{ width: `${phonesQty + accessoriesQty > 0 ? (phonesQty / (phonesQty + accessoriesQty)) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-purple-500 block"></span>
                        Acessórios e Outros
                      </span>
                      <span>{accessoriesQty} un</span>
                    </div>
                    <div className="w-full bg-slate-800 h-6 rounded-lg overflow-hidden relative border border-slate-700/30">
                      <div 
                        className="bg-gradient-to-r from-purple-600 to-purple-400 h-full transition-all duration-1000"
                        style={{ width: `${phonesQty + accessoriesQty > 0 ? (accessoriesQty / (phonesQty + accessoriesQty)) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-800/80 flex justify-between text-xs text-slate-400 font-bold mt-6">
                <span>Total de Itens Vendidos</span>
                <span className="text-cyan-400">{phonesQty + accessoriesQty} un</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          TELA 4: COMPARATIVO MENSAL PERSONALIZADO (MÊS A VS MÊS B)
          ========================================== */}
      {activeTab === "comparativo" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Seletor Customizado de Meses */}
          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl shadow-md">
            <form method="GET" action="/financeiro" className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <input type="hidden" name="tab" value="comparativo" />
              
              <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
                {/* Mês A */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mês de Referência (Mês A)</span>
                  <div className="flex gap-2">
                    <select name="mesA" defaultValue={mesA} className="bg-[#0a0f1c] border border-slate-700 rounded-lg text-xs px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-semibold">
                      {meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <select name="anoA" defaultValue={anoA} className="bg-[#0a0f1c] border border-slate-700 rounded-lg text-xs px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-semibold">
                      <option value={2026}>2026</option>
                      <option value={2025}>2025</option>
                    </select>
                  </div>
                </div>

                <div className="text-slate-600 font-black text-xs pt-4">VS</div>

                {/* Mês B */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mês de Comparação (Mês B)</span>
                  <div className="flex gap-2">
                    <select name="mesB" defaultValue={mesB} className="bg-[#0a0f1c] border border-slate-700 rounded-lg text-xs px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-semibold">
                      {meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <select name="anoB" defaultValue={anoB} className="bg-[#0a0f1c] border border-slate-700 rounded-lg text-xs px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-semibold">
                      <option value={2026}>2026</option>
                      <option value={2025}>2025</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 py-2 rounded-xl text-xs shadow-lg shadow-cyan-500/20 lg:self-end mt-2 lg:mt-0">
                Comparar Períodos
              </Button>
            </form>
          </div>

          {/* DRE Comparativo de Indicadores */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-[#0a0f1c] px-6 py-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Demonstrativo Contábil Lado a Lado</h3>
            </div>
            
            <div className="divide-y divide-slate-800/80">
              {/* Cabeçalho */}
              <div className="grid grid-cols-3 px-6 py-3 bg-[#0a0f1c]/40 text-xs font-black text-slate-400 uppercase tracking-wider">
                <div>Indicador</div>
                <div className="text-center">{meses[mesA - 1].label} {anoA} (Mês A)</div>
                <div className="text-center">{meses[mesB - 1].label} {anoB} (Mês B)</div>
              </div>

              {/* Faturamento Bruto */}
              <div className="grid grid-cols-3 px-6 py-4 text-sm font-bold items-center hover:bg-slate-800/20 transition-colors">
                <div className="text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded bg-emerald-500"></span>
                  (+) Faturamento Bruto
                </div>
                <div className="text-center text-slate-200">R$ {dataA.revenue.toFixed(2)}</div>
                <div className="text-center text-slate-200">R$ {dataB.revenue.toFixed(2)}</div>
              </div>

              {/* CMV */}
              <div className="grid grid-cols-3 px-6 py-4 text-sm font-bold items-center hover:bg-slate-800/20 transition-colors">
                <div className="text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded bg-amber-500"></span>
                  (-) Custos de Mercadorias (CMV)
                </div>
                <div className="text-center text-slate-300">R$ {dataA.cmv.toFixed(2)}</div>
                <div className="text-center text-slate-300">R$ {dataB.cmv.toFixed(2)}</div>
              </div>

              {/* Taxas do Cartão */}
              <div className="grid grid-cols-3 px-6 py-4 text-sm font-bold items-center hover:bg-slate-800/20 transition-colors">
                <div className="text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded bg-rose-500"></span>
                  (-) Taxas de Maquininha (Cartão)
                </div>
                <div className="text-center text-rose-400">R$ {dataA.cardFees.toFixed(2)}</div>
                <div className="text-center text-rose-400">R$ {dataB.cardFees.toFixed(2)}</div>
              </div>

              {/* Despesas Gerais */}
              <div className="grid grid-cols-3 px-6 py-4 text-sm font-bold items-center hover:bg-slate-800/20 transition-colors">
                <div className="text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded bg-slate-500"></span>
                  (-) Outras Despesas Operacionais
                </div>
                <div className="text-center text-slate-400">R$ {dataA.generalExpenses.toFixed(2)}</div>
                <div className="text-center text-slate-400">R$ {dataB.generalExpenses.toFixed(2)}</div>
              </div>

              {/* Lucro Líquido Real */}
              <div className="grid grid-cols-3 px-6 py-5 text-base font-black items-center bg-[#070b14] hover:bg-slate-800/20 transition-colors">
                <div className="text-cyan-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-cyan-400"></span>
                  (=) Lucro Real Operacional
                </div>
                <div className={`text-center ${dataA.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  R$ {dataA.netProfit.toFixed(2)}
                </div>
                <div className={`text-center ${dataB.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  R$ {dataB.netProfit.toFixed(2)}
                </div>
              </div>

              {/* Margem de Lucro */}
              <div className="grid grid-cols-3 px-6 py-4 text-xs font-bold items-center text-slate-400 hover:bg-slate-800/20 transition-colors">
                <div>Margem Operacional (%)</div>
                <div className="text-center font-bold">{dataA.revenue > 0 ? ((dataA.netProfit / dataA.revenue) * 100).toFixed(1) : "0"}%</div>
                <div className="text-center font-bold">{dataB.revenue > 0 ? ((dataB.netProfit / dataB.revenue) * 100).toFixed(1) : "0"}%</div>
              </div>

              {/* Total de Itens Vendidos */}
              <div className="grid grid-cols-3 px-6 py-4 text-xs font-bold items-center text-slate-400 hover:bg-slate-800/20 transition-colors">
                <div>Total de Itens Vendidos (Volume)</div>
                <div className="text-center font-bold text-white">{dataA.qtyItems} un</div>
                <div className="text-center font-bold text-white">{dataB.qtyItems} un</div>
              </div>
            </div>
          </div>

          {/* Gráfico / Detalhamento de Aparelhos vs Acessórios por Mês */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Faturamento e Quantidades por Categorias - Mês A */}
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{meses[mesA - 1].label} {anoA}</h3>
                <p className="text-slate-400 text-xs font-semibold mb-6">Detalhamento por tipo de produto.</p>
                
                <div className="space-y-4">
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Aparelhos Telefônicos</span>
                    <div className="flex justify-between items-baseline mt-1">
                      <p className="text-xl font-black text-cyan-400">R$ {dataA.phonesRevenue.toFixed(2)}</p>
                      <span className="text-xs font-bold text-slate-400">{dataA.phonesQty} unidades</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Acessórios e Outros</span>
                    <div className="flex justify-between items-baseline mt-1">
                      <p className="text-xl font-black text-purple-400">R$ {dataA.accessoriesRevenue.toFixed(2)}</p>
                      <span className="text-xs font-bold text-slate-400">{dataA.accessoriesQty} unidades</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Faturamento e Quantidades por Categorias - Mês B */}
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{meses[mesB - 1].label} {anoB}</h3>
                <p className="text-slate-400 text-xs font-semibold mb-6">Detalhamento por tipo de produto.</p>
                
                <div className="space-y-4">
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Aparelhos Telefônicos</span>
                    <div className="flex justify-between items-baseline mt-1">
                      <p className="text-xl font-black text-cyan-400">R$ {dataB.phonesRevenue.toFixed(2)}</p>
                      <span className="text-xs font-bold text-slate-400">{dataB.phonesQty} unidades</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Acessórios e Outros</span>
                    <div className="flex justify-between items-baseline mt-1">
                      <p className="text-xl font-black text-purple-400">R$ {dataB.accessoriesRevenue.toFixed(2)}</p>
                      <span className="text-xs font-bold text-slate-400">{dataB.accessoriesQty} unidades</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* O QUE CADA MÊS VENDEU MAIS (RANKINGS DETALHADOS LADO A LADO) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top Itens Mês A */}
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-3xl shadow-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Mais Vendidos - {meses[mesA - 1].label}
              </h3>
              <p className="text-slate-400 text-xs font-semibold mb-6">Líderes de venda do Mês A.</p>
              
              <div className="space-y-3">
                {rankingsA.map((item, i) => (
                  <div key={item.sku} className="flex justify-between items-center bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700 flex items-center justify-center font-bold text-[10px]">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-white">{item.name}</p>
                        <p className="text-[9px] text-slate-500 uppercase">SKU: {item.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-white">{item.qty} un</p>
                      <p className="text-[9px] text-slate-500 font-bold">R$ {item.rev.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {rankingsA.length === 0 && (
                  <p className="text-slate-500 text-xs text-center py-6">Nenhuma venda neste mês.</p>
                )}
              </div>
            </div>

            {/* Top Itens Mês B */}
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-3xl shadow-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Mais Vendidos - {meses[mesB - 1].label}
              </h3>
              <p className="text-slate-400 text-xs font-semibold mb-6">Líderes de venda do Mês B.</p>
              
              <div className="space-y-3">
                {rankingsB.map((item, i) => (
                  <div key={item.sku} className="flex justify-between items-center bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700 flex items-center justify-center font-bold text-[10px]">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-white">{item.name}</p>
                        <p className="text-[9px] text-slate-500 uppercase">SKU: {item.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-white">{item.qty} un</p>
                      <p className="text-[9px] text-slate-500 font-bold">R$ {item.rev.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {rankingsB.length === 0 && (
                  <p className="text-slate-500 text-xs text-center py-6">Nenhuma venda neste mês.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TELA 5: VENDAS POR FUNCIONÁRIO
          ========================================== */}
      {activeTab === "vendedores" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-3xl shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-cyan-400" />
              Ranking de Vendas e Detalhamento por Funcionário
            </h3>
            
            <div className="space-y-8 divide-y divide-slate-800/80">
              {sellerStats.map((stat, i) => {
                const percentage = totalRevenue > 0 ? (stat.amount / totalRevenue) * 100 : 0;
                return (
                  <div key={stat.user.id} className="pt-6 first:pt-0 space-y-4">
                    
                    {/* Linha Principal do Vendedor */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-white">{stat.user.name}</p>
                          <p className="text-xs text-slate-500">{stat.user.email} - Permissão: <span className="font-semibold text-slate-400">{stat.user.role}</span></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-cyan-400">R$ {stat.amount.toFixed(2)}</p>
                        <p className="text-xs text-slate-500 font-semibold">{stat.count} {stat.count === 1 ? 'venda' : 'vendas'}</p>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="absolute h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mt-1">
                      <span>Contribuição Comercial</span>
                      <span>{percentage.toFixed(1)}% no faturamento bruto</span>
                    </div>

                    {/* Detalhamento de Itens Vendidos por este funcionário */}
                    <div className="mt-4 bg-[#0a0f1c] border border-slate-800/80 rounded-2xl p-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                        Produtos vendidos por {stat.user.name}:
                      </p>
                      
                      <div className="space-y-2">
                        {stat.detailedItems.map(item => (
                          <div key={item.sku} className="flex justify-between items-center text-xs border-b border-slate-900/60 pb-1.5 last:border-none last:pb-0">
                            <span className="text-slate-300 font-medium">
                              {item.name} <span className="text-slate-500 font-semibold text-[10px] ml-1">x{item.qty} un</span>
                            </span>
                            <span className="font-semibold text-slate-400">R$ {item.rev.toFixed(2)}</span>
                          </div>
                        ))}
                        {stat.detailedItems.length === 0 && (
                          <p className="text-xs text-slate-600 italic">Nenhum produto vendido por este funcionário no período.</p>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}

              {sellerStats.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-6">Nenhum funcionário ativo cadastrado.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TELA 6: RANKINGS DE PRODUTOS & LUCRATIVIDADE
          ========================================== */}
      {activeTab === "rankings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
          
          {/* Top 10 mais vendidos */}
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-3xl shadow-xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Top 10 Itens Mais Vendidos
            </h3>
            <p className="text-slate-400 text-xs font-semibold mb-6">Classificados pela quantidade física de unidades vendidas.</p>

            <div className="space-y-4">
              {topSoldProducts.map((item, i) => (
                <div key={item.product.id} className="flex justify-between items-center bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-cyan-400 border border-slate-700 flex items-center justify-center font-black text-xs">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">{item.product.name}</p>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">SKU: {item.product.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-cyan-400">{item.quantity} un</p>
                    <p className="text-[10px] text-slate-500 font-bold">R$ {item.revenue.toFixed(2)} bruto</p>
                  </div>
                </div>
              ))}

              {topSoldProducts.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-6">Nenhum produto vendido no período.</p>
              )}
            </div>
          </div>

          {/* Ranking de Lucratividade */}
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-3xl shadow-xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              Ranking de Lucratividade por Item
            </h3>
            <p className="text-slate-400 text-xs font-semibold mb-6">Classificados pela contribuição total de lucro líquido gerado `(Preço - Custo) * Qtd`.</p>

            <div className="space-y-4">
              {topProfitableProducts.map((item, i) => (
                <div key={item.product.id} className="flex justify-between items-center bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 flex items-center justify-center font-black text-xs">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">{item.product.name}</p>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">SKU: {item.product.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-400">R$ {item.profit.toFixed(2)} líquido</p>
                    <p className="text-[10px] text-slate-500 font-bold">R$ {item.revenue.toFixed(2)} bruto</p>
                  </div>
                </div>
              ))}

              {topProfitableProducts.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-6">Nenhum produto vendido no período.</p>
              )}
            </div>
          </div>
          
        </div>
      )}
      
    </div>
  );
}
