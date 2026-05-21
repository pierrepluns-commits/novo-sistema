"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { createCompanyWithLicense } from "@/app/actions/mestre";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function NovaLicencaPage() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState("BASIC");
  const [maxUnits, setMaxUnits] = useState(1);
  const router = useRouter();

  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setPlan(val);
    if (val === "BASIC") setMaxUnits(1);
    else if (val === "PRO") setMaxUnits(5);
    else if (val === "ENTERPRISE") setMaxUnits(99);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await createCompanyWithLicense(formData);

    if (res?.error) {
      toast.error(res.error);
      setLoading(false);
    } else {
      toast.success("Empresa e Licença geradas com sucesso!");
      router.push("/mestre/empresas");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Gerar Nova Licença de Empresa" />

      <form onSubmit={handleSubmit} className="space-y-8">
        
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-4">Dados da Empresa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Nome / Razão Social</label>
              <input type="text" name="name" required className="w-full px-3 py-2 border border-slate-700 rounded-md bg-[#0a0f1c] text-white focus:border-red-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">CNPJ / Documento (Opcional)</label>
              <input type="text" name="document" className="w-full px-3 py-2 border border-slate-700 rounded-md bg-[#0a0f1c] text-white focus:border-red-500 focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-4">Plano e Licenciamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Plano Adquirido</label>
              <select 
                name="plan" 
                required 
                value={plan}
                onChange={handlePlanChange}
                className="w-full px-3 py-2 border border-slate-700 rounded-md bg-[#0a0f1c] text-white focus:border-red-500 focus:outline-none font-bold cursor-pointer"
              >
                <option value="BASIC">Basic (Apenas PDV e Estoque)</option>
                <option value="PRO">Pro (Multifilial + Relatórios)</option>
                <option value="ENTERPRISE">Enterprise (Completo)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Cota Limite de Filiais (Lojas)</label>
              <input
                type="number"
                name="maxUnits"
                required
                min={1}
                value={maxUnits}
                onChange={(e) => setMaxUnits(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border border-slate-700 rounded-md bg-[#0a0f1c] text-white focus:border-red-500 focus:outline-none font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">Limite sugerido automaticamente, ajustável conforme necessidade.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Data de Vencimento (Deixe em branco p/ Vitalícia)</label>
              <input type="date" name="expiresAt" className="w-full px-3 py-2 border border-slate-700 rounded-md bg-[#0a0f1c] text-white focus:border-red-500 focus:outline-none font-bold" />
            </div>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-4">Conta do Administrador (Dono da Empresa)</h2>
          <p className="text-sm text-slate-500 mb-4">Este usuário terá acesso total ao sistema desta empresa (COMPANY_ADMIN).</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Nome Completo</label>
              <input type="text" name="adminName" required className="w-full px-3 py-2 border border-slate-700 rounded-md bg-[#0a0f1c] text-white focus:border-red-500 focus:outline-none" placeholder="Ex: João da Silva" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">E-mail (Login)</label>
              <input type="email" name="adminEmail" required className="w-full px-3 py-2 border border-slate-700 rounded-md bg-[#0a0f1c] text-white focus:border-red-500 focus:outline-none" placeholder="joao@empresa.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Senha Inicial</label>
              <input type="text" name="adminPassword" required className="w-full px-3 py-2 border border-slate-700 rounded-md bg-[#0a0f1c] text-white focus:border-red-500 focus:outline-none" placeholder="Ex: mudar123" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button disabled={loading} type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50 text-lg">
            {loading ? "Gerando Licença..." : "Criar Empresa e Licença SaaS"}
          </button>
        </div>

      </form>
    </div>
  );
}
