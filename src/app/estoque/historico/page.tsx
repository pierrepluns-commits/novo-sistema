import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { History, Package, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { StockBadge } from "@/components/ui/StockBadge";

export default async function EstoqueHistorico() {
  const session = await getSession();
  if (!session || !session.companyId) redirect("/login");

  const movements = await prisma.stockMovement.findMany({
    where: { 
      product: { companyId: session.companyId }
    },
    include: {
      product: true,
      user: true,
      unit: true
    },
    orderBy: { createdAt: "desc" },
    take: 100 // Limite simples inicial, pode ser substituído por paginação
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link href="/estoque" className="text-slate-400 hover:text-white flex items-center gap-2 mb-2 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Estoque
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <History className="w-8 h-8 text-blue-500" />
            Auditoria de Estoque
          </h1>
          <p className="text-slate-400 mt-1">Histórico completo de entradas e saídas</p>
        </div>
      </div>

      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0a0f1c]">
                <th className="p-4 text-sm font-semibold text-slate-400">Data/Hora</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Produto</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Unidade</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Tipo</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Motivo</th>
                <th className="p-4 text-sm font-semibold text-slate-400 text-right">Qtd</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Usuário Responsável</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mov) => (
                <tr key={mov.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-sm text-slate-300">
                    {new Date(mov.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-white">{mov.product.name}</div>
                    <div className="text-xs text-slate-500">{mov.product.sku}</div>
                  </td>
                  <td className="p-4 text-sm text-slate-300">
                    {mov.unit.name}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-bold ${mov.type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {mov.type === 'IN' ? 'ENTRADA' : 'SAÍDA'}
                    </span>
                  </td>
                  <td className="p-4">
                    <StockBadge type={mov.type} reason={mov.reason} />
                  </td>
                  <td className={`p-4 text-right font-bold ${mov.type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {mov.type === 'IN' ? '+' : '-'}{mov.quantity}
                  </td>
                  <td className="p-4 text-sm text-slate-300">
                    {mov.user.name}
                  </td>
                </tr>
              ))}

              {movements.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Nenhuma movimentação registrada no histórico.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
