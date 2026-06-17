"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Calculator } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CaixaPrintClientProps {
  register: any;
  sales: any[];
  serviceOrders: any[];
}

export default function CaixaPrintClient({ register, sales, serviceOrders }: CaixaPrintClientProps) {
  const router = useRouter();

  useEffect(() => {
    // Automatically trigger print dialog on load
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Calculate totals
  let totals = { cash: 0, credit: 0, debit: 0, pix: 0, other: 0 };
  let cashOutflows = 0;
  let totalExpenses = 0;

  for (const tx of register.transactions) {
    if (tx.type === "INCOME") {
      if (tx.description.includes("CASH") || tx.description.includes("Dinheiro")) {
        totals.cash += tx.amount;
      } else if (tx.description.includes("CREDIT") || tx.description.includes("Crédito")) {
        totals.credit += tx.amount;
      } else if (tx.description.includes("DEBIT") || tx.description.includes("Débito")) {
        totals.debit += tx.amount;
      } else if (tx.description.includes("PIX")) {
        totals.pix += tx.amount;
      } else if (tx.category === "Entrada Manual") {
        totals.cash += tx.amount; // Suprimento
      } else {
        totals.other += tx.amount;
      }
    } else {
      totalExpenses += tx.amount;
      // Somente deduzimos do saldo da gaveta física o que de fato sai em dinheiro (Sangria manual e estorno em dinheiro)
      if (tx.category === "Saída Manual") {
        cashOutflows += tx.amount;
      } else if (tx.category === "Estorno") {
        if (tx.description.includes("Dinheiro") || tx.description.includes("CASH")) {
          cashOutflows += tx.amount;
        }
        if (tx.description.includes("PIX")) {
          totals.pix -= tx.amount;
        } else if (tx.description.includes("Crédito") || tx.description.includes("CREDIT")) {
          totals.credit -= tx.amount;
        } else if (tx.description.includes("Débito") || tx.description.includes("DEBIT")) {
          totals.debit -= tx.amount;
        }
      }
    }
  }

  const expectedCash = register.openingBalance + totals.cash - cashOutflows;
  const declaredCash = register.closingBalance || 0;
  const difference = declaredCash - expectedCash;

  // OS calculations
  let totalOSBilled = 0;
  let totalOSPartsCost = 0;
  let totalOSOutsourcedCost = 0;
  let totalOSCommission = 0;

  const processedOS = serviceOrders.map((os) => {
    let checklistObj: Record<string, any> = {};
    try {
      checklistObj = JSON.parse(os.checklist || "{}");
    } catch {
      checklistObj = {};
    }
    const techName = checklistObj.technicianName || os.user?.name || "Sem Técnico";
    const billed = os.totalAmount;
    const partsCost = os.partsPrice || 0;
    const outsourcedCost = os.cost || 0;
    const commission = os.servicePrice * 0.5; // default 50% commission

    totalOSBilled += billed;
    totalOSPartsCost += partsCost;
    totalOSOutsourcedCost += outsourcedCost;
    totalOSCommission += commission;

    return {
      ...os,
      techName,
      billed,
      partsCost,
      outsourcedCost,
      commission,
    };
  });

  return (
    <div className="min-h-screen bg-[#020617] print:bg-white text-slate-100 print:text-black p-4 md:p-8">
      {/* Control bar (hidden on print) */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden bg-[#0f172a] border border-slate-800 p-4 rounded-xl">
        <Button
          onClick={() => router.push("/caixa")}
          variant="secondary"
          className="border border-slate-700 text-slate-300 hover:text-white"
          icon={ArrowLeft}
        >
          Voltar ao Caixa
        </Button>
        <Button
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
          icon={Printer}
        >
          Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Main Print Layout */}
      <div className="max-w-4xl mx-auto bg-[#0a0f1d] print:bg-white border border-slate-800 print:border-none rounded-2xl p-8 print:p-0 space-y-6 text-xs print:text-[10px] print:leading-snug">
        
        {/* Header */}
        <div className="border-b border-slate-800 print:border-black pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black uppercase text-white print:text-black">
              RELATÓRIO DE FECHAMENTO DE CAIXA
            </h1>
            <p className="text-slate-400 print:text-black font-semibold mt-1">
              Unidade: <span className="text-white print:text-black font-bold">{register.unit.name}</span>
            </p>
          </div>
          <div className="text-right text-[10px] text-slate-400 print:text-black font-mono">
            <div>Abertura: {new Date(register.openedAt).toLocaleString("pt-BR")}</div>
            {register.closedAt && <div>Fechamento: {new Date(register.closedAt).toLocaleString("pt-BR")}</div>}
            <div>Operador: {register.user.name}</div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white print:text-black uppercase border-b border-slate-800 print:border-black pb-1">
            Resumo Financeiro do Turno
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-slate-800 print:border-black rounded-lg p-3">
              <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase">Troco Inicial</span>
              <span className="text-base font-extrabold font-mono">R$ {register.openingBalance.toFixed(2)}</span>
            </div>
            <div className="border border-slate-800 print:border-black rounded-lg p-3">
              <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase">Esperado em Gaveta</span>
              <span className="text-base font-extrabold font-mono text-emerald-400 print:text-black">R$ {expectedCash.toFixed(2)}</span>
            </div>
            <div className="border border-slate-800 print:border-black rounded-lg p-3">
              <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase">Declarado em Gaveta</span>
              <span className="text-base font-extrabold font-mono text-indigo-400 print:text-black">R$ {declaredCash.toFixed(2)}</span>
            </div>
            <div className="border border-slate-800 print:border-black rounded-lg p-3">
              <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase">Diferença</span>
              <span className={`text-base font-extrabold font-mono ${difference >= 0 ? "text-green-400" : "text-rose-400"} print:text-black`}>
                R$ {difference.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <div className="bg-slate-900/40 print:bg-slate-100 p-2.5 rounded border border-slate-800 print:border-black/20">
              <span className="text-slate-500 print:text-black block text-[8px] uppercase">Recebido em Dinheiro</span>
              <span className="font-bold font-mono">R$ {totals.cash.toFixed(2)}</span>
            </div>
            <div className="bg-slate-900/40 print:bg-slate-100 p-2.5 rounded border border-slate-800 print:border-black/20">
              <span className="text-slate-500 print:text-black block text-[8px] uppercase">Recebido em PIX</span>
              <span className="font-bold font-mono">R$ {totals.pix.toFixed(2)}</span>
            </div>
            <div className="bg-slate-900/40 print:bg-slate-100 p-2.5 rounded border border-slate-800 print:border-black/20">
              <span className="text-slate-500 print:text-black block text-[8px] uppercase">Recebido em Cartão</span>
              <span className="font-bold font-mono">R$ {(totals.credit + totals.debit).toFixed(2)}</span>
            </div>
            <div className="bg-slate-900/40 print:bg-slate-100 p-2.5 rounded border border-slate-800 print:border-black/20">
              <span className="text-slate-500 print:text-black block text-[8px] uppercase">Total de Saídas</span>
              <span className="font-bold font-mono text-red-400 print:text-black">R$ {totalExpenses.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Manual Transactions */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white print:text-black uppercase border-b border-slate-800 print:border-black pb-1">
            Movimentações de Caixa (Sangrias e Suprimentos)
          </h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-850 print:border-black/40 text-[9px] uppercase text-slate-500 print:text-black font-bold">
                <th className="py-1">Hora</th>
                <th className="py-1">Tipo</th>
                <th className="py-1">Categoria</th>
                <th className="py-1">Descrição</th>
                <th className="py-1 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 print:divide-black/20 font-medium">
              {register.transactions.map((tx: any) => (
                <tr key={tx.id}>
                  <td className="py-1.5 font-mono">{new Date(tx.transactionDate).toLocaleTimeString("pt-BR")}</td>
                  <td className="py-1.5">{tx.type === "INCOME" ? "ENTRADA" : "SAÍDA"}</td>
                  <td className="py-1.5">{tx.category}</td>
                  <td className="py-1.5">{tx.description}</td>
                  <td className={`py-1.5 text-right font-mono font-bold ${tx.type === "INCOME" ? "text-emerald-400" : "text-red-400"} print:text-black`}>
                    R$ {tx.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
              {register.transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500 italic">Nenhuma movimentação lançada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sales */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white print:text-black uppercase border-b border-slate-800 print:border-black pb-1">
            Vendas do Turno (PDV)
          </h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-850 print:border-black/40 text-[9px] uppercase text-slate-500 print:text-black font-bold">
                <th className="py-1">Hora</th>
                <th className="py-1">Produtos</th>
                <th className="py-1">Forma Pagam.</th>
                <th className="py-1 text-right font-mono">Taxa Cartão</th>
                <th className="py-1 text-right font-mono">Total Billed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 print:divide-black/20 font-medium">
              {sales.map((sale: any) => (
                <tr key={sale.id}>
                  <td className="py-1.5 font-mono">{new Date(sale.createdAt).toLocaleTimeString("pt-BR")}</td>
                  <td className="py-1.5">
                    {sale.items.map((it: any) => `${it.quantity}x ${it.product?.name}`).join(", ")}
                  </td>
                  <td className="py-1.5">
                    {sale.paymentMethod === "CASH" ? "DINHEIRO" : sale.paymentMethod === "PIX" ? "PIX" : sale.paymentMethod === "CREDIT_CARD" ? "CRÉDITO" : "DÉBITO"}
                  </td>
                  <td className="py-1.5 text-right font-mono">R$ {sale.cardFee.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-mono font-bold text-emerald-400 print:text-black">
                    R$ {sale.totalAmount.toFixed(2)}
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500 italic">Nenhuma venda de PDV realizada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Service Orders */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white print:text-black uppercase border-b border-slate-800 print:border-black pb-1">
            Ordens de Serviço Entregues (Turno Atual)
          </h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-850 print:border-black/40 text-[9px] uppercase text-slate-500 print:text-black font-bold">
                <th className="py-1">O.S.</th>
                <th className="py-1">Aparelho</th>
                <th className="py-1">Cliente</th>
                <th className="py-1">Técnico</th>
                <th className="py-1">Pagam.</th>
                <th className="py-1 text-right font-mono">Cobrado</th>
                <th className="py-1 text-right font-mono">Custo</th>
                <th className="py-1 text-right font-mono">Comissão (50%)</th>
                <th className="py-1 text-right font-mono">Lucro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 print:divide-black/20 font-medium">
              {processedOS.map((os: any) => (
                <tr key={os.id}>
                  <td className="py-1.5 font-mono font-bold">#{os.osNumber}</td>
                  <td className="py-1.5">{os.equipmentBrand} {os.equipmentModel}</td>
                  <td className="py-1.5 truncate max-w-[120px]">{os.client.name}</td>
                  <td className="py-1.5">{os.techName}</td>
                  <td className="py-1.5">
                    {os.paymentMethod === "CASH" ? "DINHEIRO" : os.paymentMethod === "PIX" ? "PIX" : os.paymentMethod === "CREDIT_CARD" ? "CRÉDITO" : "DÉBITO"}
                  </td>
                  <td className="py-1.5 text-right font-mono">R$ {os.billed.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-mono">R$ {(os.partsCost + os.outsourcedCost).toFixed(2)}</td>
                  <td className="py-1.5 text-right font-mono">R$ {os.commission.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-mono font-bold text-emerald-400 print:text-black">
                    R$ {(os.billed - os.partsCost - os.outsourcedCost).toFixed(2)}
                  </td>
                </tr>
              ))}
              {serviceOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-slate-500 italic">Nenhuma O.S. finalizada.</td>
                </tr>
              )}
            </tbody>
            {serviceOrders.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-800 print:border-black font-extrabold text-[10px]">
                  <td colSpan={5} className="py-2">TOTAIS DE SERVIÇOS:</td>
                  <td className="py-2 text-right font-mono">R$ {totalOSBilled.toFixed(2)}</td>
                  <td className="py-2 text-right font-mono">R$ {(totalOSPartsCost + totalOSOutsourcedCost).toFixed(2)}</td>
                  <td className="py-2 text-right font-mono">R$ {totalOSCommission.toFixed(2)}</td>
                  <td className="py-2 text-right font-mono text-emerald-400 print:text-black">
                    R$ {(totalOSBilled - totalOSPartsCost - totalOSOutsourcedCost).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer Signature */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-center text-slate-400 print:text-black">
          <div className="space-y-1">
            <div className="border-t border-slate-800 print:border-black mx-auto max-w-[200px] pt-1"></div>
            <div className="text-[9px]">Assinatura do Operador ({register.user.name})</div>
          </div>
          <div className="space-y-1">
            <div className="border-t border-slate-800 print:border-black mx-auto max-w-[200px] pt-1"></div>
            <div className="text-[9px]">Assinatura do Gerente</div>
          </div>
        </div>

      </div>
    </div>
  );
}
