"use client";

import React, { useState, useEffect, useTransition } from "react";
import { X, ArrowRightLeft, Search, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { transferStock, getProductsByUnit } from "@/app/actions/stock";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Unit {
  id: string;
  name: string;
}

interface ProductStock {
  id: string;
  name: string;
  sku: string;
  quantity: number;
}

interface Props {
  units: Unit[];
  onClose: () => void;
}

export function StockTransferModal({ units, onClose }: Props) {
  const router = useRouter();
  const [sourceUnitId, setSourceUnitId] = useState("");
  const [targetUnitId, setTargetUnitId] = useState("");
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [search, setSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Itens selecionados para transferência: Map de productId -> quantity
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});

  // Buscar produtos da unidade de origem ao selecioná-la
  useEffect(() => {
    if (!sourceUnitId) {
      setProducts([]);
      setSelectedItems({});
      return;
    }

    setLoadingProducts(true);
    getProductsByUnit(sourceUnitId)
      .then((data) => {
        setProducts(data);
        setSelectedItems({});
      })
      .catch((err) => {
        toast.error("Erro ao carregar produtos da unidade.");
        console.error(err);
      })
      .finally(() => {
        setLoadingProducts(false);
      });
  }, [sourceUnitId]);

  // Filtrar produtos da origem pelo input de busca
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleCheckboxChange = (productId: string, maxQty: number) => {
    setSelectedItems((prev) => {
      const updated = { ...prev };
      if (productId in updated) {
        delete updated[productId];
      } else {
        // Iniciar com 1 unidade por padrão ou 0 se indisponível
        updated[productId] = maxQty > 0 ? 1 : 0;
      }
      return updated;
    });
  };

  const handleQuantityChange = (productId: string, value: number, maxQty: number) => {
    const qty = Math.max(0, Math.min(value, maxQty));
    setSelectedItems((prev) => ({
      ...prev,
      [productId]: qty,
    }));
  };

  const handleSelectAll = () => {
    if (products.length === 0) return;
    
    // Se já estiver tudo selecionado, limpa
    const allSelected = products.every(p => p.id in selectedItems);
    if (allSelected) {
      setSelectedItems({});
    } else {
      const updated: Record<string, number> = {};
      products.forEach((p) => {
        updated[p.id] = p.quantity; // Transfere o estoque total por padrão
      });
      setSelectedItems(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceUnitId || !targetUnitId) {
      toast.error("Selecione as unidades de origem e destino.");
      return;
    }

    if (sourceUnitId === targetUnitId) {
      toast.error("As unidades de origem e destino devem ser diferentes.");
      return;
    }

    const itemsToTransfer = Object.entries(selectedItems)
      .map(([productId, quantity]) => ({
        productId,
        quantity,
      }))
      .filter((item) => item.quantity > 0);

    if (itemsToTransfer.length === 0) {
      toast.error("Selecione pelo menos um produto e defina uma quantidade para transferir.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await transferStock(sourceUnitId, targetUnitId, itemsToTransfer);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success("Transferência de estoque realizada com sucesso!");
          router.refresh();
          onClose();
        }
      } catch (err: any) {
        toast.error("Erro interno ao processar transferência.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Cabeçalho */}
        <div className="p-5 border-b border-slate-850 flex justify-between items-center bg-[#0a0f1c]">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Transferência de Estoque</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          
          {/* Corpo do Form */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            
            {/* Seleção de Unidades */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Unidade de Origem (Sair Estoque)
                </label>
                <select
                  value={sourceUnitId}
                  onChange={(e) => setSourceUnitId(e.target.value)}
                  required
                  className="w-full bg-[#0a0f1c] border border-slate-750 text-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Selecionar Origem --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Unidade de Destino (Entrar Estoque)
                </label>
                <select
                  value={targetUnitId}
                  onChange={(e) => setTargetUnitId(e.target.value)}
                  required
                  className="w-full bg-[#0a0f1c] border border-slate-750 text-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Selecionar Destino --</option>
                  {units
                    .filter((u) => u.id !== sourceUnitId)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Listagem de Produtos da Origem */}
            {sourceUnitId && (
              <div className="space-y-3 flex-1 flex flex-col min-h-0 border-t border-slate-850 pt-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filtrar produtos por nome ou SKU..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#0a0f1c] border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500"
                    />
                  </div>
                  
                  {products.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors shrink-0 cursor-pointer py-1 px-2 hover:bg-slate-800/40 rounded border border-transparent hover:border-slate-850"
                    >
                      {products.every(p => p.id in selectedItems) ? "Desmarcar Todos" : "Selecionar Todos (Saldo Total)"}
                    </button>
                  )}
                </div>

                {/* Container da Lista com Scroll */}
                <div className="border border-slate-850 rounded-xl bg-[#060b14]/50 overflow-y-auto max-h-[300px] flex-1">
                  {loadingProducts ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                      <span className="text-xs">Carregando estoque da unidade...</span>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      Nenhum produto com saldo em estoque nesta unidade de origem.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-850">
                      {filteredProducts.map((p) => {
                        const isChecked = p.id in selectedItems;
                        const qty = selectedItems[p.id] || 0;

                        return (
                          <div
                            key={p.id}
                            className={`p-3 flex items-center justify-between gap-4 transition-colors ${
                              isChecked ? "bg-cyan-500/5" : "hover:bg-slate-800/20"
                            }`}
                          >
                            {/* Nome / Checkbox */}
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => handleCheckboxChange(p.id, p.quantity)}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 mt-0.5 cursor-pointer ${
                                  isChecked
                                    ? "bg-cyan-500 border-cyan-500 text-slate-950"
                                    : "border-slate-700 bg-slate-900"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-white truncate">
                                  {p.name}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  {p.sku} • Saldo atual: <span className="font-bold text-slate-400">{p.quantity} un</span>
                                </div>
                              </div>
                            </div>

                            {/* Campo de Quantidade */}
                            {isChecked && (
                              <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in slide-in-from-right-3 duration-200">
                                <span className="text-[10px] font-bold text-slate-500">Qtd a transferir:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max={p.quantity}
                                  value={qty}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      p.id,
                                      parseInt(e.target.value) || 0,
                                      p.quantity
                                    )
                                  }
                                  className="w-16 bg-[#0a0f1c] border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-white text-center focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Rodapé do Form */}
          <div className="p-4 border-t border-slate-850 flex justify-between items-center gap-3 bg-[#0a0f1c]">
            <div className="text-xs text-slate-400">
              {Object.keys(selectedItems).length} item(ns) selecionado(s)
            </div>
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-slate-700 text-slate-350 hover:bg-slate-800 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || Object.keys(selectedItems).length === 0}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-2 px-4 shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processando...
                  </span>
                ) : (
                  "Confirmar Transferência"
                )}
              </Button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
