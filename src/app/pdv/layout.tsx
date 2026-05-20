import { getCurrentCashRegister } from "@/app/actions/caixa";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Banknote } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default async function PDVLayout({ children }: { children: React.ReactNode }) {
  const register = await getCurrentCashRegister();

  if (!register) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Banknote className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Caixa Fechado</h2>
          <p className="text-slate-400 mb-8">
            Você não pode realizar vendas no PDV sem abrir o caixa do seu turno.
          </p>
          <Link href="/caixa">
            <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              Ir para Abertura de Caixa
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Verificar se o caixa é de dias anteriores
  const today = new Date();
  const openedAt = new Date(register.openedAt);
  const isFromYesterday = openedAt.getDate() !== today.getDate() || openedAt.getMonth() !== today.getMonth() || openedAt.getFullYear() !== today.getFullYear();

  return (
    <div className="flex flex-col h-full">
      {isFromYesterday && (
        <div className="bg-amber-500/10 border border-amber-500/50 p-3 rounded-lg mb-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-amber-400 font-bold text-sm">Atenção: Caixa do Dia Anterior!</p>
            <p className="text-amber-500/80 text-xs">Este caixa foi aberto em {openedAt.toLocaleDateString('pt-BR')}. Recomenda-se fechar este caixa e abrir um novo para o dia de hoje.</p>
          </div>
          <Link href="/caixa">
            <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/20 text-xs py-1">
              Ir para o Caixa
            </Button>
          </Link>
        </div>
      )}
      {children}
    </div>
  );
}
