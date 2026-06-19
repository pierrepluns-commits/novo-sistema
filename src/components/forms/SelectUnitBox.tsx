"use client";

import React, { useState } from "react";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Unit {
  id: string;
  name: string;
}

interface SelectUnitBoxProps {
  units: Unit[];
}

export function SelectUnitBox({ units }: SelectUnitBoxProps) {
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    if (!selectedId) return;
    setLoading(true);
    // Definir o cookie para a unidade selecionada e recarregar
    document.cookie = `selectedUnitId=${selectedId}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  if (units.length === 0) {
    return (
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl p-8 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
          <Store className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Nenhuma Unidade Encontrada</h2>
        <p className="text-slate-400 mb-6 text-sm">
          Você precisa cadastrar uma unidade antes de poder gerenciar e abrir caixas.
        </p>
        <a href="/configuracao">
          <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg">
            Ir para Configurações
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl p-8 text-center max-w-md mx-auto space-y-6">
      <div>
        <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
          <Store className="w-8 h-8 text-cyan-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Selecione uma Unidade Primeiro</h2>
        <p className="text-slate-400 text-sm">
          Você está visualizando todas as unidades. Por favor, selecione uma unidade específica abaixo para abrir ou gerenciar seu caixa correspondente.
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative text-left">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Selecione a Loja / Unidade
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-[#0a0f1c] border border-slate-700 text-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer appearance-none hover:border-slate-600 transition-colors"
          >
            <option value="" disabled>-- Clique para Escolher a Unidade --</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-[38px] pointer-events-none text-slate-500 text-xs">
            ▼
          </div>
        </div>

        <Button
          onClick={handleConfirm}
          disabled={!selectedId || loading}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          {loading ? "Confirmando..." : "Confirmar Unidade e Prosseguir"}
        </Button>
      </div>
    </div>
  );
}
