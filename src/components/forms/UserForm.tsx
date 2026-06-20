"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createUser, updateUser } from "@/app/actions/user";
import toast from "react-hot-toast";

import { useRouter } from "next/navigation";

const AVAILABLE_PERMISSIONS = [
  { id: "PDV_ACCESS", label: "Acessar PDV / Vender" },
  { id: "CANCEL_SALE", label: "Cancelar e Estornar Vendas" },
  { id: "VIEW_STOCK", label: "Visualizar Estoque" },
  { id: "MANAGE_STOCK", label: "Adicionar/Remover Produtos do Estoque" },
  { id: "TRANSFER_STOCK", label: "Transferir Estoque entre Lojas" },
  { id: "VIEW_FINANCE", label: "Acessar Financeiro" },
  { id: "DELETE_FINANCE", label: "Excluir Registros Financeiros" },
  { id: "MANAGE_USERS", label: "Gerenciar Usuários" },
];

export function UserForm({ units, initialData }: { units: any[], initialData?: any }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    let res;
    try {
      if (initialData) {
        res = await updateUser(formData);
      } else {
        res = await createUser(formData);
      }
      
      if (res?.error) {
        toast.error(res.error);
        setLoading(false);
      } else if (res?.success) {
        toast.success(initialData ? "Usuário atualizado com sucesso!" : "Usuário criado com sucesso!");
        router.push("/usuarios");
        router.refresh();
      }
    } catch (e: any) {
      toast.error(`Exceção do sistema: ${e.message}`);
      setLoading(false);
    }
  };

  const initialPermissions = initialData?.permissions ? JSON.parse(initialData.permissions) : [];

  return (
    <form onSubmit={handleSubmit} className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
      {initialData && <input type="hidden" name="id" value={initialData.id} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Nome Completo</label>
          <input 
            type="text" 
            name="name" 
            defaultValue={initialData?.name}
            required 
            className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Ex: João da Silva"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
          <input 
            type="email" 
            name="email" 
            defaultValue={initialData?.email}
            required 
            className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="joao@exemplo.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Senha {initialData ? "(Deixe em branco para manter)" : "Inicial"}</label>
          <input 
            type="password" 
            name="password" 
            required={!initialData} 
            className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Nível Base</label>
          <select 
            name="role" 
            defaultValue={initialData?.role || "CASHIER"}
            className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="CASHIER">Caixa (Padrão)</option>
            <option value="UNIT_MANAGER">Gerente de Unidade</option>
            <option value="COMPANY_ADMIN">Administrador da Empresa</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-1">Vincular a uma Unidade</label>
          <select 
            name="unitId" 
            defaultValue={initialData?.unitId || ""}
            className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todas as unidades (Apenas para Admin)</option>
            {units.map(unit => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">Usuários de caixa devem ser vinculados a uma unidade específica.</p>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-lg font-bold text-white mb-4">Permissões Específicas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {AVAILABLE_PERMISSIONS.map(perm => (
            <label key={perm.id} className="flex items-center gap-3 p-3 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/50 transition-colors">
              <input 
                type="checkbox" 
                name="permissions" 
                value={perm.id}
                defaultChecked={initialPermissions.includes(perm.id) || initialPermissions.includes("ALL")}
                className="w-5 h-5 text-blue-500 bg-transparent border-slate-700 rounded focus:ring-blue-500 focus:ring-offset-[#0f172a]"
              />
              <span className="text-sm font-medium text-slate-300">{perm.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <Button disabled={loading} type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] disabled:opacity-50">
          {loading ? "Salvando..." : (initialData ? "Atualizar Usuário" : "Salvar Usuário")}
        </Button>
      </div>
    </form>
  );
}
