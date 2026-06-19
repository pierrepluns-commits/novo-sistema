import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Edit, Trash } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteUser } from "../actions/user";
import { getSession } from "@/lib/auth";
import { getSelectedUnitId } from "@/app/actions/unit";

export default async function UsuariosPage() {
  const session = await getSession();
  if (!session || !session.companyId) {
    return <div>Não autorizado</div>;
  }

  const selectedUnitId = await getSelectedUnitId();

  // Filtrar usuários por empresa e unidade ativa
  // Se houver uma unidade selecionada, exibe os usuários daquela unidade OU vinculados a todas (unitId: null)
  let whereClause: any = { companyId: session.companyId };
  if (selectedUnitId) {
    whereClause.OR = [
      { unitId: selectedUnitId },
      { unitId: null }
    ];
  } else if (session.role !== 'COMPANY_ADMIN') {
    whereClause.OR = [
      { unitId: session.unitId || "NONE" },
      { unitId: null }
    ];
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      unit: true
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Gerenciar Usuários" 
        showBack={false}
      />
      
      <div className="flex justify-end mb-4">
        <Link href="/usuarios/novo">
          <Button className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 py-2 shadow-lg shadow-cyan-500/20">Adicionar Usuário</Button>
        </Link>
      </div>

      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0a0f1c] border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Unidade</th>
              <th className="px-6 py-4">Nível de Acesso</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Nenhum usuário cadastrado nesta unidade.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 font-bold text-white">{user.name}</td>
                <td className="px-6 py-4 text-slate-300">{user.email}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700/50">
                    {user.unit ? user.unit.name : "Administração Geral"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Link href={`/usuarios/editar/${user.id}`}>
                    <Button variant="outline" size="sm" icon={Edit}>Editar</Button>
                  </Link>
                  <form action={async () => {
                    "use server";
                    await deleteUser(user.id);
                  }} className="inline-block">
                    <Button variant="danger" size="sm" icon={Trash} type="submit">Excluir</Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
