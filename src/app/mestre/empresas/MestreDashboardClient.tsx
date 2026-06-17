"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, Building, CheckCircle2, Clock, Settings, User, 
  Copy, Check, CreditCard, Plus, Trash, Eye, Edit2, Save, Coins, X,
  Calendar, DollarSign, History, Mail, Send, Smartphone, ExternalLink, FileText
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  toggleRequestPaymentStatus, 
  approveLicenseRequest, 
  updateSystemConfig,
  updateCompanyLicenseAction,
  updatePaymentConfig,
  deleteCompanyAction
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
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const queryTab = searchParams ? searchParams.get("tab") : null;
  const [activeTab, setActiveTab] = useState<"empresas" | "solicitacoes" | "config" | "pagamentos">("empresas");
  const [requests, setRequests] = useState(initialRequests);
  const [companies, setCompanies] = useState(initialCompanies);
  const [config, setConfig] = useState(initialConfig);
  
  // App Config States
  const [appName, setAppName] = useState(initialConfig?.appName || "Lumus ERP");
  const [primaryColor, setPrimaryColor] = useState(initialConfig?.primaryColor || "#00f3ff");
  const [secondaryColor, setSecondaryColor] = useState(initialConfig?.secondaryColor || "#0055ff");
  const [plans, setPlans] = useState<any[]>(() => {
    try {
      return JSON.parse(initialConfig?.plansConfig || "[]");
    } catch (e) {
      return [];
    }
  });

  // Payment Config States
  const [paymentGateway, setPaymentGateway] = useState(initialConfig?.paymentGateway || "SIMULATOR");
  const [gatewayApiKey, setGatewayApiKey] = useState(initialConfig?.gatewayApiKey || "");
  const [webhookSecret, setWebhookSecret] = useState(initialConfig?.webhookSecret || "");
  const [pixKey, setPixKey] = useState(initialConfig?.pixKey || "");
  const [savingPayment, setSavingPayment] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Sync tab with search parameters
  useEffect(() => {
    if (queryTab === "empresas" || queryTab === "solicitacoes" || queryTab === "config" || queryTab === "pagamentos") {
      setActiveTab(queryTab as any);
    }
  }, [queryTab]);

  const handleTabChange = (tab: "empresas" | "solicitacoes" | "config" | "pagamentos") => {
    setActiveTab(tab);
    router.push(`/mestre/empresas?tab=${tab}`);
  };

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

  // Histórico & Central de Cobranças Modal States
  const [selectedCompanyHistory, setSelectedCompanyHistory] = useState<any | null>(null);
  const [billingType, setBillingType] = useState<"email" | "whatsapp">("email");
  const [billingPhone, setBillingPhone] = useState("");
  const [billingSubject, setBillingSubject] = useState("");
  const [billingMessage, setBillingMessage] = useState("");
  const [sendingBilling, setSendingBilling] = useState(false);
  
  // Local Audit Logs for simulation to feel alive!
  const [customAuditLogs, setCustomAuditLogs] = useState<Record<string, Array<{ id: string; type: string; desc: string; date: string }>>>({});

  // Dynamic colors configuration
  const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "0, 243, 255";
  };

  const primaryRGB = hexToRgb(primaryColor);

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

      // Add local audit log
      addAuditLog(editLicenseCompany.id, "LICENSE_UPDATE", `Licença alterada para ${editPlan} (${editMaxUnits} lojas), Status: ${editStatus}`);

      setEditLicenseCompany(null);
    } catch (err: any) {
      toast.error("Falha ao atualizar: " + err.message);
    } finally {
      setUpdatingLicense(false);
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!window.confirm(`ATENÇÃO: Tem certeza absoluta que deseja excluir a empresa "${companyName}"?\n\nEsta ação é PERMANENTE e apagará todos os dados, usuários, lojas, vendas e históricos vinculados a ela.`)) {
      return;
    }

    try {
      const res = await deleteCompanyAction(companyId);
      if (res.error) {
        toast.error("Erro ao excluir empresa: " + res.error);
        return;
      }
      
      toast.success(`Empresa "${companyName}" excluída com sucesso!`);
      // Update local state
      setCompanies(prev => prev.filter(c => c.id !== companyId));
    } catch (err: any) {
      toast.error("Falha ao excluir empresa: " + err.message);
    }
  };

  // Helper to add local audit logs dynamically
  const addAuditLog = (companyId: string, type: string, desc: string) => {
    const newLog = {
      id: Math.random().toString(),
      type,
      desc,
      date: new Date().toLocaleString("pt-BR")
    };
    setCustomAuditLogs(prev => ({
      ...prev,
      [companyId]: [newLog, ...(prev[companyId] || [])]
    }));
  };

  // Initialize and Open Audit History / Billing Modal
  const handleOpenHistory = (company: any) => {
    setSelectedCompanyHistory(company);
    setBillingType("email");

    // Populate WhatsApp phone number if present or request is found
    const matchingReq = requests.find(r => r.email === company.users[0]?.email);
    setBillingPhone(matchingReq?.phone || "5511999999999");

    // Dynamic price calculation
    const planInfo = plans.find(p => p.id === company.license?.plan) || {
      price: company.license?.plan === "BASIC" ? 99.90 : company.license?.plan === "PRO" ? 249.90 : 499.90
    };

    // Pre-fill email contents
    const subject = `[Faturamento] Mensalidade Lumus ERP - ${company.name}`;
    const message = `Olá, ${company.users[0]?.name || "Gestor(a)"}!\n\nIdentificamos o fechamento do ciclo de cobrança para a sua empresa ${company.name}.\n\nDetalhamento do Faturamento:\n- Plano: ${company.license?.plan || "BASIC"} (${company.license?.maxUnits || 1} Lojas)\n- Valor Mensal: R$ ${planInfo.price.toFixed(2)}\n- Vencimento: ${company.license?.expiresAt ? new Date(company.license.expiresAt).toLocaleDateString("pt-BR") : "Vitalícia"}\n\nPara efetuar o pagamento da mensalidade e manter o seu acesso liberado, gere o boleto bancário / PIX clicando no link abaixo:\nhttps://pagamentos.lumuserp.com/cobranca/boleto-${company.id.split("-")[0]}\n\nQualquer dúvida, conte com a nossa equipe de suporte!\n\nAtenciosamente,\nDiretoria Administrativa ${appName}`;
    
    setBillingSubject(subject);
    setBillingMessage(message);

    // If company does not have audit logs initialized yet, generate dummy initial timeline
    if (!customAuditLogs[company.id]) {
      const createdDate = new Date(company.createdAt).toLocaleString("pt-BR");
      const updatedDate = new Date(company.license?.updatedAt || company.createdAt).toLocaleString("pt-BR");
      
      const initialLogs = [
        {
          id: "1",
          type: "LICENSE_ACTIVE",
          desc: `Licença ativa vinculada ao plano ${company.license?.plan || "BASIC"} (${company.license?.maxUnits || 1} Lojas)`,
          date: updatedDate
        },
        {
          id: "2",
          type: "ADMIN_REGISTER",
          desc: `Administrador principal cadastrado (${company.users[0]?.name || "Sem Nome"} - ${company.users[0]?.email})`,
          date: createdDate
        },
        {
          id: "3",
          type: "COMPANY_CREATED",
          desc: `Empresa ${company.name} cadastrada com sucesso no ecossistema SaaS.`,
          date: createdDate
        }
      ];
      setCustomAuditLogs(prev => ({
        ...prev,
        [company.id]: initialLogs
      }));
    }
  };

  // Simulate Email Billing trigger
  const handleSendEmailBilling = async () => {
    setSendingBilling(true);
    
    // Simulate server side delay
    await new Promise(resolve => setTimeout(resolve, 800));

    console.log(`\n==================================================`);
    console.log(`[DISPARO DE E-MAIL DE COBRANÇA DE MESTRE]`);
    console.log(`Para: ${selectedCompanyHistory.users[0]?.email}`);
    console.log(`Assunto: ${billingSubject}`);
    console.log(`Conteúdo:\n${billingMessage}`);
    console.log(`==================================================\n`);

    addAuditLog(
      selectedCompanyHistory.id, 
      "EMAIL_SENT", 
      `E-mail de cobrança enviado para o e-mail: ${selectedCompanyHistory.users[0]?.email}`
    );

    toast.success("E-mail de cobrança disparado com sucesso!");
    setSendingBilling(false);
  };

  // Send Whatsapp message using wa.me browser redirect
  const handleSendWhatsappBilling = () => {
    // Dynamic price calculation
    const planInfo = plans.find(p => p.id === selectedCompanyHistory.license?.plan) || {
      price: selectedCompanyHistory.license?.plan === "BASIC" ? 99.90 : selectedCompanyHistory.license?.plan === "PRO" ? 249.90 : 499.90
    };

    const cleanPhone = billingPhone.replace(/\D/g, "");
    
    // Prepare elegant Whatsapp template
    const text = `*${appName} - AVISO DE FATURAMENTO*\n\nOlá, *${selectedCompanyHistory.users[0]?.name || "Gestor"}*!\n\nInformamos que a fatura da licença da sua empresa *${selectedCompanyHistory.name}* está disponível:\n\n🔹 *Plano:* ${selectedCompanyHistory.license?.plan} (${selectedCompanyHistory.license?.maxUnits} Unidades)\n🔹 *Mensalidade:* R$ ${planInfo.price.toFixed(2)}\n🔹 *Status:* Licença Ativa\n\n👉 Para efetuar o pagamento da fatura e evitar suspensão, clique no link do seu *Boleto / PIX*:\nhttps://pagamentos.lumuserp.com/cobranca/boleto-${selectedCompanyHistory.id.split("-")[0]}\n\nQualquer dúvida, responda a esta mensagem. Obrigado!`;
    
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    
    // Open in new window/tab
    window.open(whatsappUrl, "_blank");

    addAuditLog(
      selectedCompanyHistory.id, 
      "WHATSAPP_SENT", 
      `Mensagem de cobrança com link de boleto enviada via WhatsApp para o número: ${cleanPhone}`
    );

    toast.success("Redirecionando para o WhatsApp Web...");
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

  // Save payment credentials config
  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayment(true);
    try {
      const formData = new FormData();
      formData.append("paymentGateway", paymentGateway);
      formData.append("gatewayApiKey", gatewayApiKey);
      formData.append("webhookSecret", webhookSecret);
      formData.append("pixKey", pixKey);

      const res = await updatePaymentConfig(formData);
      if (res.error) {
        toast.error("Erro ao salvar dados bancários: " + res.error);
      } else {
        toast.success("Dados bancários e integração salvos com sucesso!");
      }
    } catch (err: any) {
      toast.error("Erro ao salvar configurações de pagamento.");
    } finally {
      setSavingPayment(false);
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
      
      {/* Title Header - Styled in Cyber Ciano */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Shield 
              style={{ color: primaryColor, filter: `drop-shadow(0 0 10px rgba(${primaryRGB}, 0.5))` }} 
              className="w-8 h-8" 
            />
            Painel do Mestre (Super Admin)
          </h1>
          <p className="text-slate-400 mt-1">Gestão de licenças contratuais, cobranças ativas e identidade do SaaS</p>
        </div>
        <Link href="/mestre/empresas/novo">
          <button 
            style={{ 
              backgroundColor: primaryColor,
              boxShadow: `0 0 15px rgba(${primaryRGB}, 0.3)`
            }}
            className="text-slate-900 font-extrabold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all hover:scale-102 hover:brightness-110"
          >
            <Building className="w-5 h-5" />
            Criar Empresa & Licença Manual
          </button>
        </Link>
      </div>

      {/* Modern Tabs - Cyber style */}
      <div className="flex border-b border-slate-800/80 gap-2">
        {[
          { id: "empresas", label: "Empresas & Clientes", icon: Building },
          { id: "solicitacoes", label: "Solicitações", count: requests.filter(r => r.status === "PENDING").length, icon: Coins },
          { id: "config", label: "Customização SaaS & Planos", icon: Settings },
          { id: "pagamentos", label: "Integração Bancária", icon: CreditCard }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id as any)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all relative ${
                isActive 
                  ? "text-white bg-slate-800/10 font-black" 
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
              style={{
                borderBottomColor: isActive ? primaryColor : "transparent"
              }}
            >
              <Icon 
                className="w-4 h-4" 
                style={{ color: isActive ? primaryColor : "#64748b" }}
              />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span 
                  style={{ backgroundColor: primaryColor }}
                  className="text-slate-950 text-[10px] font-black rounded-full px-2 py-0.5 ml-1"
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Active Companies */}
      {activeTab === "empresas" && (
        <div className="bg-[#0a0f1c]/80 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-300">
          <table className="w-full text-left">
            <thead className="bg-[#101726] text-slate-350 text-xs uppercase tracking-wider font-bold border-b border-slate-800">
              <tr>
                <th className="p-4 font-semibold">Empresa</th>
                <th className="p-4 font-semibold">CNPJ/Documento</th>
                <th className="p-4 font-semibold">Administrador principal</th>
                <th className="p-4 font-semibold">Plano</th>
                <th className="p-4 font-semibold">Limite Filiais</th>
                <th className="p-4 font-semibold">Data do Pagamento</th>
                <th className="p-4 font-semibold">Vencimento</th>
                <th className="p-4 font-semibold text-right">Ações de Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {companies.map(c => {
                const admin = c.users[0];
                const isExpired = c.license?.expiresAt && new Date(c.license.expiresAt) < new Date();
                
                // Last payment calculation (represented by license updatedAt)
                const paymentDate = c.license?.updatedAt 
                  ? new Date(c.license.updatedAt).toLocaleDateString("pt-BR") 
                  : new Date(c.createdAt).toLocaleDateString("pt-BR");

                return (
                  <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{c.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">ID: {c.id.split("-")[0]}</p>
                    </td>
                    <td className="p-4 text-slate-400 text-sm font-mono">{c.document || "-"}</td>
                    <td className="p-4">
                      <p className="text-sm text-slate-300 font-bold">{admin?.name || "Sem Admin"}</p>
                      <p className="text-xs text-cyan-400 font-mono">{admin?.email}</p>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-900 text-cyan-400 border border-slate-800 text-xs px-2 py-0.5 rounded font-mono font-bold uppercase">
                        {c.license?.plan}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 font-mono text-sm">
                      {c.license?.maxUnits || 1} {c.license?.maxUnits === 1 ? "loja" : "lojas"}
                    </td>
                    <td className="p-4 text-slate-300 text-sm">
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        {paymentDate}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {c.license?.expiresAt ? (
                        <span className={isExpired ? "text-red-400 font-bold" : ""}>
                          {new Date(c.license.expiresAt).toLocaleDateString("pt-BR")}
                        </span>
                      ) : (
                        <span className="text-cyan-400 font-semibold uppercase text-xs">Vitalícia</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleOpenHistory(c)}
                          className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                          Histórico & Cobrança
                        </button>
                        <button
                          onClick={() => handleOpenEditLicense(c)}
                          className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                          Editar Licença
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(c.id, c.name)}
                          className="bg-red-950/30 hover:bg-red-900/40 text-red-400 hover:text-red-350 border border-red-900/30 hover:border-red-800/50 text-xs font-bold py-1.5 px-3 rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5 text-red-400" />
                          Excluir Empresa
                        </button>
                      </div>
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
        <div className="bg-[#0a0f1c]/80 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-300">
          <table className="w-full text-left">
            <thead className="bg-[#101726] text-slate-350 text-xs uppercase tracking-wider font-bold border-b border-slate-800">
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
                      <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs px-2 py-0.5 rounded font-mono font-bold uppercase">
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
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-1.5 px-3 rounded-lg shadow-md transition-colors cursor-pointer"
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
        <div className="bg-[#0a0f1c]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl animate-in fade-in duration-300">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 pb-2 border-b border-slate-800">
            <Settings className="w-5 h-5 text-cyan-400" />
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
                  className="w-full px-3.5 py-2.5 text-sm bg-[#050914] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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
                    className="flex-1 px-3.5 py-2 text-sm bg-[#050914] border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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
                    className="flex-1 px-3.5 py-2 text-sm bg-[#050914] border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Plans Management Section */}
            <div className="space-y-4 pt-4 border-t border-slate-850">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                Precificação dos Planos (Exibidos na Landing Page)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((p: any) => (
                  <div key={p.id} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-white text-sm uppercase">{p.name}</span>
                      <span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20 px-2.5 py-0.5 rounded-full">{p.id}</span>
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
                            className="w-full pl-8 pr-2 py-2 text-xs bg-[#050914] border border-slate-800 rounded-lg text-white font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Cota Máxima de Lojas / Unidades</label>
                        <input
                          type="number"
                          value={p.maxUnits}
                          onChange={(e) => handlePlanPriceChange(p.id, "maxUnits", parseInt(e.target.value, 10) || 1)}
                          className="w-full px-2.5 py-2 text-xs bg-[#050914] border border-slate-800 rounded-lg text-white font-mono"
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
                          className="w-full p-2 text-xs bg-[#050914] border border-slate-800 rounded-lg text-slate-350"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-850">
              <button
                type="submit"
                disabled={savingConfig}
                style={{ 
                  backgroundColor: primaryColor,
                  boxShadow: `0 0 15px rgba(${primaryRGB}, 0.2)`
                }}
                className="text-slate-950 font-extrabold py-2.5 px-8 rounded-xl text-sm flex items-center gap-2 hover:scale-102 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 text-slate-950" />
                {savingConfig ? "Salvando..." : "Salvar Alterações Globais"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Bank / Payment Integration Settings */}
      {activeTab === "pagamentos" && (
        <div className="bg-[#0a0f1c]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl animate-in fade-in duration-300 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              Integração Bancária e Gateway de Pagamentos
            </h3>
            <p className="text-slate-400 text-xs mt-1">Configure as credenciais da sua conta bancária ou gateway de pagamentos para automatizar faturamentos</p>
          </div>

          <form onSubmit={handleSavePaymentConfig} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Form Fields */}
              <div className="space-y-5">
                {/* Gateway Provider */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Provedor / Gateway de Pagamento</label>
                  <select
                    value={paymentGateway}
                    onChange={(e) => setPaymentGateway(e.target.value)}
                    className="w-full px-3.5 py-3 text-sm bg-[#050914] border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="SIMULATOR">Simulador Local (Para Testes e Demonstrações)</option>
                    <option value="ASAAS">Asaas (Recomendado para Pix/Boleto no Brasil)</option>
                    <option value="MERCADO_PAGO">Mercado Pago (Pix, Boleto & Cartão)</option>
                    <option value="STRIPE">Stripe (Cartão de Crédito Global & Apple Pay)</option>
                  </select>
                </div>

                {/* API Key / Access Token */}
                {paymentGateway !== "SIMULATOR" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Chave da API / Access Token</label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={gatewayApiKey}
                        onChange={(e) => setGatewayApiKey(e.target.value)}
                        placeholder={`Insira a chave secreta do ${paymentGateway === 'ASAAS' ? 'Asaas' : paymentGateway === 'MERCADO_PAGO' ? 'Mercado Pago' : 'Stripe'}`}
                        className="w-full pl-3.5 pr-12 py-3 text-xs bg-[#050914] border border-slate-800 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                      >
                        {showApiKey ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 line-through" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Chave privada utilizada pelo servidor para se comunicar com a API do gateway.</p>
                  </div>
                )}

                {/* Webhook Secret Signature */}
                {paymentGateway !== "SIMULATOR" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Chave Secreta do Webhook (Assinatura)</label>
                    <div className="relative">
                      <input
                        type={showWebhookSecret ? "text" : "password"}
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        placeholder="Insira o Token de Assinatura / Webhook Secret"
                        className="w-full pl-3.5 pr-12 py-3 text-xs bg-[#050914] border border-slate-800 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                      >
                        {showWebhookSecret ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 line-through" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Evita requisições falsas no endpoint `/api/webhooks/payment` garantindo autenticidade.</p>
                  </div>
                )}

                {/* Direct PIX Key Fallback */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Chave PIX de Recebimento Direto (Manual)</label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Ex: CNPJ, Telefone, E-mail ou Chave Aleatória"
                    className="w-full px-3.5 py-3 text-xs bg-[#050914] border border-slate-800 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Sua chave PIX para caso queira disponibilizar pagamento direto com aprovação manual.</p>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={savingPayment}
                    style={{ 
                      backgroundColor: primaryColor,
                      boxShadow: `0 0 15px rgba(${primaryRGB}, 0.25)`
                    }}
                    className="text-slate-950 font-extrabold py-3 px-10 rounded-xl text-xs flex items-center gap-2 hover:scale-102 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 text-slate-950" />
                    {savingPayment ? "Salvando Integração..." : "Salvar Configurações Bancárias"}
                  </button>
                </div>
              </div>

              {/* Right Column: Webhook Details & Gateway Instructions */}
              <div className="bg-[#050914] border border-slate-850 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Settings className="w-4 h-4 text-cyan-400" />
                  Instruções para Configuração do Webhook
                </h4>

                {/* URL de Webhook Box */}
                <div className="bg-[#0a0f1c] border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">URL de Notificação Webhook Live (Produção):</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== "undefined" ? window.location.origin + "/api/webhooks/payment" : "https://seusite.com/api/webhooks/payment"}
                      className="flex-1 bg-black/40 border border-slate-800 text-xs px-3 py-2 rounded-lg text-slate-350 font-mono outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = typeof window !== "undefined" ? window.location.origin + "/api/webhooks/payment" : "https://seusite.com/api/webhooks/payment";
                        navigator.clipboard.writeText(url);
                        toast.success("URL copiada!");
                      }}
                      className="bg-slate-900 border border-slate-800 hover:bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Dynamic Instructions Card */}
                {paymentGateway === "SIMULATOR" && (
                  <div className="space-y-3 text-xs leading-relaxed text-slate-400">
                    <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 p-3 rounded-lg font-bold">
                      ℹ️ Modo Simulador Ativo
                    </div>
                    <p>O modo simulador permite realizar contratações fictícias diretamente na Landing Page sem gastar dinheiro real e sem precisar configurar chaves bancárias.</p>
                    <p>Ao fechar um plano, um painel PIX e Cartão simulado surgirá. Clicando em **"Simular Confirmação"**, o sistema dispara uma notificação simulada idêntica à que os gateways de pagamento reais enviam.</p>
                    <p>Utilize este modo para demonstrar a velocidade de ativação do seu SaaS para parceiros ou investidores!</p>
                  </div>
                )}

                {paymentGateway === "ASAAS" && (
                  <div className="space-y-3 text-xs leading-relaxed text-slate-400">
                    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-3 rounded-lg font-bold">
                      🚀 Configurando API do Asaas
                    </div>
                    <ol className="list-decimal pl-4 space-y-2">
                      <li>Acesse sua conta no painel do **Asaas** (ou Sandbox de testes).</li>
                      <li>Vá em **Minha Conta** &gt; **Integrações** &gt; **Gerar Chave de API**.</li>
                      <li>Copie a chave gerada e cole no campo **Chave da API** ao lado.</li>
                      <li>Navegue até a seção de **Webhooks** no Asaas, ative a fila de webhooks para cobranças e configure a URL de Notificação copiada acima.</li>
                      <li>Marque o envio de eventos para `PAYMENT_RECEIVED` (Pagamento Confirmado).</li>
                      <li>Copie o token gerado pelo Asaas para validação e cole no campo **Webhook Secret** ao lado.</li>
                    </ol>
                  </div>
                )}

                {paymentGateway === "MERCADO_PAGO" && (
                  <div className="space-y-3 text-xs leading-relaxed text-slate-400">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg font-bold">
                      💳 Configurando Mercado Pago (Pix/Cartão/Boleto)
                    </div>
                    <ol className="list-decimal pl-4 space-y-2">
                      <li>Acesse o portal do **Mercado Pago Developers** e selecione suas credenciais de produção.</li>
                      <li>Copie o seu **Access Token (Produção)** e cole no campo **Chave da API** ao lado.</li>
                      <li>Acesse a aba **Webhooks / Notificações de IPN**.</li>
                      <li>Adicione a URL do Webhook listada acima.</li>
                      <li>Selecione os eventos de **Pagamentos (payment)** e clique em salvar.</li>
                      <li>O Mercado Pago gerará uma assinatura secreta (`Secret Key`) para você validar os dados. Insira essa chave no campo **Webhook Secret** ao lado para blindar a API.</li>
                    </ol>
                  </div>
                )}

                {paymentGateway === "STRIPE" && (
                  <div className="space-y-3 text-xs leading-relaxed text-slate-400">
                    <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 p-3 rounded-lg font-bold">
                      🌍 Configurando Stripe (Integração Global)
                    </div>
                    <ol className="list-decimal pl-4 space-y-2">
                      <li>Acesse a aba **Developers** &gt; **API Keys** no dashboard da **Stripe**.</li>
                      <li>Copie a **Secret Key** (`sk_live_...` ou `sk_test_...`) e cole no campo **Chave da API** ao lado.</li>
                      <li>Vá para a seção **Webhooks** e clique em **Add Endpoint**.</li>
                      <li>Cole a URL de Webhook copiada no topo desta caixa.</li>
                      <li>Selecione o evento `checkout.session.completed` ou `payment_intent.succeeded` e salve.</li>
                      <li>Copie a **Signing Secret** (`whsec_...`) gerada para este webhook e cole no campo **Webhook Secret** ao lado para validar as requisições.</li>
                    </ol>
                  </div>
                )}

              </div>
            </div>
          </form>
        </div>
      )}

      {/* ----------------- APPROVE DIALOG MODAL ----------------- */}
      {approvalModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
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
                  className="w-full px-3 py-2 text-sm bg-[#050914] border border-slate-800 rounded-lg text-white font-bold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">O cliente poderá cadastrar filiais até bater esta cota.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Data de Vencimento da Licença</label>
                <input
                  type="date"
                  value={expiresAtStr}
                  onChange={(e) => setExpiresAtStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#050914] border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">Selecione uma data limite ou deixe em branco para licença vitalícia.</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setApprovalModalRequest(null)}
                  disabled={approving}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-white rounded-lg border border-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={approving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 px-6 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
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
          <div className="bg-[#0a0f1c] border-2 border-emerald-500/50 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(16,185,129,0.2)] p-6 relative text-center">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>

            <h3 className="text-xl font-black text-white mb-1">Licença Ativada com Sucesso!</h3>
            <p className="text-xs text-slate-400 mb-6">Copie e envie as credenciais iniciais para o cliente acessar o ERP.</p>

            <div className="bg-[#050914] border border-slate-800 rounded-xl p-4 text-left space-y-3 mb-6 font-mono text-xs relative overflow-hidden">
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
                className="bg-slate-900 hover:bg-slate-850 text-slate-350 font-bold py-3 px-6 rounded-xl text-xs border border-slate-800"
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
          <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
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
                  className="w-full px-3 py-2 text-sm bg-[#050914] border border-slate-800 rounded-lg text-white font-bold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer"
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
                  className="w-full px-3 py-2 text-sm bg-[#050914] border border-slate-800 rounded-lg text-white font-bold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">O cliente poderá cadastrar filiais até atingir esta cota.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Status do Acesso</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#050914] border border-slate-800 rounded-lg text-white font-bold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer"
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
                  className="w-full px-3 py-2 text-sm bg-[#050914] border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">Deixe em branco para licença vitalícia.</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setEditLicenseCompany(null)}
                  disabled={updatingLicense}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-white rounded-lg border border-slate-800 transition-colors"
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

      {/* ----------------- DETALHES & HISTÓRICO & CENTRAL DE COBRANÇA MODAL ----------------- */}
      {selectedCompanyHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl p-6 md:p-8 relative overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Top glowing cyber border */}
            <div 
              style={{ background: `linear-gradient(to right, transparent, ${primaryColor}, transparent)` }}
              className="absolute top-0 left-0 w-full h-[2px] opacity-75"
            ></div>

            <button
              onClick={() => setSelectedCompanyHistory(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header info */}
            <div className="border-b border-slate-800/80 pb-6 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Building className="w-7 h-7 text-cyan-400 animate-pulse" />
                <h3 className="text-2xl font-black text-white">{selectedCompanyHistory.name}</h3>
                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold uppercase">
                  {selectedCompanyHistory.license?.plan || "BASIC"}
                </span>
              </div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                Gestão Administrativa & Log de Auditoria do Cliente
              </p>
            </div>

            {/* Main two-column dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Client information details */}
              <div className="space-y-6">
                <div className="bg-[#050914] border border-slate-850 rounded-2xl p-5 space-y-4">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider text-cyan-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <FileText className="w-4 h-4" /> Informações Contratuais
                  </h4>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block font-sans">CNPJ/Documento:</span>
                      <span className="text-slate-350 font-bold">{selectedCompanyHistory.document || "Não Informado"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Data de Cadastro:</span>
                      <span className="text-slate-350">{new Date(selectedCompanyHistory.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Administrador Principal:</span>
                      <span className="text-slate-200 font-bold font-sans">{selectedCompanyHistory.users[0]?.name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">E-mail de Login:</span>
                      <span className="text-cyan-400 break-all">{selectedCompanyHistory.users[0]?.email || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Cota Máxima de Lojas:</span>
                      <span className="text-slate-200 font-bold">{selectedCompanyHistory.license?.maxUnits || 1} filiais</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Status da Licença:</span>
                      {selectedCompanyHistory.license?.status === "ACTIVE" ? (
                        <span className="text-emerald-400 font-bold uppercase">Ativo</span>
                      ) : (
                        <span className="text-red-400 font-bold uppercase">Inativo/Suspenso</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Último Faturamento:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        {selectedCompanyHistory.license?.updatedAt 
                          ? new Date(selectedCompanyHistory.license.updatedAt).toLocaleDateString("pt-BR") 
                          : new Date(selectedCompanyHistory.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Data de Expiração:</span>
                      <span className="text-slate-350 font-bold">
                        {selectedCompanyHistory.license?.expiresAt 
                          ? new Date(selectedCompanyHistory.license.expiresAt).toLocaleDateString("pt-BR") 
                          : "Vitalícia / Recorrência"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Billing Panel Box */}
                <div className="bg-[#050914] border border-slate-850 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h4 className="text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Central de Cobranças
                    </h4>
                    <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-bold">
                      <button
                        onClick={() => setBillingType("email")}
                        className={`px-2.5 py-1 rounded-md transition-colors ${billingType === "email" ? "bg-cyan-500 text-slate-950 font-extrabold" : "text-slate-400 hover:text-white"}`}
                      >
                        E-MAIL
                      </button>
                      <button
                        onClick={() => setBillingType("whatsapp")}
                        className={`px-2.5 py-1 rounded-md transition-colors ${billingType === "whatsapp" ? "bg-cyan-500 text-slate-950 font-extrabold" : "text-slate-400 hover:text-white"}`}
                      >
                        WHATSAPP
                      </button>
                    </div>
                  </div>

                  {billingType === "email" ? (
                    <div className="space-y-3.5">
                      <div className="text-[11px] text-slate-400">
                        Prepara e envia um e-mail de faturamento formal contendo o resumo e o link seguro para geração do Boleto / PIX.
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Assunto da Notificação</label>
                        <input
                          type="text"
                          value={billingSubject}
                          onChange={(e) => setBillingSubject(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-[#0a0f1c] border border-slate-800 rounded-lg text-white font-bold focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Mensagem de Faturamento</label>
                        <textarea
                          rows={6}
                          value={billingMessage}
                          onChange={(e) => setBillingMessage(e.target.value)}
                          className="w-full p-3 text-xs bg-[#0a0f1c] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-sans leading-relaxed"
                        />
                      </div>
                      <button
                        onClick={handleSendEmailBilling}
                        disabled={sendingBilling}
                        className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black uppercase tracking-wider text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:scale-[1.01] active:scale-98 cursor-pointer disabled:opacity-50"
                      >
                        <Mail className="w-4 h-4" />
                        {sendingBilling ? "Disparando Mensagem..." : "Enviar Cobrança por E-mail"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-[11px] text-slate-400 leading-relaxed">
                        Prepara uma notificação formatada para redes móveis e abre o **WhatsApp Web** direto no chat do cliente com a mensagem e o link do boleto prontos para envio.
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Número do WhatsApp (com DDD)</label>
                        <div className="relative">
                          <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Ex: 5511999999999"
                            value={billingPhone}
                            onChange={(e) => setBillingPhone(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-[#0a0f1c] border border-slate-800 rounded-lg text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1">Dica: Inclua o código do país (55) seguido do DDD e número de celular.</p>
                      </div>

                      <div className="bg-[#0a0f1c]/50 p-4 border border-slate-850 rounded-xl space-y-3.5 text-xs">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block font-mono">Prévia da Mensagem (WhatsApp Web)</span>
                        <div className="bg-[#050914] p-3 rounded-lg border border-slate-800/80 font-sans text-slate-300 leading-relaxed space-y-2 whitespace-pre-line border-dashed">
                          <strong>{appName} - AVISO DE FATURAMENTO</strong>
                          
                          Olá, {selectedCompanyHistory.users[0]?.name || "Gestor"}!
                          
                          Informamos que a fatura da licença da sua empresa *{selectedCompanyHistory.name}* está disponível:
                          
                          🔹 *Plano:* {selectedCompanyHistory.license?.plan} ({selectedCompanyHistory.license?.maxUnits} Unidades)
                          🔹 *Mensalidade:* R$ {(plans.find(p => p.id === selectedCompanyHistory.license?.plan)?.price || (selectedCompanyHistory.license?.plan === "BASIC" ? 99.90 : selectedCompanyHistory.license?.plan === "PRO" ? 249.90 : 499.90)).toFixed(2)}
                          
                          👉 Para efetuar o pagamento da fatura e evitar suspensão, clique no link do seu *Boleto / PIX*:
                          <span className="text-cyan-400 break-all">https://pagamentos.lumuserp.com/cobranca/boleto-{selectedCompanyHistory.id.split("-")[0]}</span>
                        </div>
                      </div>

                      <button
                        onClick={handleSendWhatsappBilling}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:scale-[1.01] active:scale-98 cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Disparar WhatsApp com Link de Boleto
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Customer audit events logs history */}
              <div className="bg-[#050914] border border-slate-850 rounded-2xl p-5 flex flex-col min-h-[400px]">
                <h4 className="text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 mb-4">
                  <History className="w-4 h-4 animate-spin-slow" /> Histórico de Auditoria & Cobranças
                </h4>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[480px] custom-scrollbar">
                  {(customAuditLogs[selectedCompanyHistory.id] || []).map((log) => {
                    const isEmail = log.type === "EMAIL_SENT";
                    const isWhatsapp = log.type === "WHATSAPP_SENT";
                    const isUpdate = log.type === "LICENSE_UPDATE";
                    
                    let iconColor = "bg-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.3)]";
                    if (isEmail) iconColor = "bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.4)]";
                    else if (isWhatsapp) iconColor = "bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]";
                    else if (isUpdate) iconColor = "bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.4)]";

                    return (
                      <div key={log.id} className="relative flex gap-3 text-xs animate-in slide-in-from-right-4 duration-300">
                        {/* Bullet connection node */}
                        <div className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] z-10 uppercase ${iconColor}`}>
                            {log.type.substring(0, 2)}
                          </div>
                          <div className="w-[1.5px] bg-slate-800 flex-1 min-h-[30px] mt-1"></div>
                        </div>

                        {/* Event text contents */}
                        <div className="bg-[#0a0f1c]/70 border border-slate-850 rounded-xl p-3 flex-1 relative group hover:border-slate-800 transition-colors">
                          <span className="text-[10px] text-slate-500 font-mono block mb-1">{log.date}</span>
                          <p className="text-slate-200 font-semibold leading-relaxed">{log.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {(!customAuditLogs[selectedCompanyHistory.id] || customAuditLogs[selectedCompanyHistory.id].length === 0) && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-16">
                      <History className="w-10 h-10 text-slate-700 mb-2" />
                      <p className="text-xs">Nenhum evento registrado ainda.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom action close button */}
            <div className="border-t border-slate-800/80 pt-6 mt-8 flex justify-end">
              <button
                onClick={() => setSelectedCompanyHistory(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
              >
                Concluir Visualização
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
