"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { openCashRegister, closeCashRegister } from "@/app/actions/caixa";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  registerId: string | null;
  expectedCash?: number;
}

export function CashRegisterClient({ isOpen, registerId, expectedCash = 0 }: Props) {
  const [amount, setAmount] = useState<string>("");
  const [pixAmount, setPixAmount] = useState<string>("");
  const [creditAmount, setCreditAmount] = useState<string>("");
  const [debitAmount, setDebitAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valCash = parseFloat(amount.replace(",", ".")) || 0;
    const valPix = parseFloat(pixAmount.replace(",", ".")) || 0;
    const valCredit = parseFloat(creditAmount.replace(",", ".")) || 0;
    const valDebit = parseFloat(debitAmount.replace(",", ".")) || 0;
    
    if (isNaN(valCash) || valCash < 0) {
      toast.error("Por favor, insira um valor de dinheiro válido.");
      return;
    }

    setLoading(true);

    try {
      if (!isOpen) {
        await openCashRegister(valCash);
        toast.success("Caixa aberto com sucesso!");
        setAmount("");
      } else {
        if (!registerId) return;
        
        const diff = valCash - expectedCash;
        if (diff !== 0) {
          const proceed = window.confirm(`Atenção: Há uma diferença de R$ ${diff.toFixed(2)} no dinheiro em gaveta! Deseja fechar assim mesmo?`);
          if (!proceed) {
            setLoading(false);
            return;
          }
        }
        
        await closeCashRegister(registerId, {
          closingBalance: valCash,
          closingCash: valCash,
          closingPix: valPix,
          closingCredit: valCredit,
          closingDebit: valDebit
        });
        toast.success("Caixa fechado com sucesso!");
        setAmount("");
        setPixAmount("");
        setCreditAmount("");
        setDebitAmount("");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar caixa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1 text-left">
          {isOpen ? "Dinheiro Total em Gaveta (R$)" : "Troco Inicial (R$)"}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
          <input 
            type="number" 
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#0a0f1c] border border-slate-700 rounded-xl text-white text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            placeholder="0.00"
          />
        </div>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 text-left">Total PIX</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">R$</span>
              <input type="number" step="0.01" value={pixAmount} onChange={e => setPixAmount(e.target.value)} className="w-full pl-8 pr-2 py-2 bg-[#0a0f1c] border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 text-left">Total Débito</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">R$</span>
              <input type="number" step="0.01" value={debitAmount} onChange={e => setDebitAmount(e.target.value)} className="w-full pl-8 pr-2 py-2 bg-[#0a0f1c] border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 text-left">Total Crédito</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">R$</span>
              <input type="number" step="0.01" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} className="w-full pl-8 pr-2 py-2 bg-[#0a0f1c] border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" placeholder="0.00" />
            </div>
          </div>
        </div>
      )}
      
      <Button 
        type="submit" 
        disabled={loading} 
        className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all ${
          isOpen ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
        }`}
      >
        {loading ? "Processando..." : isOpen ? "Fechar Caixa" : "Abrir Caixa"}
      </Button>
    </form>
  );
}
