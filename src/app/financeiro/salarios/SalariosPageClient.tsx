"use client";

import React, { useState, useTransition } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { 
  Coins, Calendar, DollarSign, Users, Loader2, 
  Wrench, ShoppingCart, Percent, AlertCircle, FileText, Printer 
} from "lucide-react";
import { calculateSalaryPayrollAction } from "@/app/actions/salary";
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
  
  // Set default date values (current month: from 1st to today)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Daily rate calculations inputs
  const [daysWorked, setDaysWorked] = useState("0");
  const [dailyRateVal, setDailyRateVal] = useState("0");

  // Calculation results
  const [payrollData, setPayrollData] = useState<{
    employeeName: string;
    osList: Array<{ id: string; osNumber: number; date: string; equipment: string; commission: number }>;
    totalOSCommissions: number;
    salesList: Array<{ id: string; date: string; productName: string; quantity: number; unitPrice: number; grossValue: number; commission: number }>;
    totalAccessoryCommissions: number;
  } | null>(null);

  const daysWorkedNum = parseInt(daysWorked, 10) || 0;
  const dailyRateNum = parseFloat(dailyRateVal) || 0;
  const totalDailyRatePay = daysWorkedNum * dailyRateNum;

  const totalPayrollPay = payrollData 
    ? (totalDailyRatePay + payrollData.totalOSCommissions + payrollData.totalAccessoryCommissions)
    : 0;

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
      const res = await calculateSalaryPayrollAction(selectedUserId, startDate, endDate);
      if (res.error) {
        toast.error(res.error);
        setPayrollData(null);
      } else {
        setPayrollData(res as any);
        toast.success("Cálculo salarial processado com sucesso!");
      }
    });
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Printable Sheet CSS rules */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          aside, header, nav, button, form, .print-hidden {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-card {
            border: 1px solid black !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
          .print-title {
            color: black !important;
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
      <div className="bg-[#090e1a] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6 print-hidden">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <Coins className="w-4 h-4 text-indigo-400" />
          <span>Configuração dos Parâmetros Salariais</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 font-bold text-white">
          {/* Employee Selection */}
          <div className="space-y-1.5 md:col-span-1">
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

          {/* Period Range Start */}
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Period Range End */}
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Days Worked */}
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Dias Trabalhados</label>
            <input
              type="number"
              min="0"
              placeholder="Ex: 15"
              value={daysWorked}
              onChange={(e) => setDaysWorked(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Daily Rate Price */}
          <div className="space-y-1.5 md:col-span-1">
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
        </div>

        {/* Dynamic Calculator Feedback */}
        <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2 text-indigo-300">
            <AlertCircle className="w-4 h-4" />
            <span>Multiplicação de diárias em tempo real:</span>
            <span className="font-mono text-slate-450">{daysWorkedNum} dias x R$ {dailyRateNum.toFixed(2)} / dia</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase">Total Diárias</span>
            <span className="text-base text-indigo-400 font-extrabold font-mono">R$ {totalDailyRatePay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Action Button */}
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
                <span>Calculando comissões...</span>
              </div>
            ) : (
              <span>Processar Folha de Comissões</span>
            )}
          </Button>
        </div>
      </div>

      {/* payroll reports and summaries */}
      {payrollData ? (
        <div className="space-y-8 print-container">
          
          {/* Header to print */}
          <div className="hidden print:block text-center border-b border-black pb-4 mb-6">
            <h2 className="text-xl font-bold uppercase">Demonstrativo de Salário e Comissões</h2>
            <p className="text-xs">Período: {new Date(startDate + "T12:00:00").toLocaleDateString("pt-BR")} a {new Date(endDate + "T12:00:00").toLocaleDateString("pt-BR")}</p>
            <p className="text-xs font-bold mt-1">Funcionário: {payrollData.employeeName.toUpperCase()}</p>
          </div>

          {/* SECTION 1: Payroll Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print-hidden">
            {/* Daily Rates card */}
            <div className="bg-[#0c1322] border border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1. Total de Diárias</span>
                <span className="text-xs text-slate-500 block mt-1 font-bold">{daysWorkedNum} dias a R$ {dailyRateNum.toFixed(2)}</span>
              </div>
              <span className="text-2xl font-black text-white font-mono mt-4 block">
                R$ {totalDailyRatePay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* OS Commissions card */}
            <div className="bg-[#0c1322] border border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">2. Comissões O.S.</span>
                <span className="text-xs text-slate-500 block mt-1 font-bold">{payrollData.osList.length} serviços finalizados</span>
              </div>
              <span className="text-2xl font-black text-white font-mono mt-4 block">
                R$ {payrollData.totalOSCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Accessory Commissions card */}
            <div className="bg-[#0c1322] border border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">3. Venda de Acessórios</span>
                <span className="text-xs text-slate-500 block mt-1 font-bold">2% sobre vendas no PDV</span>
              </div>
              <span className="text-2xl font-black text-white font-mono mt-4 block">
                R$ {payrollData.totalAccessoryCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Consolidated Total Pay */}
            <div className="bg-indigo-950/20 border border-indigo-500/20 p-6 rounded-2xl flex flex-col justify-between shadow shadow-indigo-500/5">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Total Geral a Receber</span>
                <span className="text-xs text-indigo-300 block mt-1 font-bold">Soma consolidada do período</span>
              </div>
              <span className="text-2xl font-black text-indigo-400 font-mono mt-4 block">
                R$ {totalPayrollPay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* SECTION 2: List of Completed Service Orders */}
          <div className="bg-[#090e1a] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden print-card">
            <h4 className="px-6 py-4 bg-[#030712] border-b border-slate-800 text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 print-title">
              <Wrench className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Demonstrativo de Serviços e Ordens de Serviço (Técnico)</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#030712]/50 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider text-[10px] print:text-black">
                  <tr>
                    <th className="px-6 py-3.5">Data Saída</th>
                    <th className="px-6 py-3.5">Nº O.S.</th>
                    <th className="px-6 py-3.5">Aparelho / Equipamento</th>
                    <th className="px-6 py-3.5 text-right">Comissão / Mão de Obra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 divide-dashed print:divide-black">
                  {payrollData.osList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">
                        Nenhum serviço de O.S. finalizado pelo funcionário no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    payrollData.osList.map((os) => (
                      <tr key={os.id} className="hover:bg-slate-800/10 text-slate-355 print:text-black font-medium">
                        <td className="px-6 py-3">{os.date}</td>
                        <td className="px-6 py-3 font-mono font-bold text-white print:text-black">#{String(os.osNumber).padStart(4, "0")}</td>
                        <td className="px-6 py-3">{os.equipment}</td>
                        <td className="px-6 py-3 text-right font-mono font-bold text-white print:text-black">
                          R$ {os.commission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                  {payrollData.osList.length > 0 && (
                    <tr className="bg-[#030712]/30 font-bold text-white print:text-black border-t border-slate-800 print:border-black">
                      <td colSpan={3} className="px-6 py-3 text-right text-[10px] uppercase text-slate-400 print:text-black">SOMA DAS COMISSÕES:</td>
                      <td className="px-6 py-3 text-right font-mono text-indigo-400 print:text-black text-sm font-extrabold">
                        R$ {payrollData.totalOSCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: List of PDV Accessory Sales (2% Commission) */}
          <div className="bg-[#090e1a] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden print-card">
            <h4 className="px-6 py-4 bg-[#030712] border-b border-slate-800 text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 print-title">
              <ShoppingCart className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Demonstrativo de Vendas de Acessórios (2% PDV)</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#030712]/50 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider text-[10px] print:text-black">
                  <tr>
                    <th className="px-6 py-3.5">Data Venda</th>
                    <th className="px-6 py-3.5">Produto / Acessório</th>
                    <th className="px-6 py-3.5 text-center">Quantidade</th>
                    <th className="px-6 py-3.5 text-right">Preço Unitário</th>
                    <th className="px-6 py-3.5 text-right">Valor Bruto</th>
                    <th className="px-6 py-3.5 text-right">Comissão (2%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 divide-dashed print:divide-black">
                  {payrollData.salesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">
                        Nenhuma venda de acessórios no PDV efetuada pelo funcionário no período.
                      </td>
                    </tr>
                  ) : (
                    payrollData.salesList.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-800/10 text-slate-355 print:text-black font-medium">
                        <td className="px-6 py-3">{sale.date}</td>
                        <td className="px-6 py-3 font-bold text-white print:text-black">{sale.productName}</td>
                        <td className="px-6 py-3 text-center">{sale.quantity}</td>
                        <td className="px-6 py-3 text-right font-mono">R$ {sale.unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-3 text-right font-mono">R$ {sale.grossValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-3 text-right font-mono font-bold text-emerald-400 print:text-black">
                          R$ {sale.commission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                  {payrollData.salesList.length > 0 && (
                    <tr className="bg-[#030712]/30 font-bold text-white print:text-black border-t border-slate-800 print:border-black">
                      <td colSpan={5} className="px-6 py-3 text-right text-[10px] uppercase text-slate-400 print:text-black">SOMA DAS COMISSÕES (2%):</td>
                      <td className="px-6 py-3 text-right font-mono text-emerald-400 print:text-black text-sm font-extrabold">
                        R$ {payrollData.totalAccessoryCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: Consolidated Final Receipt */}
          <div className="bg-[#0c1322] border border-slate-800 p-6 rounded-2xl max-w-lg mx-auto shadow-2xl space-y-4 print-card">
            <h4 className="text-center font-extrabold text-white uppercase tracking-wider text-xs border-b border-slate-800 pb-3 flex items-center justify-center gap-2 print-title">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Discriminativo Consolidado de Fechamento</span>
            </h4>

            <div className="space-y-3 text-xs font-medium text-slate-300 print:text-black">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/50 print:border-black">
                <span className="text-slate-450 print:text-black">Valor das Diárias ({daysWorkedNum} dias):</span>
                <span className="font-mono font-bold text-white print:text-black">R$ {totalDailyRatePay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="flex justify-between items-center py-1 border-b border-slate-800/50 print:border-black">
                <span className="text-slate-450 print:text-black">Comissão de Serviços (O.S.):</span>
                <span className="font-mono font-bold text-white print:text-black">R$ {payrollData.totalOSCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-800/50 print:border-black">
                <span className="text-slate-450 print:text-black">Comissão de Acessórios (2% PDV):</span>
                <span className="font-mono font-bold text-white print:text-black">R$ {payrollData.totalAccessoryCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between items-center pt-4 text-sm font-extrabold text-white print:text-black">
                <span className="text-indigo-400 print:text-black uppercase tracking-wider">Valor Líquido Total a Pagar:</span>
                <span className="font-mono text-base text-indigo-400 print:text-black font-black">
                  R$ {totalPayrollPay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Print Signatures Placeholder */}
            <div className="hidden print:block space-y-12 pt-16 text-[10px] text-center">
              <div className="grid grid-cols-2 gap-12">
                <div>
                  <div className="border-t border-black w-40 mx-auto pt-1" />
                  <p className="font-bold">ZIONIX IMPORT / ASSISTÊNCIA</p>
                  <p className="text-[9px] text-slate-500">Assinatura do Empregador</p>
                </div>
                <div>
                  <div className="border-t border-black w-40 mx-auto pt-1" />
                  <p className="font-bold">{payrollData.employeeName.toUpperCase()}</p>
                  <p className="text-[9px] text-slate-500">Assinatura do Colaborador</p>
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
