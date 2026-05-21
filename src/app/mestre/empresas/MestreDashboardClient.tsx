"use client";

import React, { useState } from "react";
import { 
  Shield, Building, CheckCircle2, Clock, Settings, User, 
  Copy, Check, CreditCard, Plus, Trash, Eye, Edit2, Save, Coins, X
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { 
  toggleRequestPaymentStatus, 
  approveLicenseRequest, 
  updateSystemConfig,
  updateCompanyLicenseAction
} from "@/app/actions/mestre";

interface MestreDashboardClientProps {
  initialCompanies: any[];
  initialRequests: any[];
  initialConfig: any;
}

export function MestreDashboardClient({ 
  initialCompanies, 
  initialRequests, 
  initialConfig 
}: MestreDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"empresas" | "solicitacoes" | "config">("empresas");
  const [requests, setRequests] = useState(initialRequests);
  const [companies, setCompanies] = useState(initialCompanies);
  const [config, setConfig] = useState(initialConfig);
  
  // App Config States
  const [appName, setAppName] = useState(initialConfig?.appName || "Lumus ERP");
  const [primaryColor, setPrimaryColor] = useState(initialConfig?.primaryColor || "#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState(initialConfig?.secondaryColor || "#06b6d4");
  const [plans, setPlans] = useState<any[]>(() => {
    try {
      return JSON.parse(initialConfig?.plansConfig || "[]");
    } catch (e) {
      return [];
    }
  });

  // Approval Modal States
  const [approvalModalRequest, setApprovalModalRequest] = useState<any | null>(null);
  const [customMaxUnits, setCustomMaxUnits] = useState<number>(1);
  const [expiresAtStr, setExpiresAtStr] = useState<string>("");
  const [approving, setApproving] = useState(false);

  // Credentials Modal States
  const [credentialsModal, setCredentialsModal] = useState<{ email: string; password_hash: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [savingConfig, setSavingConfig] = useState(false);

  // Edit License Modal States
  const [editLicenseCompany, setEditLicenseCompany] = useState<any | null>(null);
  const [editPlan, setEditPlan] = useState<string>("BASIC");
  const [editMaxUnits, setEditMaxUnits] = useState<number>(1);
  const [editStatus, setEditStatus] = useState<string>("ACTIVE");
  const [editExpiresAtStr, setEditExpiresAtStr] = useState<string>("");
  const [updatingLicense, setUpdatingLicense] = useState(false);

  const handleOpenEditLicense = (company: any) => {
    setEditLicenseCompany(company);
    const lic = company.license;
    setEditPlan(lic?.plan || "BASIC");
    setEditMaxUnits(lic?.maxUnits || 1);
    setEditStatus(lic?.status || "ACTIVE");
    setEditExpiresAtStr(lic?.expiresAt ? new Date(lic.expiresAt).toISOString().split("T")[0] : "");
  };

  const handleConfirmEditLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLicenseCompany) return;

    setUpdatingLicense(true);
    try {
      const res = await updateCompanyLicenseAction(
        editLicenseCompany.id,
        editPlan,
        editMaxUnits,
        editStatus,
        editExpiresAtStr || undefined
      );

      if (res.error) {
        toast.error("Erro ao atualizar licença: " + res.error);
        return;
      }

      toast.success("Licença atualizada com sucesso!");
      
      // Update local companies state
      setCompanies(prev => prev.map(c => {
        if (c.id === editLicenseCompany.id) {
          return {
            ...c,
            license: {
              ...(c.license || {}),
              plan: editPlan,
              maxUnits: editMaxUnits,
              status: editStatus,
              expiresAt: editExpiresAtStr ? new Date(editExpiresAtStr) : null
            }
          };
        }
        return c;
      }));

      setEditLicenseCompany(null);
    } catch (err: any) {
      toast.error("Falha ao atualizar: " + err.message);
    } finally {
      setUpdatingLicense(false);
    }
  };

  // Toggle payment status action
  const handleTogglePayment = async (requestId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "PAID" ? "UNPAID" : "PAID";
    try {
      const res = await toggleRequestPaymentStatus(requestId, nextStatus);
      if (res.error) {
        toast.error("Erro ao alterar pagamento: " + res.error);
        return;
      }
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, paymentStatus: nextStatus } : r));
      toast.success("Status de pagamento atualizado!");
    } catch (e) {
      toast.error("Erro ao processar alteração.");
    }
  };

  // Open approval dialog
  const handleOpenApproval = (req: any) => {
    setApprovalModalRequest(req);
    setCustomMaxUnits(req.maxUnits || 1);
    
    // Default expiration to 1 month from now
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setExpiresAtStr(nextMonth.toISOString().split("T")[0]);
  };

  // Confirm approval action
  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalModalRequest) return;

    setApproving(true);
    try {
      const res = await approveLicenseRequest(approvalModalRequest.id, customMaxUnits, expiresAtStr || undefined);
      if (res.error) {
        toast.error("Erro ao autorizar licença: " + res.error);
        return;
      }

      toast.success("Licença autorizada com sucesso!");
      
      // Update local request status
      setRequests(prev => prev.map(r => r.id === approvalModalRequest.id ? { ...r, status: "APPROVED" } : r));
      
      // Open credentials view modal
      if (res.credentials) {
        setCredentialsModal({
          email: res.credentials.email,
          password_hash: res.credentials.password
        });
      }

      setApprovalModalRequest(null);
      
      // Page reload/refresh lists in background to update company tables
      window.location.reload();
    } catch (err: any) {
      toast.error("Falha ao autorizar: " + err.message);
    } finally {
      setApproving(false);
    }
  };

  // Edit dynamic plans parameters
  const handlePlanPriceChange = (planId: string, field: "price" | "maxUnits", value: any) => {
    setPlans(prev => prev.map((p: any) => {
      if (p.id === planId) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  // Save general branding config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const formData = new FormData();
      formData.append("appName", appName);
      formData.append("primaryColor", primaryColor);
      formData.append("secondaryColor", secondaryColor);
      formData.append("plansConfig", JSON.stringify(plans));

      const res = await updateSystemConfig(formData);
      if (res.error) {
        toast.error("Erro ao salvar: " + res.error);
      } else {
        toast.success("Configurações do SaaS salvas com sucesso!");
      }
    } catch (err: any) {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!credentialsModal) return;
    const text = `Acesso Lumus ERP:\nLogin: ${credentialsModal.email}\nSenha Provisória: ${credentialsModal.password_hash}\nLink de Login: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            Painel do Dono (Super Admin)
          </h1>
          <p className="text-slate-400 mt-1">Controle de licenças, faturamento e estilo da plataforma</p>
        </div>
        <Link href="/mestre/empresas/novo">
          <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:scale-102">
            <Building className="w-5 h-5" />
            Criar Empresa & Licença Manual
          </button>
        </Link>
      </div>

      {/* Modern Tabs */}
      <div className="flex border-b border-slate-800/80 gap-2">
        {[
          { id: "empresas", label: "Empresas Ativas", icon: Building },
          { id: "solicitacoes", label: "Solicitações", count: requests.filter(r => r.status === "PENDING").length, icon: Coins },
          { id: "config", label: "Customização Landing & Planos", icon: Settings }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all relative ${
                isActive 
                  ? "border-red-500 text-white bg-slate-800/10 font-black" 
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-red-500" : "text-slate-500"}`} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-2 py-0.5 ml-1">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Active Companies */}
      {activeTab === "empresas" && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-300">
          <table className="w-full text-left">
            <thead className="bg-[#1e293b] text-slate-300 text-xs uppercase tracking-wider font-bold border-b border-slate-800">
              <tr>
                <th className="p-4 font-semibold">Empresa</th>
                <th className="p-4 font-semibold">Documento</th>
                <th className="p-4 font-semibold">Admin (Login)</th>
                <th className="p-4 font-semibold">Plano</th>
                <th className="p-4 font-semibold">Unidades Permitidas</th>
                <th className="p-4 font-semibold">Status Licença</th>
                <th className="p-4 font-semibold">Vencimento</th>
                <th className="p-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {companies.map(c => {
                const admin = c.users[0];
                const isExpired = c.license?.expiresAt && new Date(c.license.expiresAt) < new Date();
                return (
                  <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{c.name}</p>
                      <p className="text-[10px] text-slate-500">ID: {c.id.split("-")[0]}</p>
                    </td>
                    <td className="p-4 text-slate-400 text-sm font-mono">{c.document || "-"}</td>
                    <td className="p-4">
                      <p className="text-sm text-slate-300 font-bold">{admin?.name || "Sem Admin"}</p>
                      <p className="text-xs text-blue-400 font-mono">{admin?.email}</p>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-800 text-slate-200 border border-slate-700 text-xs px-2 py-0.5 rounded font-mono font-bold">
                        {c.license?.plan}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 font-mono text-sm">
                      {c.license?.maxUnits || 1} {c.license?.maxUnits === 1 ? "unidade" : "unidades"}
                    </td>
                    <td className="p-4">
                      {c.license?.status === "ACTIVE" && !isExpired ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Ativa</span>
                      ) : (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Inativa/Vencida</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {c.license?.expiresAt ? new Date(c.license.expiresAt).toLocaleDateString("pt-BR") : "Vitalícia"}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenEditLicense(c)}
                        className="bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 text-xs font-bold py-1.5 px-3 rounded-lg shadow-md transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                        Editar Licença
                      </button>
                    </td>
                  </tr>
                );
              })}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 text-sm">Nenhuma empresa cadastrada no sistema.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Incoming Acquisition Requests */}
      {activeTab === "solicitacoes" && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-300">
          <table className="w-full text-left">
            <thead className="bg-[#1e293b] text-slate-300 text-xs uppercase tracking-wider font-bold border-b border-slate-800">
              <tr>
                <th className="p-4 font-semibold">Cliente / Empresa</th>
                <th className="p-4 font-semibold">E-mail / Telefone</th>
                <th className="p-4 font-semibold">Plano Desejado</th>
                <th className="p-4 font-semibold">Cota Unidades</th>
                <th className="p-4 font-semibold">Pagamento</th>
                <th className="p-4 font-semibold">Status Aprov.</th>
                <th className="p-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {requests.map(r => {
                const isPaid = r.paymentStatus === "PAID";
                return (
                  <tr key={r.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{r.companyName}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <User className="w-3.5 h-3.5 text-slate-500" /> {r.ownerName}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-300 font-mono">{r.email}</p>
                      <p className="text-xs text-slate-500">{r.phone || "Sem Telefone"}</p>
                    </td>
                    <td className="p-4">
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs px-2 py-0.5 rounded font-mono font-bold">
                        {r.plan}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 font-mono text-sm">{r.maxUnits} {r.maxUnits === 1 ? "loja" : "lojas"}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleTogglePayment(r.id, r.paymentStatus)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                          isPaid 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        {isPaid ? "Confirmado (Pago)" : "Aguardando (Pendente)"}
                      </button>
                    </td>
                    <td className="p-4">
                      {r.status === "APPROVED" ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aprovada
                        </span>
                      ) : r.status === "PENDING" ? (
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 w-max">
                          <Clock className="w-3.5 h-3.5 animate-pulse" /> Pendente
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-xs font-bold">Rejeitada</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {r.status === "PENDING" ? (
                        <button
                          onClick={() => handleOpenApproval(r)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-1.5 px-3 rounded-lg shadow-md transition-colors"
                        >
                          Autorizar Licença
                        </button>
                      ) : (
                        <span className="text-slate-500 text-xs font-bold">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 text-sm">Nenhuma solicitação de licença pendente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Customize Landing Color / App Settings */}
      {activeTab === "config" && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl animate-in fade-in duration-300">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 pb-2 border-b border-slate-800">
            <Settings className="w-5 h-5 text-red-500" />
            Configuração Visual e Planos do SaaS
          </h3>

          <form onSubmit={handleSaveConfig} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* App Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Nome do Sistema (Branding)</label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0a0f1c] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Primary Color */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Cor Primária (Hexadecimal)</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    required
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-sm bg-[#0a0f1c] border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Cor Secundária (Hexadecimal)</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    required
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-sm bg-[#0a0f1c] border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Plans Management Section */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                Precificação dos Planos (Exibidos na Landing Page)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((p: any) => (
                  <div key={p.id} className="bg-slate-800/20 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-white text-sm uppercase">{p.name}</span>
                      <span className="text-[10px] bg-red-500/10 text-red-400 font-bold border border-red-500/20 px-2.5 py-0.5 rounded-full">{p.id}</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Preço Mensal (R$)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={p.price}
                            onChange={(e) => handlePlanPriceChange(p.id, "price", parseFloat(e.target.value) || 0)}
                            className="w-full pl-8 pr-2 py-2 text-xs bg-[#0a0f1c] border border-slate-700 rounded-lg text-white font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Cota Máxima de Lojas / Unidades</label>
                        <input
                          type="number"
                          value={p.maxUnits}
                          onChange={(e) => handlePlanPriceChange(p.id, "maxUnits", parseInt(e.target.value, 10) || 1)}
                          className="w-full px-2.5 py-2 text-xs bg-[#0a0f1c] border border-slate-700 rounded-lg text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Descrição</label>
                        <textarea
                          rows={2}
                          value={p.desc || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPlans(prev => prev.map((item: any) => item.id === p.id ? { ...item, desc: val } : item));
                          }}
                          className="w-full p-2 text-xs bg-[#0a0f1c] border border-slate-700 rounded-lg text-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800/80">
              <button
                type="submit"
                disabled={savingConfig}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-8 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                <Save className="w-4 h-4" />
                {savingConfig ? "Salvando..." : "Salvar Alterações Globais"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ----------------- APPROVE DIALOG MODAL ----------------- */}
      {approvalModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setApprovalModalRequest(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Autorizar Licença SaaS
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Confirmar autorização de uso para <span className="text-white font-bold">{approvalModalRequest.companyName}</span> ({approvalModalRequest.ownerName}).
            </p>

            <form onSubmit={handleConfirmApproval} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Cota Limite de Filiais (Lojas)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={customMaxUnits}
                  onChange={(e) => setCustomMaxUnits(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-sm bg-[#0a0f1c] border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-red-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">O cliente poderá cadastrar filiais até bater esta cota.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Data de Vencimento da Licença</label>
                <input
                  type="date"
                  value={expiresAtStr}
                  onChange={(e) => setExpiresAtStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#0a0f1c] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500 font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">Selecione uma data limite ou deixe em branco para licença vitalícia.</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setApprovalModalRequest(null)}
                  disabled={approving}
                  className="px-4 py-2 text-xs font-semibold bg-slate-850 hover:bg-slate-800 text-white rounded-lg border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={approving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 px-6 rounded-lg text-xs flex items-center gap-1.5"
                >
                  {approving ? "Processando..." : "Confirmar & Liberar Acesso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- CREDENTIALS RESULT MODAL ----------------- */}
      {credentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border-2 border-emerald-500/50 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(16,185,129,0.2)] p-6 relative text-center">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>

            <h3 className="text-xl font-black text-white mb-1">Licença Ativada com Sucesso!</h3>
            <p className="text-xs text-slate-400 mb-6">Copie e envie as credenciais iniciais para o cliente acessar o ERP.</p>

            <div className="bg-[#0a0f1c] border border-slate-800 rounded-xl p-4 text-left space-y-3 mb-6 font-mono text-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
              <div>
                <span className="text-slate-500 block text-[10px] font-bold uppercase">Painel de Login:</span>
                <span className="text-blue-400 break-all">{window.location.origin}/login</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-bold uppercase">E-mail Administrativo:</span>
                <span className="text-slate-200">{credentialsModal.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-bold uppercase">Senha Provisória Gerada:</span>
                <span className="text-emerald-400 font-extrabold text-sm">{credentialsModal.password_hash}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyCredentials}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado!" : "Copiar Credenciais"}
              </button>
              <button
                onClick={() => setCredentialsModal(null)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold py-3 px-6 rounded-xl text-xs border border-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- EDIT LICENSE DIALOG MODAL ----------------- */}
      {editLicenseCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditLicenseCompany(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-cyan-400" />
              Editar Licença - {editLicenseCompany.name}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Ajuste o plano, cota de unidades e validade de acesso para esta empresa.
            </p>

            <form onSubmit={handleConfirmEditLicense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Plano Comercial</label>
                <select
                  value={editPlan}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditPlan(val);
                    // Update suggested quota if the user shifts plans
                    if (val === "BASIC") setEditMaxUnits(1);
                    else if (val === "PRO") setEditMaxUnits(5);
                    else if (val === "ENTERPRISE") setEditMaxUnits(99);
                  }}
                  className="w-full px-3 py-2 text-sm bg-[#0a0f1c] border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="BASIC">Basic (PDV e Estoque) — 1 Loja</option>
                  <option value="PRO">Pro (Multifilial) — Até 5 Lojas</option>
                  <option value="ENTERPRISE">Enterprise (Completo) — Lojas Ilimitadas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Cota Limite de Filiais (Lojas)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editMaxUnits}
                  onChange={(e) => setEditMaxUnits(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-sm bg-[#0a0f1c] border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-red-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">O cliente poderá cadastrar filiais até atingir esta cota.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Status do Acesso</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#0a0f1c] border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="ACTIVE">ATIVO</option>
                  <option value="SUSPENDED">SUSPENSO</option>
                  <option value="CANCELLED">CANCELADO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Data de Vencimento da Licença</label>
                <input
                  type="date"
                  value={editExpiresAtStr}
                  onChange={(e) => setEditExpiresAtStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#0a0f1c] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500 font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">Deixe em branco para licença vitalícia.</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setEditLicenseCompany(null)}
                  disabled={updatingLicense}
                  className="px-4 py-2 text-xs font-semibold bg-slate-850 hover:bg-slate-800 text-white rounded-lg border border-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updatingLicense}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2 px-6 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-md"
                >
                  {updatingLicense ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
