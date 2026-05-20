import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { createTransaction } from "../../actions/finance";

export default function NovoLancamentoPage() {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <PageHeader title="Novo Lançamento Financeiro" />

      <form action={createTransaction} className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
        
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Descrição</label>
          <input 
            type="text" 
            name="description" 
            required 
            className="w-full px-3.5 py-2.5 border border-slate-700 bg-[#0a0f1c] rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-500"
            placeholder="Ex: Pagamento de Fornecedor"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tipo de Lançamento</label>
            <select 
              name="type" 
              className="w-full px-3.5 py-2.5 border border-slate-700 bg-[#0a0f1c] rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="INCOME">Receita (Entrada)</option>
              <option value="EXPENSE">Despesa (Saída)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Valor (R$)</label>
            <input 
              type="number" 
              name="amount" 
              step="0.01"
              required 
              className="w-full px-3.5 py-2.5 border border-slate-700 bg-[#0a0f1c] rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Data do Lançamento</label>
            <input 
              type="date" 
              name="transactionDate" 
              defaultValue={today}
              required 
              className="w-full px-3.5 py-2.5 border border-slate-700 bg-[#0a0f1c] rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Categoria (Opcional)</label>
            <input 
              type="text" 
              name="category" 
              className="w-full px-3.5 py-2.5 border border-slate-700 bg-[#0a0f1c] rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-500"
              placeholder="Ex: Contas de Luz"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <a href="/financeiro?tab=extrato" className="px-5 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-sm hover:bg-slate-700 transition-all flex items-center justify-center">
            Cancelar
          </a>
          <Button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-cyan-500/20">
            Salvar Lançamento
          </Button>
        </div>
      </form>
    </div>
  );
}
