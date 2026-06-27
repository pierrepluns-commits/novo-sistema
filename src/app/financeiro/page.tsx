import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { 
  TrendingUp, TrendingDown, DollarSign, FileText, Users, ShoppingBag, 
  Calendar, ArrowUpRight, ArrowDownRight, Award, Percent, ChevronRight, Trash2,
  Filter, Search, Wrench
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSelectedUnitId } from "@/app/actions/unit";
import { deleteTransaction } from "@/app/actions/finance";
import { EditSaleModal, ReprintReceiptButton, DeleteSaleButton } from "@/components/forms/CaixaClientForms";
import { PieChart } from "@/components/ui/PieChart";

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
    area?: string; // area filter: all, pdv, os, aparelhos
    q?: string;
  }>;
}

export default async function FinanceiroPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return <div>Não autorizado</div>;
  }

  const permissions = session.permissions ? JSON.parse(session.permissions) : [];
  const canDelete = session.role === "SUPER_ADMIN" || session.role === "COMPANY_ADMIN" || permissions.includes("ALL") || permissions.includes("DELETE_FINANCE");

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
  const area = params.area || "all";
  const query = params.q || "";

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
    txsA, salesA, txsB, salesB,
    serviceOrders, serviceOrdersA, serviceOrdersB
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
    }),
    // Ordens de Serviço do período principal
    prisma.serviceOrder.findMany({
      where: {
        ...baseWhere,
        status: "DELIVERED",
        updatedAt: { gte: start, lte: end }
      },
      include: {
        client: true,
        user: true,
        items: { include: { product: true } }
      }
    }),
    // O.S. Mês A
    prisma.serviceOrder.findMany({
      where: {
        ...baseWhere,
        status: "DELIVERED",
        updatedAt: { gte: startA, lte: endA }
      },
      include: { items: true }
    }),
    // O.S. Mês B
    prisma.serviceOrder.findMany({
      where: {
        ...baseWhere,
        status: "DELIVERED",
        updatedAt: { gte: startB, lte: endB }
      },
      include: { items: true }
    })
  ]);

  // ==========================================
  // AUXILIAR DE COMPARAÇÃO DE APARELHOS
  // ==========================================
  const isPhone = (name: string) => {
    const n = name.toLowerCase();
    return n.includes("celular") || n.includes("telefone") || n.includes("aparelho") ||
           n.includes("iphone") || n.includes("samsung") || n.includes("xiaomi") ||
           n.includes("motorola") || n.includes("redmi") || n.includes("smartphone");
  };

  // ==========================================
  // CÁLCULOS FINANCEIROS TOTAIS (MÊS SELECIONADO ATUAL)
  // ==========================================
  
  // 1. Receitas do PDV (Venda de Produtos)
  const pdvRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalRevenue = pdvRevenue;
  
  // 2. Receitas de Serviços (Ordens de Serviço faturadas ou adiantamentos)
  const osRevenue = serviceOrders.reduce((acc, o) => acc + o.totalAmount, 0);

  // 3. Custos de Produtos Vendidos (CMV PDV)
  let pdvCMV = 0;
  for (const sale of sales) {
    for (const item of sale.items) {
      const cost = item.unitCost || item.product?.cost || 0;
      pdvCMV += item.quantity * cost;
    }
  }

  // 4. Custos de Peças Aplicadas em O.S. (CMV O.S.)
  let osPartsCost = 0;
  for (const os of serviceOrders) {
    for (const item of os.items) {
      osPartsCost += item.quantity * (item.unitCost || 0);
    }
    // Inclui peças avulsas e custo de acessórios do checklist
    osPartsCost += os.partsPrice || 0;
    let accessoryCost = 0;
    try {
      const checklistObj = JSON.parse(os.checklist || "{}");
      accessoryCost = parseFloat(checklistObj.accessoryCost) || 0;
    } catch {}
    osPartsCost += accessoryCost;
  }

  // 5. Custos Terceirizados / Insumos de O.S.
  const osCustomCosts = serviceOrders.reduce((acc, o) => acc + o.cost, 0);

  // 6. Taxas de Cartão cobradas (PDV + O.S.)
  const pdvCardFees = sales.reduce((acc, s) => acc + s.cardFee, 0);
  const osCardFees = serviceOrders.reduce((acc, o) => acc + o.cardFee, 0);
  const totalCardFees = transactions
    .filter(t => t.type === "EXPENSE" && t.category === "Taxas e Tarifas")
    .reduce((acc, t) => acc + t.amount, 0);

  // 7. Custos Fixos / Despesas Gerais Operacionais (Luz, Aluguel, Prolabore, etc.)
  const fixedCosts = transactions
    .filter(t => t.type === "EXPENSE" && t.category !== "Custo de Produtos" && t.category !== "Custo de Serviços" && t.category !== "Taxas e Tarifas")
    .reduce((acc, t) => acc + t.amount, 0);

  // ==========================================
  // FILTRAGEM DINÂMICA DE EXIBIÇÃO NO DASHBOARD (VARIA COM O SELETOR DE ÁREA)
  // ==========================================
  let displayRevenue = pdvRevenue + osRevenue;
  let displayCMV = pdvCMV + osPartsCost;
  let displayOSCost = osCustomCosts;
  let displayExpense = fixedCosts + totalCardFees; // Todas as despesas gerais e taxas
  
  if (area === "pdv") {
    displayRevenue = pdvRevenue;
    displayCMV = pdvCMV;
    displayOSCost = 0;
    displayExpense = pdvCardFees; // Apenas taxas do PDV para análise isolada
  } else if (area === "os") {
    displayRevenue = osRevenue;
    displayCMV = osPartsCost;
    displayOSCost = osCustomCosts;
    displayExpense = osCardFees; // Apenas taxas da O.S.
  } else if (area === "aparelhos") {
    // Apenas vendas de celulares/smartphones direct sales no PDV
    const phoneSales = sales.reduce((acc, s) => acc + s.items.filter(item => isPhone(item.product?.name || "")).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), 0);
    const phoneCost = sales.reduce((acc, s) => acc + s.items.filter(item => isPhone(item.product?.name || "")).reduce((sum, item) => sum + item.quantity * (item.unitCost || item.product?.cost || 0), 0), 0);
    displayRevenue = phoneSales;
    displayCMV = phoneCost;
    displayOSCost = 0;
    displayExpense = 0; // Sem despesa de taxa direta mapeada
  }

  const netProfit = displayRevenue - displayCMV - displayOSCost - displayExpense;
  const totalStockCost = allStocks.reduce((sum, s) => sum + s.quantity * (s.product?.cost || 0), 0);

  // ==========================================
  // CÁLCULOS DETALHADOS COMPARATIVOS: MÊS A e MÊS B (INCLUINDO O.S.)
  // ==========================================
  const calcMonthData = (monthSales: any[], monthTxs: any[], monthOS: any[]) => {
    const pdvRev = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const osRev = monthOS.reduce((acc, o) => acc + o.totalAmount, 0);
    const revenue = pdvRev + osRev;
    
    // Taxas de Cartão cobradas (Salvas em EXPENSE categoria "Taxas e Tarifas")
    const cardFees = monthTxs
      .filter(t => t.type === "EXPENSE" && t.category === "Taxas e Tarifas")
      .reduce((acc, t) => acc + t.amount, 0);

    // Despesas Gerais Operacionais (Luz, Aluguel, etc.)
    const generalExpenses = monthTxs
      .filter(t => t.type === "EXPENSE" && t.category !== "Custo de Produtos" && t.category !== "Custo de Serviços" && t.category !== "Taxas e Tarifas")
      .reduce((acc, t) => acc + t.amount, 0);

    // CMV PDV
    let cmvPDV = 0;
    for (const sale of monthSales) {
      for (const item of sale.items) {
        const cost = item.unitCost || item.product?.cost || 0;
        cmvPDV += item.quantity * cost;
      }
    }

    // CMV O.S. (Peças)
    const osParts = monthOS.reduce((acc, o) => {
      let partsCost = o.items.reduce((sum: number, item: any) => sum + item.quantity * (item.unitCost || 0), 0);
      partsCost += o.partsPrice || 0;
      let accessoryCost = 0;
      try {
        const checklistObj = JSON.parse(o.checklist || "{}");
        accessoryCost = parseFloat(checklistObj.accessoryCost) || 0;
      } catch {}
      return acc + partsCost + accessoryCost;
    }, 0);
    // Custo Terceirizado
    const osCustom = monthOS.reduce((acc, o) => acc + o.cost, 0);
    const totalCosts = cmvPDV + osParts + osCustom;

    const netProfit = revenue - totalCosts - cardFees - generalExpenses;

    let qtyItems = monthSales.reduce((acc, s) => acc + s.items.reduce((sum: number, item: any) => sum + item.quantity, 0), 0);
    let phonesQty = 0;
    let phonesRevenue = 0;
    let accessoriesQty = 0;
    let accessoriesRevenue = 0;

    for (const sale of monthSales) {
      for (const item of sale.items) {
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

    // Adiciona O.S. na receita de serviços
    const servicesRevenue = monthOS.reduce((acc, o) => acc + o.totalAmount, 0);

    return {
      revenue,
      cardFees,
      generalExpenses,
      cmv: totalCosts,
      netProfit,
      qtyItems,
      phonesQty,
      phonesRevenue,
      accessoriesQty,
      accessoriesRevenue,
      servicesRevenue
    };
  };

  const dataA = calcMonthData(salesA, txsA, serviceOrdersA);
  const dataB = calcMonthData(salesB, txsB, serviceOrdersB);

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

  // Filtragem por busca textual ("Lupa na Pesquisa")
  if (query) {
    const qUpper = query.toUpperCase();
    filteredTransactions = filteredTransactions.filter(t => 
      t.description.toUpperCase().includes(qUpper) || 
      (t.category?.toUpperCase() || "").includes(qUpper) ||
      (t.user && t.user.name.toUpperCase().includes(qUpper))
    );
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
      const tabsList = [
    {
      id: "dashboard",
      label: "Dashboard & Lucro",
      icon: DollarSign,
      color: "text-emerald-400",
      inactiveIconColor: "text-slate-500 group-hover:text-emerald-400",
      activeStyle: "bg-emerald-600 border-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.45)] text-white font-black",
      hoverStyle: "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-emerald-500/40 hover:bg-emerald-600/15 hover:text-emerald-300",
      moneyClass: "text-emerald-400 font-extrabold"
    },
    {
      id: "extrato",
      label: "Extrato de Movimentações",
      icon: FileText,
      color: "text-sky-400",
      inactiveIconColor: "text-slate-500 group-hover:text-sky-400",
      activeStyle: "bg-sky-600 border-sky-500 shadow-[0_4px_20px_rgba(14,165,233,0.45)] text-white font-black",
      hoverStyle: "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-sky-500/40 hover:bg-sky-600/15 hover:text-sky-300",
      moneyClass: "text-emerald-400 font-extrabold"
    },
    {
      id: "graficos",
      label: "Gráficos de Vendas",
      icon: TrendingUp,
      color: "text-indigo-400",
      inactiveIconColor: "text-slate-500 group-hover:text-indigo-400",
      activeStyle: "bg-indigo-600 border-indigo-500 shadow-[0_4px_20px_rgba(99,102,241,0.45)] text-white font-black",
      hoverStyle: "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-indigo-500/40 hover:bg-indigo-600/15 hover:text-indigo-300",
      moneyClass: "text-emerald-400 font-extrabold"
    },
    {
      id: "comparativo",
      label: "Comparativo Mensal",
      icon: Percent,
      color: "text-purple-400",
      inactiveIconColor: "text-slate-500 group-hover:text-purple-400",
      activeStyle: "bg-purple-600 border-purple-500 shadow-[0_4px_20px_rgba(168,85,247,0.45)] text-white font-black",
      hoverStyle: "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-purple-500/40 hover:bg-purple-600/15 hover:text-purple-300",
      moneyClass: "text-emerald-400 font-extrabold"
    },
    {
      id: "vendedores",
      label: "Vendas por Funcionário",
      icon: Users,
      color: "text-amber-400",
      inactiveIconColor: "text-slate-500 group-hover:text-amber-400",
      activeStyle: "bg-amber-600 border-amber-500 shadow-[0_4px_20px_rgba(245,158,11,0.45)] text-white font-black",
      hoverStyle: "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-amber-500/40 hover:bg-amber-600/15 hover:text-amber-300",
      moneyClass: "text-emerald-400 font-extrabold"
    },
    {
      id: "rankings",
      label: "Rankings de Produtos",
      icon: Award,
      color: "text-rose-400",
      inactiveIconColor: "text-slate-500 group-hover:text-rose-400",
      activeStyle: "bg-rose-600 border-rose-500 shadow-[0_4px_20px_rgba(244,63,94,0.45)] text-white font-black",
      hoverStyle: "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-rose-500/40 hover:bg-rose-600/15 hover:text-rose-300",
      moneyClass: "text-emerald-400 font-extrabold"
    },
    {
      id: "comissoes",
      label: "Comissões por Técnico",
      icon: Wrench,
      color: "text-amber-400",
      inactiveIconColor: "text-slate-500 group-hover:text-amber-400",
      activeStyle: "bg-amber-600 border-amber-500 shadow-[0_4px_20px_rgba(245,158,11,0.45)] text-white font-black",
      hoverStyle: "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-amber-500/40 hover:bg-amber-600/15 hover:text-amber-300",
      moneyClass: "text-emerald-400 font-extrabold"
    }
  ];

  // ==========================================
  // CÁLCULO DE COMISSÕES POR TÉCNICO
  // ==========================================

  const techStats: Record<string, {
    name: string;
    count: number;
    totalBilled: number;
    totalServicePrice: number;
    totalCommission: number;
    detailedOS: Array<{
      id: string;
      osNumber: number;
      clientName: string;
      brand: string;
      model: string;
      servicePrice: number;
      totalAmount: number;
      commission: number;
      date: Date;
      status: string;
    }>;
  }> = {};

  for (const os of serviceOrders) {
    if (os.status !== "DELIVERED") continue;

    let checklistObj: Record<string, any> = {};
    try {
      checklistObj = JSON.parse(os.checklist || "{}");
    } catch {
      checklistObj = {};
    }

    const techName = checklistObj.technicianName?.trim() || os.user?.name || "Sem Técnico";

    if (!techStats[techName]) {
      techStats[techName] = {
        name: techName,
        count: 0,
        totalBilled: 0,
        totalServicePrice: 0,
        totalCommission: 0,
        detailedOS: []
      };
    }

    const servicePriceVal = os.servicePrice || 0;
    const commissionVal = os.cost || 0;

    techStats[techName].count += 1;
    techStats[techName].totalBilled += os.totalAmount;
    techStats[techName].totalServicePrice += servicePriceVal;
    techStats[techName].totalCommission += commissionVal;

    techStats[techName].detailedOS.push({
      id: os.id,
      osNumber: os.osNumber,
      clientName: os.client.name,
      brand: os.equipmentBrand,
      model: os.equipmentModel,
      servicePrice: servicePriceVal,
      totalAmount: os.totalAmount,
      commission: commissionVal,
      date: os.updatedAt,
      status: os.status,
    });
  }

  const sortedTechStats = Object.values(techStats).sort((a, b) => b.totalCommission - a.totalCommission);

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
        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl shadow-md space-y-4 animate-in fade-in duration-200">
          <form method="GET" action="/financeiro" className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <input type="hidden" name="tab" value={activeTab} />
            <input type="hidden" name="area" value={area} />
            
            {/* Filtro de Período */}
            <div className="flex flex-wrap gap-2.5 items-center w-full lg:w-auto">
              <span className="text-slate-400 font-semibold text-xs flex items-center gap-1 mr-2">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Período:
              </span>
              <Link href={`/financeiro?tab=${activeTab}&periodo=hoje&area=${area}`} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${periodo === "hoje" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]" : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-850"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${periodo === "hoje" ? "bg-cyan-400 animate-pulse scale-125" : "bg-slate-600"}`}></span>
                Hoje
              </Link>
              <Link href={`/financeiro?tab=${activeTab}&periodo=7dias&area=${area}`} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${periodo === "7dias" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]" : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-850"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${periodo === "7dias" ? "bg-cyan-400 animate-pulse scale-125" : "bg-slate-600"}`}></span>
                Últimos 7 dias
              </Link>
              <Link href={`/financeiro?tab=${activeTab}&periodo=mes&area=${area}`} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${periodo === "mes" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]" : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-850"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${periodo === "mes" ? "bg-cyan-400 animate-pulse scale-125" : "bg-slate-600"}`}></span>
                Mês Atual
              </Link>
              <Link href={`/financeiro?tab=${activeTab}&periodo=ano&area=${area}`} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${periodo === "ano" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]" : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-850"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${periodo === "ano" ? "bg-cyan-400 animate-pulse scale-125" : "bg-slate-600"}`}></span>
                Ano Atual
              </Link>
              <Link href={`/financeiro?tab=${activeTab}&periodo=personalizado&startDate=${startDateStr}&endDate=${endDateStr}&area=${area}`} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${periodo === "personalizado" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]" : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-850"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${periodo === "personalizado" ? "bg-cyan-400 animate-pulse scale-125" : "bg-slate-600"}`}></span>
                Personalizado
              </Link>
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
                <Button type="submit" size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-1.5 px-4 rounded-lg text-xs shadow-md shadow-cyan-500/10">Filtrar</Button>
              </div>
            )}
          </form>

          {/* Filtro de Área de Visualização */}
          <div className="flex flex-wrap gap-2 items-center pt-3 border-t border-slate-800/80">
            <span className="text-slate-400 font-semibold text-xs flex items-center gap-1 mr-2">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              Filtrar por Área:
            </span>
            <div className="flex gap-2 flex-wrap">
              <Link 
                href={`/financeiro?tab=${activeTab}&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&area=all`} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${area === "all" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${area === "all" ? "bg-cyan-400" : "bg-slate-600"}`}></span>
                Tudo Consolidado (Geral)
              </Link>
              <Link 
                href={`/financeiro?tab=${activeTab}&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&area=pdv`} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${area === "pdv" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${area === "pdv" ? "bg-emerald-400" : "bg-slate-600"}`}></span>
                Apenas Vendas PDV
              </Link>
              <Link 
                href={`/financeiro?tab=${activeTab}&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&area=os`} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${area === "os" ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${area === "os" ? "bg-amber-400" : "bg-slate-600"}`}></span>
                Apenas Ordens de Serviço
              </Link>
              <Link 
                href={`/financeiro?tab=${activeTab}&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&area=aparelhos`} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${area === "aparelhos" ? "bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-[0_0_10px_rgba(14,165,233,0.2)]" : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${area === "aparelhos" ? "bg-sky-400" : "bg-slate-600"}`}></span>
                Apenas Venda de Celulares
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          BARRA DE NAVEGAÇÃO DE ABAS (TABS)
          ========================================== */}
      <div className="flex flex-wrap gap-3 border-b border-slate-800/80 pb-4">
        {tabsList.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          
          let targetHref = `/financeiro?tab=${tab.id}&periodo=${periodo}&startDate=${startDateStr}&endDate=${endDateStr}&area=${area}`;
          if (tab.id === "comparativo") {
            targetHref = `/financeiro?tab=comparativo&mesA=${mesA}&anoA=${anoA}&mesB=${mesB}&anoB=${anoB}&area=${area}`;
          }
          
          return (
            <Link
              key={tab.id}
              href={targetHref}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-3 border group ${
                isActive ? tab.activeStyle : tab.hoverStyle
              }`}
            >
              {/* Glassmorphism Icon + Mini Dinheiro ($) */}
              <div 
                className={`p-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  isActive ? "bg-black/35 border border-black/15" : "bg-slate-900/50 border border-transparent"
                }`}
              >
                <TabIcon className={`w-4 h-4 transition-all duration-350 group-hover:scale-110 ${isActive ? "text-white" : tab.color}`} />
                <span className={`text-[11px] font-black ${isActive ? "text-white" : tab.moneyClass} drop-shadow-[0_0_4px_rgba(52,211,153,0.4)]`}>$</span>
              </div>
              
              <span className={`transition-colors duration-300 ${isActive ? "text-white font-black drop-shadow-sm" : "text-slate-400 group-hover:text-white"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* ==========================================
          TELA 1: DASHBOARD FINANCEIRO & CMV
          ========================================== */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-glow p-6 rounded-2xl flex flex-col justify-between h-36">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <h3 className="text-slate-400 font-semibold text-sm">Faturamento Bruto</h3>
              </div>
              <p className="text-3xl font-black val-positive">R$ {displayRevenue.toFixed(2)}</p>
            </div>
            
            <div className="card-glow p-6 rounded-2xl flex flex-col justify-between h-36">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <h3 className="text-slate-400 font-semibold text-sm">Despesas e Taxas</h3>
              </div>
              <p className="text-3xl font-black val-negative">R$ {displayExpense.toFixed(2)}</p>
            </div>

            <div className="card-glow p-6 rounded-2xl flex flex-col justify-between h-36">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="text-slate-400 font-semibold text-sm">Custos (CMV / Serviços)</h3>
              </div>
              <p className="text-3xl font-black val-cost font-mono">R$ {(displayCMV + displayOSCost).toFixed(2)}</p>
            </div>

            <div className={`card-glow p-6 rounded-2xl flex flex-col justify-between h-36 ${netProfit >= 0 ? "border-emerald-500/20" : "border-rose-500/20"}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${netProfit >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <h3 className="text-slate-400 font-semibold text-sm">Lucro Líquido Real</h3>
              </div>
              <p className={`text-3xl font-black ${netProfit >= 0 ? "val-positive" : "val-negative"}`}>
                R$ {netProfit.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Demonstração de Resultado */}
            <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Demonstração de Resultado Consolida</h3>
                <p className="text-slate-400 text-xs font-semibold mb-6">Detalhamento contábil de receitas, custos e taxas integrados.</p>
                
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center text-xs font-bold py-1 border-b border-slate-800/60 text-slate-400 uppercase tracking-wider">
                    <span>Receitas do Período</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold py-1 border-b border-slate-800 text-slate-300">
                    <span>(+) Faturamento de Vendas (PDV)</span>
                    <span className="text-slate-400 font-mono">R$ {pdvRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold py-1 border-b border-slate-800 text-slate-300">
                    <span>(+) Faturamento de Serviços (O.S.)</span>
                    <span className="text-slate-400 font-mono">R$ {osRevenue.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold py-1 border-b border-slate-800/60 text-slate-400 uppercase tracking-wider pt-2">
                    <span>Custos e Despesas Operacionais</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold py-1 border-b border-slate-800 text-slate-300">
                    <span>(-) Custo das Peças/Produtos PDV (CMV)</span>
                    <span className="text-amber-500 font-mono">- R$ {pdvCMV.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold py-1 border-b border-slate-800 text-slate-300">
                    <span>(-) Custo de Peças aplicadas em O.S. (CMV)</span>
                    <span className="text-amber-500 font-mono">- R$ {osPartsCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold py-1 border-b border-slate-800 text-slate-300">
                    <span>(-) Custo Terceirizado / Adicional de O.S.</span>
                    <span className="text-amber-500 font-mono">- R$ {osCustomCosts.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold py-1 border-b border-slate-800 text-slate-300">
                    <span>(-) Custos Fixos / Despesas Operacionais</span>
                    <span className="text-rose-400 font-mono">- R$ {fixedCosts.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold py-1 border-b border-slate-800 text-slate-300">
                    <span>(-) Taxas de Cartão</span>
                    <span className="text-rose-400 font-mono">- R$ {totalCardFees.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-lg font-black pt-3 text-white border-t border-slate-700">
                    <span>(=) Lucro Líquido Real</span>
                    <span className={netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      R$ {netProfit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-cyan-950/20 border border-cyan-500/10 rounded-2xl p-4 flex items-center gap-3">
                <Percent className="w-8 h-8 text-cyan-400 animate-pulse" />
                <div className="text-xs text-slate-400 leading-relaxed font-semibold">
                  <span className="font-bold text-white block">Margem de Lucro Consolidada</span>
                  Sua margem de lucro líquido consolidada neste período é de <span className="text-cyan-400 font-bold">{displayRevenue > 0 ? ((netProfit / displayRevenue) * 100).toFixed(1) : "0"}%</span> das receitas brutas operacionais.
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
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-md space-y-6">
            
            {/* Campo de Pesquisa com Lupa ("Lupa na Pesquisa") */}
            <form method="GET" action="/financeiro" className="w-full max-w-md relative">
              <input type="hidden" name="tab" value="extrato" />
              <input type="hidden" name="periodo" value={periodo} />
              {startDateStr && <input type="hidden" name="startDate" value={startDateStr} />}
              {endDateStr && <input type="hidden" name="endDate" value={endDateStr} />}
              {sellerId && <input type="hidden" name="sellerId" value={sellerId} />}
              <input type="hidden" name="type" value={typeFilter} />
              <input type="hidden" name="payment" value={paymentFilter} />
              <input type="hidden" name="category" value={categoryFilter} />
              <input type="hidden" name="area" value={area} />
              
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] group-focus-within:text-cyan-300 group-focus-within:scale-110 transition-all duration-300" />
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="Pesquisar lançamentos... (ex: Venda #10, sinal, pix)"
                  className="w-full bg-[#0a0f1c] border border-slate-700 focus:border-cyan-400 rounded-xl pl-11 pr-4 py-2 text-xs text-white input-glow font-semibold"
                />
              </div>
            </form>
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
                                <div className="flex items-center justify-center gap-1.5">
                                  <EditSaleModal sale={relatedSale as any} canDelete={canDelete} />
                                  <ReprintReceiptButton sale={relatedSale as any} users={allUsers} />
                                  <DeleteSaleButton sale={relatedSale as any} canDelete={canDelete} />
                                </div>
                              ) : transaction.category !== "Venda de Produtos" && transaction.category !== "Custo de Produtos" ? (
                                canDelete ? (
                                  <form action={handleDeleteTransaction} className="inline">
                                    <input type="hidden" name="id" value={transaction.id} />
                                    <button 
                                      type="submit" 
                                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all cursor-pointer"
                                      title="Excluir Lançamento"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </form>
                                ) : (
                                  <span className="text-[10px] text-slate-600 font-bold uppercase">Sem Permissão</span>
                                )
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
          TELA 3: GRÁFICOS E ANÁLISES (APARELHOS VS ACESSÓRIOS VS SERVIÇOS)
          ========================================== */}
      {activeTab === "graficos" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Grid de Gráficos Pizza/Donut SVG Interativos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico 1: Performance por Faturamento Bruto */}
            <PieChart
              title="Performance por Faturamento Bruto (Valor Bruto)"
              isCurrency={true}
              data={[
                { label: "Venda de Aparelhos", value: phonesRevenue, color: "#00d2ff" }, // Cyan
                { label: "Venda de Acessórios", value: accessoriesRevenue, color: "#a855f7" }, // Purple
                { label: "Serviços e O.S.", value: osRevenue, color: "#f97316" }, // Neon Orange
              ]}
            />

            {/* Gráfico 2: Performance por Lucro Líquido Real */}
            {(() => {
              const phoneSalesCostVal = sales.reduce((acc, s) => acc + s.items.filter(item => isPhone(item.product?.name || "")).reduce((sum, item) => sum + item.quantity * (item.unitCost || item.product?.cost || 0), 0), 0);
              const accessorySalesCostVal = sales.reduce((acc, s) => acc + s.items.filter(item => !isPhone(item.product?.name || "")).reduce((sum, item) => sum + item.quantity * (item.unitCost || item.product?.cost || 0), 0), 0);
              
              const phoneProfit = Math.max(0, phonesRevenue - phoneSalesCostVal);
              const accessoryProfit = Math.max(0, accessoriesRevenue - accessorySalesCostVal);
              const osProfit = Math.max(0, osRevenue - osPartsCost - osCustomCosts);

              return (
                <PieChart
                  title="Performance por Lucro Líquido Real (Lucro Líquido)"
                  isCurrency={true}
                  data={[
                    { label: "Venda de Aparelhos", value: phoneProfit, color: "#10b981" }, // Emerald
                    { label: "Venda de Acessórios", value: accessoryProfit, color: "#c084fc" }, // Light Purple
                    { label: "Serviços e O.S.", value: osProfit, color: "#eab308" }, // Amber
                  ]}
                />
              );
            })()}

            {/* Gráfico 3: Distribuição de Custos & Custos Fixos */}
            <PieChart
              title="Distribuição Contábil de Custos e Despesas"
              isCurrency={true}
              data={[
                { label: "CMV de Produtos (PDV)", value: pdvCMV, color: "#f43f5e" }, // Rose
                { label: "CMV de Peças (O.S.)", value: osPartsCost, color: "#fb7185" }, // Light Rose
                { label: "Serviços Terceirizados (O.S.)", value: osCustomCosts, color: "#f59e0b" }, // Orange/Amber
                { label: "Taxas de Cartão", value: totalCardFees, color: "#6366f1" }, // Indigo
                { label: "Custos Fixos / Operacionais", value: fixedCosts, color: "#ec4899" }, // Pink
              ]}
            />

            {/* Gráfico 4: Unidades Físicas Vendidas */}
            <PieChart
              title="Volume Físico de Itens Vendidos (Vendas PDV)"
              valueSuffix=" un"
              data={[
                { label: "Celulares e Aparelhos", value: phonesQty, color: "#06b6d4" },
                { label: "Acessórios e Outros", value: accessoriesQty, color: "#8b5cf6" },
              ]}
            />

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
      {/* ==========================================
          TELA 7: COMISSÕES POR TÉCNICO
          ========================================== */}
      {activeTab === "comissoes" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-3xl shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-400" />
                  Comissões de Serviços por Técnico
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Relatório detalhado de comissões calculadas sobre a mão de obra de O.S. finalizadas no período
                </p>
              </div>
            </div>

            {/* List of technicians */}
            <div className="space-y-4">
              {sortedTechStats.map((stat) => (
                <details key={stat.name} className="group bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden">
                  <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-850/30 transition-all list-none select-none">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{stat.name}</p>
                        <p className="text-xs text-slate-500 font-semibold">{stat.count} {stat.count === 1 ? 'serviço' : 'serviços'} realizado(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Comissão</p>
                        <p className="text-base font-extrabold text-amber-500 font-mono">R$ {stat.totalCommission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      </div>
                      <span className="text-slate-500 group-open:rotate-180 transition-transform duration-300 text-xs">
                        ▼
                      </span>
                    </div>
                  </summary>
                  <div className="p-5 border-t border-slate-850 bg-slate-950/20 space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[700px]">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase pb-2">
                            <th className="pb-2">O.S.</th>
                            <th className="pb-2">Aparelho</th>
                            <th className="pb-2">Cliente</th>
                            <th className="pb-2">Data Encerram.</th>
                            <th className="pb-2">Status</th>
                            <th className="pb-2 text-right">Mão de Obra</th>
                            <th className="pb-2 text-right">Comissão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850/80">
                          {stat.detailedOS.map((os) => (
                            <tr key={os.id} className="hover:bg-slate-900/10">
                              <td className="py-2.5 font-mono font-bold text-indigo-400">
                                <Link href={`/os/editar/${os.id}`} className="hover:underline">
                                  #{os.osNumber}
                                </Link>
                              </td>
                              <td className="py-2.5 text-white font-medium">{os.brand} {os.model}</td>
                              <td className="py-2.5 text-slate-300">{os.clientName}</td>
                              <td className="py-2.5 text-slate-400 font-mono">
                                {new Date(os.date).toLocaleDateString("pt-BR")} {new Date(os.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="py-2.5">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  os.status === 'DELIVERED' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-green-500/10 text-green-400 border border-green-500/20'
                                }`}>
                                  {os.status === 'DELIVERED' ? 'Entregue' : 'Pronto'}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-mono text-slate-400">R$ {os.servicePrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                              <td className="py-2.5 text-right font-mono font-bold text-emerald-400">R$ {os.commission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              ))}

              {sortedTechStats.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-8">Nenhum serviço prestado por técnicos finalizado no período selecionado.</p>
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
