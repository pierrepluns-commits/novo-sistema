import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentCashRegister } from "@/app/actions/caixa";
import { PageHeader } from "@/components/ui/PageHeader";
import { CashRegisterClient } from "@/components/forms/CashRegisterClient";
import { Banknote, CreditCard, Clock, Calculator } from "lucide-react";
import { ManualTransactionForm, EditSaleModal } from "@/components/forms/CaixaClientForms";
import { getSelectedUnitId } from "@/app/actions/unit";

export default async function CaixaPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const activeUnitId = await getSelectedUnitId();

  if (!activeUnitId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Controle de Caixa" showBack={false} />
        <div className="max-w-md mx-auto mt-10">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl p-6 text-center">
            <h2 className="text-xl font-bold text-cyan-400 mb-2">Selecione uma Unidade</h2>
            <p className="text-slate-400 mb-6 text-sm">
              Selecione uma unidade no cabeçalho geral para poder abrir, visualizar e gerenciar o caixa correspondente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const register = await getCurrentCashRegister();

  // Buscar todas as vendas concluídas no turno atual se houver caixa aberto
  const sales = register ? await prisma.sale.findMany({
    where: {
      unitId: register.unitId,
      createdAt: {
        gte: register.openedAt,
        lte: register.closedAt || new Date()
      }
    },
    include: {
      user: true,
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  }) : [];

  // Se houver caixa aberto, calcular totais
  let totals = { cash: 0, credit: 0, debit: 0, pix: 0, other: 0 };
  let cashOutflows = 0; // Sangrias e estornos em dinheiro
  let totalExpenses = 0; // Sangrias e estornos totais do turno

  if (register) {
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
          totals.cash += tx.amount; // Suprimento soma no dinheiro físico
        } else {
          totals.other += tx.amount;
        }
      } else {
        // Para EXPENSE (que não seja contábil, ou seja, Sangrias e Estornos)
        totalExpenses += tx.amount;

        // Se foi em dinheiro, deduzimos do saldo da gaveta física
        if (tx.category === "Saída Manual") {
          cashOutflows += tx.amount;
        } else if (tx.category === "Estorno") {
          if (tx.description.includes("Dinheiro") || tx.description.includes("CASH")) {
            cashOutflows += tx.amount;
          }
          // Também deduzimos dos respectivos totais para manter os resumos corretos
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
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Controle de Caixa" showBack={false} />

      {!register ? (
        <div className="max-w-md mx-auto mt-10">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl p-6 text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Banknote className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Caixa Fechado</h2>
            <p className="text-slate-400 mb-6 text-sm">Abra o caixa com o troco inicial para começar a realizar vendas no PDV.</p>
            
            <CashRegisterClient isOpen={false} registerId={null} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-400" />
                Resumo das Vendas (Turno Atual)
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Dinheiro</div>
                  <div className="text-lg font-bold text-emerald-400">R$ {totals.cash.toFixed(2)}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-slate-400 text-xs font-semibold uppercase mb-1">PIX</div>
                  <div className="text-lg font-bold text-blue-400">R$ {totals.pix.toFixed(2)}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-slate-400 text-xs font-semibold uppercase mb-1">Cartões</div>
                  <div className="text-lg font-bold text-purple-400">R$ {(totals.credit + totals.debit).toFixed(2)}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-red-500/20">
                  <div className="text-red-400 text-xs font-semibold uppercase mb-1">Saídas / Estornos</div>
                  <div className="text-lg font-bold text-red-500">R$ {totalExpenses.toFixed(2)}</div>
                </div>
              </div>

              <div className="bg-[#0a0f1c] border border-slate-800 rounded-xl p-4">
                <div className="flex justify-between items-center text-sm text-slate-400 mb-2">
                  <span>Troco Inicial (Abertura)</span>
                  <span>R$ {register.openingBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-slate-400 mb-4 pb-4 border-b border-slate-800">
                  <span>(+) Entradas em Dinheiro (-) Saídas</span>
                  <span>R$ {(totals.cash - cashOutflows).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xl font-bold">
                  <span className="text-white">Dinheiro Esperado na Gaveta</span>
                  <span className="text-emerald-500">R$ {(register.openingBalance + totals.cash - cashOutflows).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Painel interativo para Sangria/Suprimento */}
            <ManualTransactionForm />

            {/* Histórico de Vendas em Tempo Real */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Histórico de Vendas (Turno Atual)</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {sales.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Nenhuma venda realizada neste turno.</p>
                ) : (
                  sales.map(sale => (
                    <div key={sale.id} className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-sm font-bold text-white line-clamp-1">
                            {sale.items.map(item => `${item.quantity}x ${item.product?.name}`).join(", ") || `Venda #${sale.id.split("-")[0].toUpperCase()}`}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Venda #{sale.id.split("-")[0].toUpperCase()} • {new Date(sale.createdAt).toLocaleTimeString("pt-BR")} - Vendedor: <span className="font-semibold text-slate-400">{sale.user?.name || "Sistema"}</span>
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${
                          sale.paymentMethod === "CASH" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/10" :
                          sale.paymentMethod === "PIX" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/10" : "bg-purple-500/20 text-purple-400 border border-purple-500/10"
                        }`}>
                          {sale.paymentMethod === "CASH" ? "Dinheiro" : sale.paymentMethod === "PIX" ? "PIX" : sale.paymentMethod === "CREDIT_CARD" ? "Crédito" : "Débito"}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 space-y-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                        {sale.items.map(item => (
                          <div key={item.id} className="flex justify-between">
                            <span>{item.quantity}x {item.product?.name}</span>
                            <span>R$ {(item.quantity * item.unitPrice).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <EditSaleModal sale={sale} />
                          {(sale.paymentMethod === "CREDIT_CARD" || sale.paymentMethod === "DEBIT_CARD") && (
                            <span className="text-[10px] text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800/50">
                              Taxa: R$ {sale.cardFee.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <span className="font-black text-emerald-400 text-base">
                          Total: R$ {sale.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Lançamentos no Livro Caixa (Turno Atual)</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {register.transactions.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Nenhuma transação ainda.</p>
                ) : (
                  register.transactions
                    .map(tx => (
                      <div key={tx.id} className="flex justify-between items-center bg-slate-800/30 p-3.5 rounded-lg border border-slate-700/30">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-200">{tx.description}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px]">
                            <span className="bg-slate-950 text-indigo-400 px-1.5 py-0.5 rounded font-mono uppercase font-bold border border-slate-850">
                              {tx.category || "Transação"}
                            </span>
                            <span className="text-slate-500">
                              por {tx.user?.name || "Sistema"}
                            </span>
                            <span className="text-slate-600 font-mono">
                              {new Date(tx.transactionDate).toLocaleTimeString("pt-BR")}
                            </span>
                          </div>
                        </div>
                        <div className={`font-bold text-sm shrink-0 ml-4 ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.type === 'INCOME' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-6">
              <h3 className="text-lg font-bold text-white mb-4">Fechamento</h3>
              <p className="text-sm text-slate-400 mb-6">Confira os valores antes de fechar o turno. O PDV será bloqueado até a próxima abertura.</p>
              
              <CashRegisterClient 
                isOpen={true} 
                registerId={register.id} 
                expectedCash={(register.openingBalance + totals.cash - cashOutflows)} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
