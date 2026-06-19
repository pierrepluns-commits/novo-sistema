"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Search, Eye, EyeOff, Edit, HelpCircle, Trash2 } from "lucide-react";
import { deleteProduct } from "@/app/actions/product";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  cost: number;
  isKit: boolean;
  totalQuantity: number;
}

interface StockTableClientProps {
  products: ProductWithStock[];
  canManage: boolean;
}

export function StockTableClient({ products, canManage }: StockTableClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [revealAll, setRevealAll] = useState(false);
  const [revealedIndividual, setRevealedIndividual] = useState<Record<string, boolean>>({});

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o produto "${productName}" permanentemente?`)) {
      return;
    }

    try {
      await deleteProduct(productId);
      toast.success("Produto excluído com sucesso!");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error("Não foi possível excluir este produto pois ele possui histórico de vendas ou ordens de serviço vinculado.");
    }
  };

  // Filtrar produtos com base na busca
  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      (product.barcode && product.barcode.toLowerCase().includes(query))
    );
  });

  const toggleIndividual = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita outros gatilhos de clique na linha se houver
    setRevealedIndividual((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Barra de Filtro e Ações da Tabela */}
      <div className="p-4 border-b border-slate-800 bg-[#0a0f1c] flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar produtos por nome ou SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0f172a] border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Button
            onClick={() => setRevealAll(!revealAll)}
            className={`flex items-center gap-2 transition-all duration-300 font-bold border-none py-2 px-4 rounded-lg scale-100 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
              revealAll
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)]"
                : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.35)] hover:shadow-[0_0_20px_rgba(245,158,11,0.5)]"
            }`}
          >
            {revealAll ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {revealAll ? "Ocultar Todos os Custos" : "Revelar Todos os Custos"}
          </Button>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#0a0f1c]">
              <th className="p-4 text-sm font-semibold text-slate-400">Produto</th>
              <th className="p-4 text-sm font-semibold text-slate-400">SKU / Barras</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Preço e Valores (Clique para ver Custo)</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Estoque</th>
              {canManage && <th className="p-4 text-sm font-semibold text-slate-400 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const isRevealed = revealAll || !!revealedIndividual[product.id];

              return (
                <tr
                  key={product.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                >
                  {/* Produto */}
                  <td className="p-4">
                    <div className="font-medium text-white hover:text-blue-400 transition-colors">
                      {product.name}
                    </div>
                    {product.isKit && (
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full mt-1 inline-block font-semibold">
                        KIT
                      </span>
                    )}
                  </td>

                  {/* SKU / Barras */}
                  <td className="p-4">
                    <div className="text-sm text-slate-300 font-mono">{product.sku}</div>
                    <div className="text-xs text-slate-500">{product.barcode || "---"}</div>
                  </td>

                  {/* Valores (Custo e Venda Lado a Lado ou Apenas Preço de Venda) */}
                  <td className="p-4">
                    <div 
                      onClick={(e) => toggleIndividual(product.id, e)}
                      className="inline-flex items-center gap-3 cursor-pointer group select-none py-1.5 px-3 rounded-lg hover:bg-slate-800/40 border border-transparent hover:border-slate-800 transition-all duration-200"
                      title="Clique para alternar a exibição de custo/venda"
                    >
                      {isRevealed ? (
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Custo</span>
                            <span className="text-slate-300 font-mono font-medium">
                              {product.cost.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </span>
                          </div>
                          <div className="h-6 w-px bg-slate-800 self-center"></div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-green-500 font-semibold">Venda</span>
                            <span className="text-green-400 font-mono font-bold">
                              {product.price.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </span>
                          </div>
                          <EyeOff className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors ml-1" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-green-500 font-semibold">Preço de Venda</span>
                            <span className="text-green-400 font-mono font-bold">
                              {product.price.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </span>
                          </div>
                          <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors ml-1" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Estoque */}
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        product.totalQuantity <= 5
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {product.totalQuantity} un
                    </span>
                  </td>

                  {/* Ações */}
                  {canManage && (
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Link href={`/estoque/editar/${product.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/60 flex items-center gap-1.5 font-bold shadow-[0_0_8px_rgba(59,130,246,0.05)] transition-all duration-300"
                          >
                            <Edit className="w-3.5 h-3.5 text-blue-400" />
                            Editar
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(product.id, product.name)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 flex items-center gap-1.5 font-bold shadow-[0_0_8px_rgba(239,68,68,0.05)] transition-all duration-300"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          Excluir
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}

            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <HelpCircle className="w-8 h-8 text-slate-600" />
                    <span>Nenhum produto cadastrado no estoque ou encontrado na busca.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
