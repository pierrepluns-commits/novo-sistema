"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { addManualCashTransaction } from "@/app/actions/caixa";
import { updateSaleFee, updateSaleDetails } from "@/app/actions/pdv";
import toast from "react-hot-toast";
import { ArrowUpRight, ArrowDownRight, Edit2, Check, X, Plus, Minus } from "lucide-react";

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
}

export function EditSaleModal({ sale }: EditSaleModalProps) {
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
    } catch (e: any) {
      toast.error(e.message || "Erro ao editar venda.");
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

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-white rounded-lg border border-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg text-xs"
                >
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </Button>
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
