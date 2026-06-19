import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { 
  Package, 
  Plus, 
  AlertTriangle, 
  History, 
  TrendingUp, 
  Coins, 
  BarChart3,
  Truck
} from "lucide-react";
import { EstoqueClientWrapper } from "@/components/EstoqueClientWrapper";
import { getSelectedUnitId } from "@/app/actions/unit";
import { StockTableClient } from "@/components/StockTableClient";

export default async function Estoque() {
  const session = await getSession();
  if (!session || !session.companyId) {
    redirect("/login");
  }

  const selectedUnitId = await getSelectedUnitId();

  // Permissões
  let permissions: string[] = [];
  try {
    permissions = session.permissions ? JSON.parse(session.permissions) : [];
  } catch (e) {}
  
  const canManage = session.role === "SUPER_ADMIN" || session.role === "COMPANY_ADMIN" || permissions.includes("MANAGE_STOCK") || permissions.includes("ALL");

  const units = await prisma.unit.findMany({
    where: { companyId: session.companyId }
  });

  const rawProducts = await prisma.product.findMany({
    where: { 
      companyId: session.companyId,
      NOT: {
        sku: {
          startsWith: "OS-CUSTOM-"
        }
      }
    },
    include: {
      stocks: {
        include: { unit: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Cálculo de estoque baixo e quantidades relevantes
  const lowStockThreshold = 5;
  const productsWithStock = rawProducts.map(p => {
    // Filtra stocks pela unidade selecionada (ou todas se for admin e não tiver selecionado)
    const relevantStocks = selectedUnitId ? p.stocks.filter(s => s.unitId === selectedUnitId) : p.stocks;
    const totalQuantity = relevantStocks.reduce((sum, s) => sum + s.quantity, 0);
    return { ...p, totalQuantity };
  });

  const lowStockProducts = productsWithStock.filter(p => p.totalQuantity <= lowStockThreshold);

  // Somatórios financeiros automáticos de estoque
  const totalCost = productsWithStock.reduce((sum, p) => sum + (p.cost * p.totalQuantity), 0);
  const totalSale = productsWithStock.reduce((sum, p) => sum + (p.price * p.totalQuantity), 0);
  const totalProfit = totalSale - totalCost;
  const profitMarginPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
            <Package className="w-7 h-7 md:w-8 md:h-8 text-blue-500" />
            Gestão de Estoque
          </h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie produtos e quantidades</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {canManage && (
            <Link href="/estoque/fornecedores" className="flex-1 sm:flex-initial">
              <Button variant="outline" className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/60 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-bold shadow-[0_0_10px_rgba(6,182,212,0.05)] transition-all duration-300">
                <Truck className="w-4 h-4 text-cyan-400" />
                Fornecedores
              </Button>
            </Link>
          )}
          <Link href="/estoque/historico" className="flex-1 sm:flex-initial">
            <Button variant="outline" className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/60 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-bold shadow-[0_0_10px_rgba(245,158,11,0.05)] transition-all duration-300">
              <History className="w-4 h-4 text-amber-400" />
              Histórico
            </Button>
          </Link>
          {canManage && (
            <div className="flex-1 sm:flex-initial">
              <EstoqueClientWrapper units={units} />
            </div>
          )}
          {canManage && (
            <Link href="/estoque/novo" className="flex-1 sm:flex-initial">
              <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] border border-blue-500/30 transition-all duration-300 font-bold">
                <Plus className="w-4 h-4" />
                Novo Produto
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Cards de Resumos Financeiros Premium (Valor de Custo e Venda lado a lado) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {/* Card 1: Investimento Total (Custo das Mercadorias) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#0a0f1c] border border-slate-800/80 rounded-2xl p-4 md:p-6 shadow-xl transition-all hover:border-blue-500/30 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm font-semibold text-slate-400 uppercase tracking-wider">Investimento em Estoque</p>
              <h3 className="text-xl md:text-2xl font-bold text-white mt-1.5 md:mt-2 font-mono">
                {totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
              <p className="text-[10px] md:text-xs text-slate-500 mt-1 md:mt-2">Soma do valor de custo × estoque</p>
            </div>
            <div className="p-2 md:p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
              <Coins className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        </div>

        {/* Card 2: Valor Estimado de Venda (Faturamento Potencial) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#0a0f1c] border border-slate-800/80 rounded-2xl p-4 md:p-6 shadow-xl transition-all hover:border-emerald-500/30 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm font-semibold text-slate-400 uppercase tracking-wider">Retorno Potencial (Venda)</p>
              <h3 className="text-xl md:text-2xl font-bold text-emerald-400 mt-1.5 md:mt-2 font-mono">
                {totalSale.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
              <p className="text-[10px] md:text-xs text-slate-500 mt-1 md:mt-2">Soma do preço de venda × estoque</p>
            </div>
            <div className="p-2 md:p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        </div>

        {/* Card 3: Lucro Líquido Esperado e Margem */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#0a0f1c] border border-slate-800/80 rounded-2xl p-4 md:p-6 shadow-xl transition-all hover:border-purple-500/30 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm font-semibold text-slate-400 uppercase tracking-wider">Lucro Líquido Esperado</p>
              <h3 className="text-xl md:text-2xl font-bold text-purple-400 mt-1.5 md:mt-2 font-mono">
                {totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
              <p className="text-[10px] md:text-xs text-slate-500 mt-1 md:mt-2">
                Valor de venda total menos o custo total
              </p>
            </div>
            <div className="p-2 md:p-3 bg-purple-500/10 rounded-xl text-purple-500 border border-purple-500/20">
              <BarChart3 className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Estoque Baixo */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="p-3 bg-red-500/20 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-red-400 font-bold text-lg">Atenção: Estoque Baixo</h3>
            <p className="text-slate-300 text-sm">
              Você tem {lowStockProducts.length} {lowStockProducts.length === 1 ? 'produto' : 'produtos'} com {lowStockThreshold} unidades ou menos.
            </p>
          </div>
        </div>
      )}

      {/* Tabela Interativa de Estoque (Cliente) */}
      <StockTableClient products={productsWithStock} canManage={canManage} />
    </div>
  );
}
