"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { addManualCashTransaction, updateOpeningBalance } from "@/app/actions/caixa";
import { updateSaleFee, updateSaleDetails, cancelSale } from "@/app/actions/pdv";
import toast from "react-hot-toast";
import { ArrowUpRight, ArrowDownRight, Edit2, Check, X, Plus, Minus, Calculator, Printer, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

// ==========================================
// 1. INLINE CARD FEE EDITOR component
// ==========================================
interface FeeEditorProps {
  saleId: string;
  initialFee: number;
}

export function InlineCardFeeEditor({ saleId, initialFee }: FeeEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [fee, setFee] = useState<string>(initialFee.toFixed(2));
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const numericFee = parseFloat(fee.replace(",", ".")) || 0;
    if (numericFee < 0) {
      toast.error("A taxa não pode ser negativa.");
      return;
    }

    setLoading(false);
    try {
      setLoading(true);
      await updateSaleFee(saleId, numericFee);
      toast.success("Taxa de cartão atualizada!");
      setIsEditing(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar taxa.");
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
        <div className="relative w-20">
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">R$</span>
          <input 
            type="number" 
            step="0.01" 
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            disabled={loading}
            className="w-full pl-6 pr-1 py-1 text-xs bg-[#0a0f1c] border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-500 font-semibold"
          />
        </div>
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/20 transition-all"
          title="Confirmar"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => { setFee(initialFee.toFixed(2)); setIsEditing(false); }} 
          disabled={loading}
          className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded border border-rose-500/20 transition-all"
          title="Cancelar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-300 font-bold text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
        R$ {initialFee.toFixed(2)}
      </span>
      <button 
        onClick={() => setIsEditing(true)} 
        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded transition-all"
        title="Editar Taxa"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ==========================================
// 1.5 EDIT SALE MODAL component
// ==========================================
interface EditSaleModalProps {
  sale: {
    id: string;
    paymentMethod: string;
    cardFee: number;
    totalAmount: number;
    createdAt?: Date | string;
    items: Array<{ product?: { name: string } | null }>;
  };
  canDelete?: boolean;
}

export function EditSaleModal({ sale, canDelete }: EditSaleModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod);
  const [cardFee, setCardFee] = useState<string>(sale.cardFee.toFixed(2));
  const [customDate, setCustomDate] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const isCard = paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD";

  const formatDatetimeLocal = (dateInput: Date | string | undefined) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericFee = isCard ? (parseFloat(cardFee.replace(",", ".")) || 0) : 0;
    if (numericFee < 0) {
      toast.error("A taxa do cartão não pode ser negativa.");
      return;
    }

    setLoading(true);
    try {
      await updateSaleDetails(sale.id, paymentMethod, numericFee, customDate || undefined);
      toast.success("Venda editada com sucesso!");
      setIsOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Erro ao editar venda.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Tem certeza que deseja estornar esta venda? Isso devolverá os produtos ao estoque e removerá os lançamentos financeiros correspondentes.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await cancelSale(sale.id);
      if (res && (res as any).error) {
        toast.error((res as any).error);
      } else {
        toast.success("Venda estornada e estoque devolvido com sucesso!");
        setIsOpen(false);
        router.refresh();
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao estornar venda.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setPaymentMethod(sale.paymentMethod);
    setCardFee(sale.cardFee.toFixed(2));
    setCustomDate(formatDatetimeLocal(sale.createdAt));
    setIsOpen(true);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded transition-all flex items-center gap-1 text-xs border border-slate-700/30 hover:border-slate-750"
        title="Editar Venda"
      >
        <Edit2 className="w-3.5 h-3.5" />
        <span>Editar</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 text-left">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-cyan-400" />
              Editar Venda
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Venda #{sale.id.split("-")[0].toUpperCase()} • Valor total: <span className="text-emerald-400 font-bold">R$ {sale.totalAmount.toFixed(2)}</span>
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: "CASH", label: "Dinheiro" },
                    { val: "PIX", label: "PIX" },
                    { val: "CREDIT_CARD", label: "Crédito" },
                    { val: "DEBIT_CARD", label: "Débito" }
                  ].map((m) => (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => setPaymentMethod(m.val)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                        paymentMethod === m.val
                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500"
                          : "bg-[#0a0f1c] text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Data/Hora da Venda (Retroativo)</label>
                <input
                  type="datetime-local"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#0a0f1c] border border-slate-700 rounded-lg text-white font-semibold focus:outline-none focus:border-cyan-500"
                />
              </div>

              {isCard && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Taxa da Maquininha (R$)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={cardFee}
                      onChange={(e) => setCardFee(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 text-sm bg-[#0a0f1c] border border-slate-700 rounded-lg text-white font-semibold focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Essa taxa será contabilizada como despesa de taxas/tarifas no financeiro.</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-slate-800/80">
                {canDelete ? (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
                    className="px-3 py-2 text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title="Estornar Venda"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Estornar</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={loading}
                    className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg text-xs"
                  >
                    {loading ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ==========================================
// 2. MANUAL CASH TRANSACTION (Sangria / Suprimento)
// ==========================================
export function ManualTransactionForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"INCOME" | "EXPENSE" | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpenForm = (transactionType: "INCOME" | "EXPENSE") => {
    setType(transactionType);
    setIsOpen(true);
    setAmount("");
    setDescription("");
  };

  const handleCancel = () => {
    setIsOpen(false);
    setType(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return;

    const valAmount = parseFloat(amount.replace(",", ".")) || 0;
    if (valAmount <= 0) {
      toast.error("O valor informado deve ser maior que zero.");
      return;
    }

    if (!description.trim()) {
      toast.error("Por favor, descreva o motivo da movimentação.");
      return;
    }

    setLoading(true);
    try {
      await addManualCashTransaction(type, valAmount, description);
      toast.success(type === "INCOME" ? "Suprimento lançado com sucesso!" : "Sangria lançada com sucesso!");
      setIsOpen(false);
      setType(null);
    } catch (e: any) {
      toast.error(e.message || "Erro ao realizar movimentação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Movimentações Manuais</h3>
        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">Gaveta</span>
      </div>

      {!isOpen ? (
        <div className="grid grid-cols-2 gap-3">
          <Button 
            type="button" 
            onClick={() => handleOpenForm("INCOME")}
            className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 font-bold border border-emerald-500/20 flex items-center justify-center gap-2 py-3"
          >
            <Plus className="w-4 h-4" />
            Suprimento (+)
          </Button>
          <Button 
            type="button" 
            onClick={() => handleOpenForm("EXPENSE")}
            className="bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 font-bold border border-rose-500/20 flex items-center justify-center gap-2 py-3"
          >
            <Minus className="w-4 h-4" />
            Sangria (-)
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-800/80 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              type === "INCOME" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/20 text-rose-400 border border-rose-500/20"
            }`}>
              {type === "INCOME" ? "Lançar Suprimento (Entrada)" : "Lançar Sangria (Saída / Dinheiro)"}
            </span>
            <button 
              type="button" 
              onClick={handleCancel}
              className="text-slate-400 hover:text-white text-xs font-semibold"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Valor (R$)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">R$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-2 py-2 text-sm bg-[#0a0f1c] border border-slate-700 rounded-lg text-white font-semibold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Motivo / Descrição</label>
              <input 
                type="text" 
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === "INCOME" ? "Ex: Adicionado troco extra" : "Ex: Pagamento de motoboy / frete"}
                className="w-full px-3 py-2 text-sm bg-[#0a0f1c] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button 
              type="submit" 
              disabled={loading}
              className={`font-black py-2 px-6 rounded-lg text-white shadow-md transition-all text-xs ${
                type === "INCOME" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              {loading ? "Processando..." : "Confirmar Lançamento"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ==========================================
// 3. SERVICE ORDERS SHIFT LIST component
// ==========================================
interface ShiftServiceOrder {
  id: string;
  osNumber: number;
  equipmentBrand: string;
  equipmentModel: string;
  equipmentType: string;
  servicePrice: number;
  partsPrice: number;
  cost: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string | null;
  updatedAt: Date | string;
  client: { name: string; phone: string };
  user: { name: string } | null;
  checklist: string;
}

interface ServiceOrdersShiftListProps {
  serviceOrders: ShiftServiceOrder[];
}

export function ServiceOrdersShiftList({ serviceOrders }: ServiceOrdersShiftListProps) {
  // Calculate overall shift totals
  let totalBilled = 0;
  let totalPartsCost = 0;
  let totalCommission = 0;

  const processedOrders = serviceOrders.map((os) => {
    let checklistObj: Record<string, any> = {};
    try {
      checklistObj = JSON.parse(os.checklist || "{}");
    } catch {
      checklistObj = {};
    }

    const techName = checklistObj.technicianName || os.user?.name || "Sem Técnico";
    
    // Billed amount to client = totalAmount (which is servicePrice - discount)
    const billed = os.totalAmount;
    const partsCost = os.partsPrice || 0;
    const commission = os.cost || 0;

    totalBilled += billed;
    totalPartsCost += partsCost;
    totalCommission += commission;

    return {
      ...os,
      techName,
      billed,
      partsCost,
      commission,
    };
  });

  const netProfitTotal = totalBilled - totalPartsCost - totalCommission;

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-400" />
            Resumo de Serviços e Comissões (Turno Atual)
          </h3>
          <p className="text-xs text-slate-400 mt-1">Ordens de serviço finalizadas e entregues no caixa atual</p>
        </div>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#0a0f1c] border border-slate-800 rounded-xl p-4">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Serviços</span>
          <div className="text-base font-extrabold text-white font-mono">
            R$ {totalBilled.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Peças</span>
          <div className="text-base font-extrabold text-amber-500 font-mono">
            R$ {totalPartsCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Comissões</span>
          <div className="text-base font-extrabold text-rose-400 font-mono">
            R$ {totalCommission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Lucro Líquido Real</span>
          <div className="text-base font-extrabold text-emerald-400 font-mono">
            R$ {netProfitTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Service Orders list */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {processedOrders.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Nenhuma ordem de serviço faturada neste turno.</p>
        ) : (
          processedOrders.map((os) => {
            const clientName = os.client.name;
            const isLojista = clientName.endsWith(" (Lojista)");
            const cleanClientName = isLojista ? clientName.substring(0, clientName.length - 10) : clientName;

            return (
              <div
                key={os.id}
                className="bg-[#1e293b]/20 p-4 rounded-xl border border-slate-700/30 space-y-3 hover:bg-[#1e293b]/30 transition-colors"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                        O.S. #{os.osNumber}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {os.equipmentBrand} {os.equipmentModel}
                      </span>
                      {isLojista && (
                        <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          Lojista
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Cliente: <span className="font-semibold text-slate-200">{cleanClientName}</span> • 
                      Técnico: <span className="font-semibold text-indigo-300">{os.techName}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      os.paymentMethod === "CASH" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/10" :
                      os.paymentMethod === "PIX" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/10" : "bg-purple-500/20 text-purple-400 border border-purple-500/10"
                    }`}>
                      {os.paymentMethod === "CASH" ? "Dinheiro" : os.paymentMethod === "PIX" ? "PIX" : os.paymentMethod === "CREDIT_CARD" ? "Crédito" : "Débito"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(os.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {/* Financial detail row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Cobrado (Total):</span>
                    <span className="font-mono text-white font-bold">R$ {os.billed.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Custo Peças:</span>
                    <span className="font-mono text-amber-500 font-bold">R$ {os.partsCost.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Comissão:</span>
                    <span className="font-mono text-rose-400 font-bold">R$ {os.commission.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Lucro Líquido:</span>
                    <span className="font-mono text-emerald-400 font-black">R$ {(os.billed - os.partsCost - os.commission).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface EditOpeningBalanceProps {
  registerId: string;
  initialBalance: number;
}

export function EditOpeningBalance({ registerId, initialBalance }: EditOpeningBalanceProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [balance, setBalance] = useState<string>(initialBalance.toFixed(2));
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const numericBalance = parseFloat(balance.replace(",", ".")) || 0;
    if (numericBalance < 0) {
      toast.error("O saldo de abertura não pode ser negativo.");
      return;
    }

    setLoading(true);
    try {
      await updateOpeningBalance(registerId, numericBalance);
      toast.success("Saldo de abertura atualizado!");
      setIsEditing(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar saldo.");
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
        <div className="relative w-28">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">R$</span>
          <input 
            type="number" 
            step="0.01" 
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            disabled={loading}
            className="w-full pl-8 pr-2 py-1.5 text-xs bg-[#0a0f1c] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-bold"
          />
        </div>
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 transition-all cursor-pointer"
          title="Confirmar"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => { setBalance(initialBalance.toFixed(2)); setIsEditing(false); }} 
          disabled={loading}
          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
          title="Cancelar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-bold text-slate-350">R$ {initialBalance.toFixed(2)}</span>
      <button 
        onClick={() => setIsEditing(true)} 
        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded transition-all cursor-pointer"
        title="Editar Saldo Inicial"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ==========================================
// 4. REPRINT RECEIPT BUTTON Component
// ==========================================
export function ReprintReceiptButton({ sale, users }: { sale: any, users?: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [receiptConfig, setReceiptConfig] = useState<any>(null);

  const handleReprint = async () => {
    setIsOpen(true);
    if (!receiptConfig) {
      try {
        const { getReceiptConfig } = await import("@/app/actions/config");
        const data = await getReceiptConfig();
        setReceiptConfig(data);
      } catch (err) {
        console.error("Failed to load receipt config", err);
      }
    }
  };

  const parsedReceiptConfig = (() => {
    try {
      return JSON.parse(receiptConfig?.receiptConfig || "{}");
    } catch (e) {
      return {};
    }
  })();

  const paperWidth = parsedReceiptConfig.paperWidth || "80mm";
  const margins = parsedReceiptConfig.margins || "8px";
  const showCashier = parsedReceiptConfig.showCashier ?? true;
  const showDocument = parsedReceiptConfig.showDocument ?? true;
  const showAddress = parsedReceiptConfig.showAddress ?? true;
  const showContact = parsedReceiptConfig.showContact ?? true;

  const cartItems = sale.cartItems || sale.items?.map((item: any) => ({
    id: item.productId,
    name: item.product?.name || "Produto",
    price: item.unitPrice,
    cartQuantity: item.quantity,
    isFreebie: item.isFreebie
  })) || [];

  const sellerName = sale.user?.name || users?.find((u: any) => u.id === sale.userId)?.name || "Vendedor";

  return (
    <>
      <button
        onClick={handleReprint}
        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded transition-all flex items-center gap-1 text-xs border border-slate-700/30 hover:border-slate-750 cursor-pointer animate-in fade-in duration-200"
        title="Reimprimir Nota"
      >
        <Printer className="w-3.5 h-3.5" />
        <span>Imprimir</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-start p-4 overflow-y-auto text-left font-sans print:p-0">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-sm rounded-xl shadow-2xl flex flex-col my-8 print:my-0 print:shadow-none print:w-[80mm] print:bg-white print:text-black">
            
            {/* Dynamic CSS for Print Bobbin styling */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #reprint-receipt-${sale.id}, #reprint-receipt-${sale.id} * {
                  visibility: visible !important;
                }
                #reprint-receipt-${sale.id} {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: ${paperWidth} !important;
                  padding: ${margins} !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                  background: white !important;
                  color: black !important;
                }
                @page {
                  margin: 0;
                }
              }
            ` }} />

            {/* The printable area */}
            <div 
              style={{ 
                width: paperWidth === "58mm" ? "240px" : "330px", 
                padding: margins 
              }}
              className="bg-white text-black font-mono shadow-inner text-xs p-6" 
              id={`reprint-receipt-${sale.id}`}
            >
              <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
                <h2 className="font-extrabold text-base uppercase tracking-tight">
                  {(receiptConfig?.unitName || receiptConfig?.companyName || "CYBER ERP").toUpperCase()}
                </h2>
                
                {showDocument && (receiptConfig?.unitDocument || receiptConfig?.companyDocument) && (
                  <p className="text-[10px] text-gray-700 mt-0.5 font-bold">
                    CNPJ/CPF: {receiptConfig?.unitDocument || receiptConfig?.companyDocument}
                  </p>
                )}
                
                {showAddress && receiptConfig?.unitAddress && (
                  <p className="text-[9px] text-gray-600 mt-0.5 leading-tight">
                    {receiptConfig.unitAddress}
                  </p>
                )}
                
                {showContact && receiptConfig?.unitContact && (
                  <p className="text-[9px] text-gray-600 mt-0.5 font-bold">
                    {receiptConfig.unitContact}
                  </p>
                )}

                {receiptConfig?.receiptHeader && (
                  <p className="text-[10px] italic border-t border-b border-dashed border-gray-300 py-1 my-1.5 text-gray-800 break-words whitespace-pre-line">
                    {receiptConfig.receiptHeader}
                  </p>
                )}

                <p className="text-[10px] font-bold mt-2">RECIBO #{sale.id.split("-")[0].toUpperCase()}</p>
                <p className="text-[9px] text-gray-500">{new Date(sale.createdAt).toLocaleString("pt-BR")}</p>
                
                {showCashier && (
                  <p className="text-[9px] text-gray-600 font-semibold mt-0.5">
                    VENDEDOR: {sellerName.toUpperCase()}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <table className="w-full text-[11px] table-fixed">
                  <thead>
                    <tr className="border-b border-dashed border-gray-400">
                      <th className="w-[12%] text-left py-1">QTD</th>
                      <th className="w-[48%] text-left py-1">ITEM</th>
                      <th className="w-[20%] text-right py-1">UN</th>
                      <th className="w-[20%] text-right py-1">TOT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-100/50">
                        <td className="py-1 align-top text-left">{item.cartQuantity}</td>
                        <td className="py-1 align-top text-left break-words">{item.name} {item.isFreebie && "(Brinde)"}</td>
                        <td className="py-1 align-top text-right">{item.isFreebie ? "0.00" : item.price.toFixed(2)}</td>
                        <td className="py-1 align-top text-right">{item.isFreebie ? "0.00" : (item.price * item.cartQuantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-dashed border-gray-400 pt-2 text-right">
                <p className="text-xs text-gray-600">Subtotal: R$ {sale.totalAmount.toFixed(2)}</p>
                <p className="text-sm font-bold mt-1">TOTAL: R$ {sale.totalAmount.toFixed(2)}</p>
                <p className="text-xs mt-2 text-gray-600 uppercase">PAGAMENTO: {sale.paymentMethod}</p>
              </div>

              <div className="text-center mt-4 pt-3 border-t border-dashed border-gray-400">
                <div className="text-[9px] text-gray-700 whitespace-pre-line leading-relaxed text-left">
                  {receiptConfig?.receiptFooter || `TERMO DE GARANTIA E POLÍTICA DE TROCA (CONFORME LEI 8.078/90 - CDC)

1. DA GARANTIA LEGAL (Art. 26, CDC): A loja concede garantia de 30 (trinta) dias para produtos eletrônicos e periféricos contra defeitos de fabricação, contados a partir da data da compra.

2. DO DIREITO DE ARREPENDIMENTO E TESTE FUNCIONAL (Art. 49, CDC):
O Direito de Arrependimento (7 dias) é aplicável EXCLUSIVAMENTE a compras realizadas fora do estabelecimento (Internet/Telefone).
COMPRAS PRESENCIAIS: O cliente declara que, no ato da compra, teve acesso ao produto e, em casos aplicáveis, o mesmo foi TESTADO E APRESENTOU FUNCIONALIDADE NORMAL. Comprovado o pleno funcionamento no estabelecimento, NÃO EXISTE DIREITO A ARREPENDIMENTO, desistência ou troca por erro de escolha.

3. DA ALEGAÇÃO DE DEFEITO E TESTE DE BANCADA:
Em casos de reclamação de vício, o produto será submetido a teste técnico imediato no balcão.
PRODUTO EM PLENO FUNCIONAMENTO: Se, após o teste na loja, o produto apresentar funcionamento normal, a troca será sumariamente NEGADA. Nestes casos, entende-se que a falha relatada decorre de incompatibilidade, configuração incorreta ou falta de perícia do usuário, não sendo de responsabilidade da loja.
DANOS ADVERSOS À FABRICAÇÃO: Caso o produto apresente defeito visível ou funcional decorrente de fatores externos ocorridos após a saída da loja (picos de energia, quedas, umidade, pressão ou uso de fontes incompatíveis), a CONTRATADA se resguarda o direito de NÃO REALIZAR A TROCA, NÃO DEVOLVER VALORES E NÃO GERAR VALE-CRÉDITO, visto que a garantia cobre apenas vícios de fabricação.

4. DO BENEFÍCIO DE TROCA (48H ÚTEIS):
A substituição imediata só ocorre em até 48 horas úteis caso o defeito de fabricação seja real e comprovado pelo técnico da loja. Após este prazo, segue o rito do Art. 18 do CDC (prazo de até 30 dias para solução).

5. ITENS SEM GARANTIA (CONSUMO IMEDIATO):
I. PELÍCULAS: A garantia cessa após a aplicação. Não cobrimos danos pós-venda.
II. SERVIÇOS DE IMPRESSÃO/XEROX: Conferência obrigatória na entrega.
III. CAPAS: Sem garantia contra amarelamento ou danos de uso.

6. POLÍTICA DE REEMBOLSO E VALE-CRÉDITO:
A empresa NÃO REALIZA DEVOLUÇÃO DE VALORES EM ESPÉCIE/DINHEIRO.
Na impossibilidade de reparo ou troca por item idêntico, o ressarcimento será feito via VALE-CRÉDITO (Voucher) com validade de 30 dias.

7. EXCLUSÃO DE GARANTIA:
Anulação automática em caso de fios cortados, conectores oxidados/quebrados, selos violados ou qualquer sinal de impacto físico.`}
                </div>
                <div className="mt-4 flex justify-center opacity-50">
                   {/* Fake Barcode */}
                   <div className="h-8 w-40 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px)]"></div>
                </div>
              </div>
            </div>

            {/* Actions (hidden in print) */}
            <div className="p-4 border-t border-border bg-[#0f172a] flex gap-3 print:hidden rounded-b-xl">
              <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>Fechar</Button>
              <Button variant="primary" className="flex-1" icon={Printer} onClick={() => window.print()}>Imprimir</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==========================================
// 8. DeleteSaleButton component
// ==========================================
interface DeleteSaleButtonProps {
  sale: {
    id: string;
    totalAmount: number;
  };
  canDelete?: boolean;
}

export function DeleteSaleButton({ sale, canDelete }: DeleteSaleButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!canDelete) return null;

  const handleCancel = async (restoreStock: boolean) => {
    setLoading(true);
    try {
      const res = await cancelSale(sale.id, restoreStock);
      if (res && (res as any).error) {
        toast.error((res as any).error);
      } else {
        toast.success(
          restoreStock 
            ? "Venda estornada e produtos devolvidos ao estoque!" 
            : "Venda excluída do caixa com sucesso!"
        );
        setIsOpen(false);
        router.refresh();
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir venda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all cursor-pointer flex items-center justify-center"
        title="Excluir Venda"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative text-left">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" />
              Excluir Venda #{sale.id.split("-")[0].toUpperCase()}
            </h3>
            
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Esta ação irá estornar o caixa removendo os lançamentos financeiros da venda (R$ {sale.totalAmount.toFixed(2)}).
              <br /><br />
              <strong>Deseja devolver os produtos desta venda para o estoque?</strong>
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleCancel(true)}
                disabled={loading}
                className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Sim, Devolver ao Estoque
              </button>
              
              <button
                type="button"
                onClick={() => handleCancel(false)}
                disabled={loading}
                className="w-full py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Não, Apenas Excluir do Caixa
              </button>
              
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="w-full py-2.5 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
