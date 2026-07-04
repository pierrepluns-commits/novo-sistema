"use client";

import React, { useState, useTransition } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { 
  Coins, Calendar, DollarSign, Users, Loader2, 
  Wrench, ShoppingCart, Percent, AlertCircle, FileText, Printer,
  MinusCircle, Plus, Building, Info, Save
} from "lucide-react";
import { calculateSalaryPayrollAction, createSalaryValeAction } from "@/app/actions/salary";
import toast from "react-hot-toast";

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface SalariosPageClientProps {
  employees: Employee[];
}

export default function SalariosPageClient({ employees }: SalariosPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState("");
  
  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Unit filter selection
  const [unitFilter, setUnitFilter] = useState<"current" | "all">("all");

  // Daily rate calculations inputs
  const [daysWorked, setDaysWorked] = useState("0");
  const [dailyRateVal, setDailyRateVal] = useState("0");

  // New Vale form states
  const [valeAmount, setValeAmount] = useState("");
  const [valeDescription, setValeDescription] = useState("");
  const [valeDate, setValeDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [savingVale, setSavingVale] = useState(false);

  // Calculation results
  const [payrollData, setPayrollData] = useState<{
    employeeName: string;
    osList: Array<{ id: string; osNumber: number; date: string; equipment: string; commission: number; unitName: string }>;
    totalOSCommissions: number;
    salesList: Array<{ id: string; date: string; productName: string; quantity: number; unitPrice: number; grossValue: number; commission: number; unitName: string }>;
    totalAccessoryCommissions: number;
    valesList: Array<{ id: string; date: string; description: string; amount: number; unitName: string }>;
    totalVales: number;
  } | null>(null);

  const daysWorkedNum = parseInt(daysWorked, 10) || 0;
  const dailyRateNum = parseFloat(dailyRateVal) || 0;
  const totalDailyRatePay = daysWorkedNum * dailyRateNum;

  // --- FILTER OUT ZERO COMMISSIONS AND GROUP BY UNIT ---
  const filteredOSList = payrollData
    ? payrollData.osList.filter(os => os.commission > 0)
    : [];

  const totalOSCommissionsFiltered = filteredOSList.reduce((sum, item) => sum + item.commission, 0);

  // Group O.S. by Unit
  const mkOSList = filteredOSList.filter(os => os.unitName.toLowerCase().includes("mk"));
  const zionixOSList = filteredOSList.filter(os => os.unitName.toLowerCase().includes("zionix"));
  const otherOSList = filteredOSList.filter(os => !os.unitName.toLowerCase().includes("mk") && !os.unitName.toLowerCase().includes("zionix"));

  const totalMKOS = mkOSList.reduce((sum, item) => sum + item.commission, 0);
  const totalZionixOS = zionixOSList.reduce((sum, item) => sum + item.commission, 0);
  const totalOtherOS = otherOSList.reduce((sum, item) => sum + item.commission, 0);

  // Group PDV Sales by Unit
  const salesList = payrollData ? payrollData.salesList : [];
  const mkSalesList = salesList.filter(sale => sale.unitName.toLowerCase().includes("mk"));
  const zionixSalesList = salesList.filter(sale => sale.unitName.toLowerCase().includes("zionix"));
  const otherSalesList = salesList.filter(sale => !sale.unitName.toLowerCase().includes("mk") && !sale.unitName.toLowerCase().includes("zionix"));

  const totalMKSales = mkSalesList.reduce((sum, item) => sum + item.commission, 0);
  const totalZionixSales = zionixSalesList.reduce((sum, item) => sum + item.commission, 0);
  const totalOtherSales = otherSalesList.reduce((sum, item) => sum + item.commission, 0);

  const totalVales = payrollData ? payrollData.totalVales : 0;

  const totalPayrollPay = totalDailyRatePay + totalOSCommissionsFiltered + (payrollData?.totalAccessoryCommissions || 0) - totalVales;

  const handleCalculate = () => {
    if (!selectedUserId) {
      toast.error("Por favor, selecione um funcionário.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Por favor, informe o período completo.");
      return;
    }

    startTransition(async () => {
      const res = await calculateSalaryPayrollAction(selectedUserId, startDate, endDate, unitFilter);
      if (res.error) {
        toast.error(res.error);
        setPayrollData(null);
      } else {
        setPayrollData(res as any);
        toast.success("Cálculo salarial processado com sucesso!");
      }
    });
  };

  const handleSaveVale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error("Selecione um funcionário antes de lançar o vale.");
      return;
    }
    const val = parseFloat(valeAmount) || 0;
    if (val <= 0) {
      toast.error("Informe um valor de vale maior que R$ 0,00.");
      return;
    }
    if (!valeDescription.trim()) {
      toast.error("Informe o motivo/descrição do vale.");
      return;
    }

    setSavingVale(true);
    try {
      const res = await createSalaryValeAction(selectedUserId, val, valeDescription, valeDate);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Vale registrado no caixa com sucesso!");
        setValeAmount("");
        setValeDescription("");
        // Refresh calculations automatically
        const refresh = await calculateSalaryPayrollAction(selectedUserId, startDate, endDate, unitFilter);
        if (!refresh.error) {
          setPayrollData(refresh as any);
        }
      }
    } catch (err) {
      toast.error("Erro técnico ao salvar vale.");
    } finally {
      setSavingVale(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Optimized Printable Sheet CSS rules */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 10px !important;
          }
          aside, header, nav, button, form, .print-hidden {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-card {
            border: 1px solid #ccc !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border-radius: 8px !important;
            margin-bottom: 12px !important;
          }
          .print-title {
            color: black !important;
            background-color: #f3f4f6 !important;
            border-bottom: 1px solid #ccc !important;
            padding: 6px 12px !important;
            font-size: 11px !important;
          }
          table {
            width: 100% !important;
          }
          th, td {
            padding: 4px 8px !important;
            font-size: 9px !important;
            color: black !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print-hidden">
        <PageHeader title="Cálculo de Salário e Comissões" showBack={false} />
        {payrollData && (
          <Button 
            onClick={handlePrintReport}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/10 active:scale-95 transition-all"
            icon={Printer}
          >
            Imprimir Demonstrativo
          </Button>
        )}
      </div>

      {/* Main Parameters setup card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print-hidden">
        {/* Param Setup */}
        <div className="lg:col-span-2 bg-[#090e1a] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Coins className="w-4 h-4 text-indigo-400" />
            <span>Configuração dos Parâmetros Salariais</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-bold text-white">
            {/* Employee Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Funcionário</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-bold"
              >
                <option value="">-- Selecione --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role === "ADMIN" ? "Admin" : emp.role === "SUPER_ADMIN" ? "Super" : "Técnico"})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Initial */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Data Inicial</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Date Final */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Data Final</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Days worked */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Dias Referentes da Quinzena / Trabalhados</label>
              <input
                type="number"
                min="0"
                placeholder="Ex: 15"
                value={daysWorked}
                onChange={(e) => setDaysWorked(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Daily rate value */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Valor da Diária (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={dailyRateVal}
                  onChange={(e) => setDailyRateVal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Unit filter type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Abrangência de Unidades</label>
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-bold"
              >
                <option value="all">Todas as Unidades (Integrado)</option>
                <option value="current">Apenas Unidade Selecionada</option>
              </select>
            </div>
          </div>

          {/* Dynamic Daily rates display */}
          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2 text-indigo-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Multiplicação de diárias:</span>
              <span className="font-mono text-slate-450">{daysWorkedNum} dias x R$ {dailyRateNum.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase">Total Diárias</span>
              <span className="text-base text-indigo-400 font-extrabold font-mono">R$ {totalDailyRatePay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleCalculate}
              disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full md:w-auto px-8"
              icon={Coins}
            >
              {isPending ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Calculando folha...</span>
                </div>
              ) : (
                <span>Processar Fechamento Salarial</span>
              )}
            </Button>
          </div>
        </div>

        {/* Vale (Advances / Draws) form card */}
        <div className="bg-[#090e1a] border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <form onSubmit={handleSaveVale} className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <MinusCircle className="w-4 h-4 text-rose-500" />
              <span>Lançar Novo Vale (Adiantamento)</span>
            </h3>

            {/* Vale Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Valor do Vale (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                  value={valeAmount}
                  onChange={(e) => setValeAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
              </div>
            </div>

            {/* Vale Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Data do Adiantamento</label>
              <input
                type="date"
                required
                value={valeDate}
                onChange={(e) => setValeDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Vale Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Motivo / Descrição</label>
              <input
                type="text"
                placeholder="Ex: Vale p/ almoço, Adiantamento dia 10..."
                required
                value={valeDescription}
                onChange={(e) => setValeDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <Button
              type="submit"
              disabled={savingVale || !selectedUserId}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold"
              icon={Plus}
            >
              {savingVale ? "Salvando vale..." : "Confirmar Lançamento de Vale"}
            </Button>
          </form>
        </div>
      </div>

      {/* payroll reports and summaries */}
      {payrollData ? (
        <div className="space-y-6 print-container animate-in fade-in duration-200">
          
          {/* Header to print */}
          <div className="hidden print:block text-center border-b border-slate-300 pb-2 mb-4">
            <h2 className="text-base font-black uppercase tracking-tight">DEMONSTRATIVO DE SALÁRIO E COMISSÕES</h2>
            <div className="flex justify-between items-center text-[9px] mt-1 font-bold text-slate-700">
              <span>Colaborador: {payrollData.employeeName.toUpperCase()}</span>
              <span>Período: {new Date(startDate + "T12:00:00").toLocaleDateString("pt-BR")} a {new Date(endDate + "T12:00:00").toLocaleDateString("pt-BR")}</span>
              <span>Unidades: {unitFilter === "all" ? "TODAS" : "APENAS ATUAL"}</span>
            </div>
          </div>

          {/* SECTION 1: Payroll Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 print-hidden">
            {/* Daily Rates card */}
            <div className="bg-[#0c1322] border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Diárias da Quinzena</span>
                <span className="text-xs text-slate-500 block mt-1 font-bold">{daysWorkedNum} dias a R$ {dailyRateNum.toFixed(2)}</span>
              </div>
              <span className="text-xl font-black text-white font-mono mt-3 block">
                R$ {totalDailyRatePay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* OS Commissions card */}
            <div className="bg-[#0c1322] border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Comissões O.S. (Valores &gt; 0)</span>
                <span className="text-xs text-slate-500 block mt-1 font-bold">{filteredOSList.length} serviços finalizados</span>
              </div>
              <span className="text-xl font-black text-white font-mono mt-3 block">
                R$ {totalOSCommissionsFiltered.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Accessory Commissions card */}
            <div className="bg-[#0c1322] border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Acessórios (2% PDV)</span>
                <span className="text-xs text-slate-500 block mt-1 font-bold">Vendas no caixa</span>
              </div>
              <span className="text-xl font-black text-white font-mono mt-3 block">
                R$ {payrollData.totalAccessoryCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Vales Deduzidos card */}
            <div className="bg-[#0c1322] border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adiantamentos / Vales</span>
                <span className="text-xs text-rose-500 block mt-1 font-bold">{payrollData.valesList.length} vales deduzidos</span>
              </div>
              <span className="text-xl font-black text-rose-400 font-mono mt-3 block">
                - R$ {payrollData.totalVales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Consolidated Total Pay */}
            <div className="bg-indigo-950/20 border border-indigo-500/20 p-5 rounded-2xl flex flex-col justify-between shadow shadow-indigo-500/5">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block font-black">Líquido Final a Receber</span>
                <span className="text-xs text-indigo-300 block mt-1 font-bold">Diárias + Comissões - Vales</span>
              </div>
              <span className="text-xl font-black text-indigo-400 font-mono mt-3 block">
                R$ {totalPayrollPay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* SECTION 2: O.S. Services grouped by Unit (Desconsiderando R$ 0,00) */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 print-title">
              <Wrench className="w-4 h-4 text-indigo-400" />
              <span>Detalhamento de Comissões por Ordem de Serviço</span>
            </h3>

            {/* A. SERVIÇOS PELA MK */}
            <div className="bg-[#090e1a] border border-slate-800/80 rounded-xl overflow-hidden print-card">
              <h4 className="px-5 py-2.5 bg-[#030712] border-b border-slate-800 text-[10px] font-black text-indigo-400 uppercase tracking-wider print-title">
                Serviços pela MK:
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#030712]/30 border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[9px] print:text-black">
                    <tr>
                      <th className="px-4 py-2">Data</th>
                      <th className="px-4 py-2">Nº O.S.</th>
                      <th className="px-4 py-2">Aparelho / Equipamento</th>
                      <th className="px-4 py-2 text-right">Valor Comissão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 print:divide-black">
                    {mkOSList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-slate-500 italic">Nenhum serviço faturado na MK Imports.</td>
                      </tr>
                    ) : (
                      mkOSList.map((os) => (
                        <tr key={os.id} className="hover:bg-slate-800/10 text-slate-300 print:text-black font-medium">
                          <td className="px-4 py-2">{os.date}</td>
                          <td className="px-4 py-2 font-mono font-bold text-white print:text-black">#{String(os.osNumber).padStart(4, "0")}</td>
                          <td className="px-4 py-2">{os.equipment}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-white print:text-black">R$ {os.commission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                    {mkOSList.length > 0 && (
                      <tr className="bg-[#030712]/40 font-bold text-white print:text-black">
                        <td colSpan={3} className="px-4 py-2 text-right text-[9px] uppercase text-slate-450 print:text-black">SUBTOTAL MK:</td>
                        <td className="px-4 py-2 text-right font-mono text-indigo-400 print:text-black font-black">
                          R$ {totalMKOS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* B. SERVIÇOS PELA ZIONIX */}
            <div className="bg-[#090e1a] border border-slate-800/80 rounded-xl overflow-hidden print-card">
              <h4 className="px-5 py-2.5 bg-[#030712] border-b border-slate-800 text-[10px] font-black text-indigo-400 uppercase tracking-wider print-title">
                Serviços pela Zionix:
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#030712]/30 border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[9px] print:text-black">
                    <tr>
                      <th className="px-4 py-2">Data</th>
                      <th className="px-4 py-2">Nº O.S.</th>
                      <th className="px-4 py-2">Aparelho / Equipamento</th>
                      <th className="px-4 py-2 text-right">Valor Comissão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 print:divide-black">
                    {zionixOSList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-slate-500 italic">Nenhum serviço faturado na Zionix.</td>
                      </tr>
                    ) : (
                      zionixOSList.map((os) => (
                        <tr key={os.id} className="hover:bg-slate-800/10 text-slate-300 print:text-black font-medium">
                          <td className="px-4 py-2">{os.date}</td>
                          <td className="px-4 py-2 font-mono font-bold text-white print:text-black">#{String(os.osNumber).padStart(4, "0")}</td>
                          <td className="px-4 py-2">{os.equipment}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-white print:text-black">R$ {os.commission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                    {zionixOSList.length > 0 && (
                      <tr className="bg-[#030712]/40 font-bold text-white print:text-black">
                        <td colSpan={3} className="px-4 py-2 text-right text-[9px] uppercase text-slate-455 print:text-black">SUBTOTAL ZIONIX:</td>
                        <td className="px-4 py-2 text-right font-mono text-indigo-400 print:text-black font-black">
                          R$ {totalZionixOS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* C. OUTRAS UNIDADES (Caso existam) */}
            {otherOSList.length > 0 && (
              <div className="bg-[#090e1a] border border-slate-800/80 rounded-xl overflow-hidden print-card">
                <h4 className="px-5 py-2.5 bg-[#030712] border-b border-slate-800 text-[10px] font-black text-indigo-400 uppercase tracking-wider print-title">
                  Outras Unidades:
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#030712]/30 border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[9px] print:text-black">
                      <tr>
                        <th className="px-4 py-2">Unidade</th>
                        <th className="px-4 py-2">Data</th>
                        <th className="px-4 py-2">Nº O.S.</th>
                        <th className="px-4 py-2">Aparelho / Equipamento</th>
                        <th className="px-4 py-2 text-right">Valor Comissão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/60 print:divide-black">
                      {otherOSList.map((os) => (
                        <tr key={os.id} className="hover:bg-slate-800/10 text-slate-300 print:text-black font-medium">
                          <td className="px-4 py-2 font-bold">{os.unitName}</td>
                          <td className="px-4 py-2">{os.date}</td>
                          <td className="px-4 py-2 font-mono font-bold text-white print:text-black">#{String(os.osNumber).padStart(4, "0")}</td>
                          <td className="px-4 py-2">{os.equipment}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-white print:text-black">R$ {os.commission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                      <tr className="bg-[#030712]/40 font-bold text-white print:text-black">
                        <td colSpan={4} className="px-4 py-2 text-right text-[9px] uppercase text-slate-450 print:text-black">SUBTOTAL OUTRAS:</td>
                        <td className="px-4 py-2 text-right font-mono text-indigo-400 print:text-black font-black">
                          R$ {totalOtherOS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: PDV Sales Separated by Unit */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 print-title">
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <span>Detalhamento de Vendas de Acessórios (2% PDV)</span>
            </h3>

            {/* A. PDV MK */}
            {mkSalesList.length > 0 && (
              <div className="bg-[#090e1a] border border-slate-800/80 rounded-xl overflow-hidden print-card">
                <h4 className="px-5 py-2.5 bg-[#030712] border-b border-slate-800 text-[10px] font-black text-emerald-400 uppercase tracking-wider print-title">
                  Vendas PDV pela MK:
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#030712]/30 border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[9px] print:text-black">
                      <tr>
                        <th className="px-4 py-2">Data</th>
                        <th className="px-4 py-2">Acessório / Produto</th>
                        <th className="px-4 py-2 text-center">Qtd</th>
                        <th className="px-4 py-2 text-right">Unitário</th>
                        <th className="px-4 py-2 text-right">Valor Bruto</th>
                        <th className="px-4 py-2 text-right">Comissão (2%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/60 print:divide-black">
                      {mkSalesList.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-800/10 text-slate-300 print:text-black font-medium">
                          <td className="px-4 py-2">{sale.date}</td>
                          <td className="px-4 py-2 font-bold text-white print:text-black">{sale.productName}</td>
                          <td className="px-4 py-2 text-center">{sale.quantity}</td>
                          <td className="px-4 py-2 text-right font-mono">R$ {sale.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono">R$ {sale.grossValue.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-emerald-400 print:text-black">R$ {sale.commission.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-[#030712]/40 font-bold text-white print:text-black">
                        <td colSpan={5} className="px-4 py-2 text-right text-[9px] uppercase text-slate-450 print:text-black">SUBTOTAL PDV MK:</td>
                        <td className="px-4 py-2 text-right font-mono text-emerald-400 print:text-black font-black">
                          R$ {totalMKSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* B. PDV ZIONIX */}
            {zionixSalesList.length > 0 && (
              <div className="bg-[#090e1a] border border-slate-800/80 rounded-xl overflow-hidden print-card">
                <h4 className="px-5 py-2.5 bg-[#030712] border-b border-slate-800 text-[10px] font-black text-emerald-400 uppercase tracking-wider print-title">
                  Vendas PDV pela Zionix:
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#030712]/30 border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[9px] print:text-black">
                      <tr>
                        <th className="px-4 py-2">Data</th>
                        <th className="px-4 py-2">Acessório / Produto</th>
                        <th className="px-4 py-2 text-center">Qtd</th>
                        <th className="px-4 py-2 text-right">Unitário</th>
                        <th className="px-4 py-2 text-right">Valor Bruto</th>
                        <th className="px-4 py-2 text-right">Comissão (2%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/60 print:divide-black">
                      {zionixSalesList.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-800/10 text-slate-300 print:text-black font-medium">
                          <td className="px-4 py-2">{sale.date}</td>
                          <td className="px-4 py-2 font-bold text-white print:text-black">{sale.productName}</td>
                          <td className="px-4 py-2 text-center">{sale.quantity}</td>
                          <td className="px-4 py-2 text-right font-mono">R$ {sale.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono">R$ {sale.grossValue.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-emerald-400 print:text-black">R$ {sale.commission.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-[#030712]/40 font-bold text-white print:text-black">
                        <td colSpan={5} className="px-4 py-2 text-right text-[9px] uppercase text-slate-450 print:text-black">SUBTOTAL PDV ZIONIX:</td>
                        <td className="px-4 py-2 text-right font-mono text-emerald-400 print:text-black font-black">
                          R$ {totalZionixSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: List of Vales */}
          {payrollData.valesList.length > 0 && (
            <div className="bg-[#090e1a] border border-slate-800/80 rounded-xl overflow-hidden print-card">
              <h4 className="px-5 py-2.5 bg-[#030712] border-b border-slate-800 text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 print-title">
                <MinusCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Demonstrativo de Vales / Adiantamentos Salariais Deduzidos</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#030712]/30 border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[9px] print:text-black">
                    <tr>
                      <th className="px-4 py-2">Unidade</th>
                      <th className="px-4 py-2">Data Lançamento</th>
                      <th className="px-4 py-2">Descrição do Vale</th>
                      <th className="px-4 py-2 text-right">Valor Deduzido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 print:divide-black font-medium">
                    {payrollData.valesList.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/10 text-slate-300 print:text-black">
                        <td className="px-4 py-2">{v.unitName}</td>
                        <td className="px-4 py-2">{v.date}</td>
                        <td className="px-4 py-2 text-white print:text-black font-semibold">{v.description}</td>
                        <td className="px-4 py-2 text-right font-mono font-bold text-rose-400 print:text-black">
                          - R$ {v.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#030712]/40 font-bold text-white print:text-black">
                      <td colSpan={3} className="px-4 py-2 text-right text-[9px] uppercase text-slate-450 print:text-black">TOTAL DE VALES DEDUZIDOS:</td>
                      <td className="px-4 py-2 text-right font-mono text-rose-400 print:text-black font-black">
                        - R$ {totalVales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 5: Consolidated Final Receipt (Compact Layout) */}
          <div className="bg-[#0c1322] border border-slate-800 p-5 rounded-xl max-w-md mx-auto shadow-2xl space-y-3 print-card print:p-4 print:mt-4">
            <h4 className="text-center font-extrabold text-white uppercase tracking-wider text-[10px] border-b border-slate-800 pb-2 flex items-center justify-center gap-2 print-title">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Discriminativo Consolidado de Fechamento</span>
            </h4>

            <div className="space-y-2 text-xs font-semibold text-slate-300 print:text-black">
              {/* Daily rates info */}
              <div className="flex justify-between items-center py-1 border-b border-slate-850 print:border-slate-300">
                <span className="text-slate-400 print:text-black font-bold">Valor das Diárias da Quinzena ({daysWorkedNum} dias):</span>
                <span className="font-mono text-white print:text-black font-extrabold">R$ {totalDailyRatePay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              
              {/* OS MK Services */}
              <div className="flex justify-between items-center py-1 border-b border-slate-850 print:border-slate-300">
                <span className="text-slate-400 print:text-black">Comissão de Serviços (MK):</span>
                <span className="font-mono text-white print:text-black">R$ {totalMKOS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>

              {/* OS Zionix Services */}
              <div className="flex justify-between items-center py-1 border-b border-slate-850 print:border-slate-300">
                <span className="text-slate-400 print:text-black">Comissão de Serviços (Zionix):</span>
                <span className="font-mono text-white print:text-black">R$ {totalZionixOS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Other OS Services */}
              {totalOtherOS > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-slate-850 print:border-slate-300">
                  <span className="text-slate-400 print:text-black">Comissão de Serviços (Outras):</span>
                  <span className="font-mono text-white print:text-black">R$ {totalOtherOS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {/* MK Sales */}
              {(totalMKSales > 0 || totalZionixSales > 0) && (
                <>
                  <div className="flex justify-between items-center py-1 border-b border-slate-850 print:border-slate-300">
                    <span className="text-slate-400 print:text-black">Comissão PDV Acessórios (MK):</span>
                    <span className="font-mono text-white print:text-black">R$ {totalMKSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-850 print:border-slate-300">
                    <span className="text-slate-400 print:text-black">Comissão PDV Acessórios (Zionix):</span>
                    <span className="font-mono text-white print:text-black">R$ {totalZionixSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}

              {/* Other Sales */}
              {totalOtherSales > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-slate-850 print:border-slate-300">
                  <span className="text-slate-400 print:text-black">Comissão PDV Acessórios (Outras):</span>
                  <span className="font-mono text-white print:text-black">R$ {totalOtherSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {/* Vale Advances */}
              <div className="flex justify-between items-center py-1 border-b border-slate-850 print:border-slate-300 text-rose-400 print:text-black">
                <span>(-) Adiantamentos / Vales Deduzidos:</span>
                <span className="font-mono font-bold">- R$ {totalVales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Final Liquido pay */}
              <div className="flex justify-between items-center pt-3 text-xs font-black text-white print:text-black">
                <span className="text-indigo-400 print:text-black uppercase tracking-wider font-extrabold text-[10px]">VALOR LÍQUIDO A PAGAR:</span>
                <span className="font-mono text-sm text-indigo-400 print:text-black font-black">
                  R$ {totalPayrollPay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Print Signatures Placeholder */}
            <div className="hidden print:block space-y-10 pt-10 text-[9px] text-center">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="border-t border-black w-36 mx-auto pt-0.5" />
                  <p className="font-bold">ZIONIX IMPORT / ASSISTÊNCIA</p>
                  <p className="text-[8px] text-slate-500">Assinatura do Empregador</p>
                </div>
                <div>
                  <div className="border-t border-black w-36 mx-auto pt-0.5" />
                  <p className="font-bold">{payrollData.employeeName.toUpperCase()}</p>
                  <p className="text-[8px] text-slate-500">Assinatura do Colaborador</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        // Empty state placeholder
        <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-4 print-hidden">
          <AlertCircle className="w-12 h-12 text-slate-600 animate-pulse" />
          <h3 className="text-base font-bold text-slate-400 uppercase tracking-wider">Nenhum cálculo processado</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Selecione o funcionário, defina as datas de início/fim e as diárias trabalhadas para calcular o fechamento financeiro completo.
          </p>
        </div>
      )}
    </div>
  );
}
