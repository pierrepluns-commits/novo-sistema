"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createProduct, updateProduct } from "@/app/actions/product";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export function ProductForm({ units, sessionUnitId, initialData, allProducts = [], suppliers = [] }: { units: any[], sessionUnitId?: string | null, initialData?: any, allProducts?: any[], suppliers?: any[] }) {
  const [loading, setLoading] = useState(false);
  const [isKit, setIsKit] = useState(initialData?.isKit || false);
  const [kitItems, setKitItems] = useState<{componentId: string, quantity: number}[]>(
    initialData?.kitItems ? initialData.kitItems.map((k: any) => ({ componentId: k.componentId, quantity: k.quantity })) : []
  );
  const router = useRouter();

  const handleAddKitItem = () => {
    setKitItems([...kitItems, { componentId: "", quantity: 1 }]);
  };

  const handleRemoveKitItem = (index: number) => {
    const newItems = [...kitItems];
    newItems.splice(index, 1);
    setKitItems(newItems);
  };

  const handleUpdateKitItem = (index: number, field: string, value: any) => {
    const newItems = [...kitItems];
    (newItems[index] as any)[field] = value;
    setKitItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("isKit", isKit ? "true" : "false");
    if (isKit) {
      formData.append("kitItems", JSON.stringify(kitItems.filter(i => i.componentId !== "" && i.quantity > 0)));
    }
    
    let res: any;
    try {
      if (initialData) {
        res = await updateProduct(formData);
      } else {
        res = await createProduct(formData);
      }
      
      if (res && 'error' in res && res.error) {
        toast.error(res.error);
        setLoading(false);
      } else if (res && 'success' in res && res.success) {
        toast.success(initialData ? "Produto atualizado com sucesso!" : "Produto criado com sucesso!");
        router.push("/estoque");
        router.refresh();
      }
    } catch (e: any) {
      toast.error(`Exceção do sistema: ${e.message}`);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
      {initialData && <input type="hidden" name="id" value={initialData.id} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Produto</label>
          <input 
            type="text" 
            name="name" 
            defaultValue={initialData?.name}
            required 
            className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Ex: Teclado Mecânico"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">SKU (Código Interno)</label>
          <input 
            type="text" 
            name="sku" 
            defaultValue={initialData?.sku}
            required 
            className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Ex: TEC-MEC-001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Código de Barras</label>
          <input 
            type="text" 
            name="barcode" 
            defaultValue={initialData?.barcode}
            className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Ex: 7891234567890"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-slate-300">Fornecedor</label>
            <a href="/estoque/fornecedores" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
              + Cadastrar fornecedor
            </a>
          </div>
          <select 
            name="supplierId" 
            defaultValue={initialData?.supplierId || ""}
            className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Nenhum fornecedor selecionado</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {!sessionUnitId && !initialData && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Unidade (Estoque Inicial)</label>
            <select 
              name="unitId" 
              required
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Selecione uma unidade...</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
        <textarea 
          name="description" 
          defaultValue={initialData?.description}
          rows={3}
          className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Detalhes do produto..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {!initialData && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Quantidade Inicial</label>
            <input 
              type="number" 
              name="quantity" 
              defaultValue={0}
              required 
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Custo (R$)</label>
          <input 
            type="number" 
            name="cost" 
            defaultValue={initialData?.cost}
            step="0.01"
            required 
            className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Preço de Venda (R$)</label>
          <input 
            type="number" 
            name="price"
            defaultValue={initialData?.price}
            step="0.01" 
            required 
            className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="pt-2 flex items-center gap-2">
        <input 
          type="checkbox" 
          checked={isKit} 
          onChange={(e) => setIsKit(e.target.checked)} 
          className="w-5 h-5 text-blue-500 bg-transparent border-slate-700 rounded focus:ring-blue-500 focus:ring-offset-[#0f172a]" 
          id="isKit" 
        />
        <label htmlFor="isKit" className="text-sm font-medium text-slate-300 cursor-pointer">
          Este produto é um KIT (Composto por outros itens do estoque)
        </label>
      </div>

      {isKit && (
        <div className="bg-[#0a0f1c] border border-slate-700 rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-white font-bold text-sm">Composição do Kit</h4>
            <Button type="button" variant="outline" size="sm" onClick={handleAddKitItem} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20 py-1 h-auto text-xs">
              + Adicionar Componente
            </Button>
          </div>
          
          {kitItems.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-2">Nenhum componente adicionado. Adicione os itens que formam este kit.</p>
          ) : (
            <div className="space-y-3">
              {kitItems.map((item, index) => (
                <div key={index} className="flex gap-3 items-start bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Produto Base</label>
                    <select 
                      value={item.componentId} 
                      onChange={(e) => handleUpdateKitItem(index, 'componentId', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-700 rounded-md bg-[#0f172a] text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Selecione o produto...</option>
                      {allProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku}) - R$ {p.price.toFixed(2)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Qtd.</label>
                    <input 
                      type="number" 
                      value={item.quantity} 
                      onChange={(e) => handleUpdateKitItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full px-2 py-1.5 text-sm border border-slate-700 rounded-md bg-[#0f172a] text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="pt-5">
                    <button type="button" onClick={() => handleRemoveKitItem(index)} className="text-red-400 hover:text-red-300 p-1">
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pt-4 flex justify-end">
        <Button disabled={loading} type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] disabled:opacity-50">
          {loading ? "Salvando..." : (initialData ? "Atualizar Produto" : "Salvar Produto")}
        </Button>
      </div>
    </form>
  );
}
