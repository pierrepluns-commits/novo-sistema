"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  CheckCircle2, ChevronRight, BarChart3, ShoppingBag, 
  ShieldCheck, X, Phone, Mail, Building, User, Info,
  ArrowRight, HelpCircle, Star, Sparkles, Sliders, ChevronDown,
  LayoutGrid, Receipt, Landmark, RefreshCw, Users, ShieldAlert,
  CreditCard, QrCode, Lock, Check, Copy, ExternalLink, Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import { createLicenseRequestAction } from "@/app/actions/mestre";

interface LandingPageClientProps {
  systemConfig: any;
}

export function LandingPageClient({ systemConfig }: LandingPageClientProps) {
  const appName = systemConfig?.appName || "Encaixe Soluções";
  const primaryColor = systemConfig?.primaryColor || "#e11d48";
  const secondaryColor = systemConfig?.secondaryColor || "#f97316";
  
  const plans = (() => {
    try {
      const parsed = JSON.parse(systemConfig?.plansConfig || "[]");
      return parsed.length > 0 ? parsed : [
        { id: "BASIC", name: "Básico", price: 49.90, maxUnits: 1, desc: "Para pequenos comércios ou MEI. Permite 1 unidade/loja." },
        { id: "PRO", name: "Pro", price: 99.90, maxUnits: 5, desc: "Para empresas em crescimento. Permite até 5 unidades/lojas." },
        { id: "ENTERPRISE", name: "Enterprise", price: 199.90, maxUnits: 99, desc: "Gestão ilimitada para redes e franquias. Unidades ilimitadas." }
      ];
    } catch (e) {
      return [
        { id: "BASIC", name: "Básico", price: 49.90, maxUnits: 1, desc: "Para pequenos comércios ou MEI. Permite 1 unidade/loja." },
        { id: "PRO", name: "Pro", price: 99.90, maxUnits: 5, desc: "Para empresas em crescimento. Permite até 5 unidades/lojas." },
        { id: "ENTERPRISE", name: "Enterprise", price: 199.90, maxUnits: 99, desc: "Gestão ilimitada para redes e franquias. Unidades ilimitadas." }
      ];
    }
  })();

  // Interactive Plan Switcher State
  const [isAnnual, setIsAnnual] = useState(false);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Public License Request Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("BASIC");
  
  // Form states
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Interactive Checkout States
  const [checkoutStep, setCheckoutStep] = useState<"FORM" | "PAYMENT" | "SUCCESS">("FORM");
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CARD">("PIX");
  const [requestId, setRequestId] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  
  // Credit Card States
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authorizingStep, setAuthorizingStep] = useState("");
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  const handleOpenSignup = (planId: string) => {
    setSelectedPlan(planId);
    setCheckoutStep("FORM");
    setPaymentMethod("PIX");
    setCardNumber("");
    setCardName("");
    setCardExpiry("");
    setCardCvv("");
    setIsModalOpen(true);
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("companyName", companyName);
      formData.append("ownerName", ownerName);
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("plan", selectedPlan);

      const res = await createLicenseRequestAction(formData);
      if (res.error) {
        toast.error(res.error);
      } else if (res.requestId) {
        setRequestId(res.requestId);
        setCheckoutStep("PAYMENT");
        toast.success("Solicitação registrada! Prossiga para o faturamento.");
      } else {
        toast.error("Erro ao processar resposta do servidor.");
      }
    } catch (err: any) {
      toast.error("Erro ao enviar solicitação.");
    } finally {
      setSubmitting(false);
    }
  };

  // Card Inputs Handlers & Brand Helpers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 16) val = val.substring(0, 16);
    const formatted = val.match(/.{1,4}/g)?.join(" ") || val;
    setCardNumber(formatted);
  };

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 4) val = val.substring(0, 4);
    if (val.length >= 3) {
      val = val.substring(0, 2) + "/" + val.substring(2);
    }
    setCardExpiry(val);
  };

  const getCardBrand = (num: string) => {
    const clean = num.replace(/\D/g, "");
    if (clean.startsWith("4")) return "VISA";
    if (/^5[1-5]/.test(clean)) return "MASTERCARD";
    if (/^3[47]/.test(clean)) return "AMEX";
    if (/^6(011|5)/.test(clean)) return "DISCOVER";
    return "GENERIC";
  };

  const triggerWebhookSuccess = async (reqId: string) => {
    try {
      const response = await fetch("/api/webhooks/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId: reqId })
      });
      const data = await response.json();
      if (data.success) {
        setTempPassword(data.tempPassword);
        setCheckoutStep("SUCCESS");
        toast.success("Pagamento Confirmado! Acesso liberado.");
      } else {
        toast.error(data.error || "Erro ao processar ativação de licença.");
      }
    } catch (err: any) {
      toast.error("Falha ao simular confirmação de pagamento.");
    }
  };

  const handleCardPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      toast.error("Por favor, preencha todos os dados do cartão.");
      return;
    }
    setIsAuthorizing(true);
    
    setAuthorizingStep("Conectando com o gateway bancário...");
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setAuthorizingStep("Validando saldo e limite do cartão...");
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setAuthorizingStep("Autorizando cobrança comercial...");
    await new Promise(resolve => setTimeout(resolve, 600));
    
    await triggerWebhookSuccess(requestId);
    setIsAuthorizing(false);
  };

  const handleCopyCredentials = () => {
    const text = `Acesso ${appName}:\nLogin: ${email}\nSenha Provisória: ${tempPassword}\nLink de Login: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    toast.success("Credenciais copiadas!");
    setTimeout(() => setCopiedCredentials(false), 2000);
  };

  // Convert Hex colors to RGB values for transparent glow effects
  const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "0, 243, 255";
  };

  const primaryRGB = hexToRgb(primaryColor);
  const secondaryRGB = hexToRgb(secondaryColor);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 selection:bg-cyan-500/30 selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* Inline styles for custom animations */}
      <style>{`
        @keyframes scan-animation {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 0.8; }
          100% { top: 0%; opacity: 0.8; }
        }
        .animate-scanning {
          animation: scan-animation 3s linear infinite;
        }
      `}</style>
      
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-[#030712]/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              style={{ 
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                boxShadow: `0 0 20px rgba(${primaryRGB}, 0.4)`
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center transform hover:rotate-12 transition-transform duration-300"
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-wider uppercase flex items-center gap-1">
              <span>{appName.split(" ")[0]}</span>
              <span style={{ color: primaryColor }} className="font-extrabold">
                {appName.split(" ").slice(1).join(" ") || "Soluções"}
              </span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
            <a href="#solucoes" className="hover:text-white hover:underline underline-offset-4 transition-all">Soluções</a>
            <a href="#recursos" className="hover:text-white hover:underline underline-offset-4 transition-all">Recursos Premium</a>
            <a href="#planos" className="hover:text-white hover:underline underline-offset-4 transition-all">Planos & Preços</a>
            <a href="#perguntas" className="hover:text-white hover:underline underline-offset-4 transition-all">Dúvidas</a>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-bold text-slate-300 hover:text-white transition-colors py-2 px-4 rounded-xl hover:bg-white/5"
            >
              Acessar Painel
            </Link>
            <button 
              onClick={() => handleOpenSignup("PRO")}
              style={{ 
                backgroundColor: primaryColor,
                boxShadow: `0 0 20px rgba(${primaryRGB}, 0.5)`
              }}
              className="hover:scale-105 active:scale-95 transition-all text-white text-sm font-black py-2.5 px-6 rounded-xl hover:brightness-110"
            >
              Iniciar Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 md:pt-52 md:pb-36 overflow-hidden">
        {/* Glow ambient background elements */}
        <div 
          style={{ backgroundColor: primaryColor }}
          className="absolute top-1/4 left-1/3 -translate-x-1/2 w-[600px] h-[600px] opacity-15 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse"
        ></div>
        <div 
          style={{ backgroundColor: secondaryColor }}
          className="absolute top-1/2 left-2/3 -translate-x-1/2 w-[500px] h-[500px] opacity-10 rounded-full blur-[160px] pointer-events-none -z-10"
        ></div>
        
        {/* Hero Grid lines decorative background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-20"></div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <div 
            style={{ 
              borderColor: `rgba(${primaryRGB}, 0.25)`,
              backgroundColor: `rgba(${primaryRGB}, 0.08)`,
              color: primaryColor
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black tracking-widest uppercase mb-8 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
          >
            <span style={{ backgroundColor: primaryColor }} className="w-2.5 h-2.5 rounded-full animate-ping"></span>
            Plataforma SaaS Multi-Empresas Homologada
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tight leading-[1.1] mb-8">
            Eleve o patamar de gestão <br />
            da sua rede com o <span style={{ color: primaryColor }} className="font-black bg-gradient-to-r from-[#00f3ff] via-[#00aaff] to-[#0055ff] bg-clip-text text-transparent">{appName}</span>
          </h1>
          
          <p className="text-base sm:text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            A solução de automação comercial definitiva. Controle de Caixa PDV ultra-veloz, gestão multi-lojas com controle rígido de quotas por licença, relatórios financeiros detalhados e recibos 100% customizáveis.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 max-w-md mx-auto">
            <a 
              href="#planos"
              style={{ 
                backgroundColor: primaryColor,
                boxShadow: `0 0 25px rgba(${primaryRGB}, 0.4)`
              }}
              className="w-full sm:w-auto hover:scale-105 active:scale-98 text-white font-black py-4 px-10 rounded-2xl transition-all flex items-center justify-center gap-2 text-lg cursor-pointer hover:brightness-110"
            >
              Escolher Plano
              <ChevronRight className="w-5 h-5 animate-bounce-horizontal" />
            </a>
            <a 
              href="#solucoes"
              className="w-full sm:w-auto hover:bg-white/5 text-white font-bold py-4 px-10 rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2 text-lg"
            >
              Conhecer Recursos
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400 font-semibold">
            <span className="flex items-center gap-2 shadow-sm"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0"/> Ativação Imediata</span>
            <span className="flex items-center gap-2 shadow-sm"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0"/> Sem Taxas Ocultas</span>
            <span className="flex items-center gap-2 shadow-sm"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0"/> Quotas Customizáveis</span>
          </div>
        </div>
      </section>

      {/* Bento Grid Showcase */}
      <section id="solucoes" className="py-28 bg-[#070b16] relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-white">
              Tecnologia Desenvolvida para Escalar
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Centralize a gestão de todas as suas lojas em um único painel e reduza custos operacionais.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Bento Card 1 */}
            <div className="p-8 rounded-3xl bg-[#0c1225] border border-white/5 hover:border-white/10 hover:bg-[#0e162d] transition-all duration-300 flex flex-col justify-between group shadow-lg">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Frente de Caixa (PDV)</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Interface limpa e otimizada para operadores de caixa. Realize vendas rápidas, aplique descontos, adicione taxas personalizadas por venda e tenha suporte a leitores de código de barras.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-blue-400 font-bold">
                Alta velocidade de operação <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Bento Card 2 */}
            <div className="p-8 rounded-3xl bg-[#0c1225] border border-white/5 hover:border-white/10 hover:bg-[#0e162d] transition-all duration-300 flex flex-col justify-between group shadow-lg">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Gestão Financeira Sem Erros</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Auditoria de caixa em tempo real. Estorne transações, lance vendas retroativas com ajuste imediato de faturamento dos respectivos dias e acesse um extrato completo com gráficos interativos.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-cyan-400 font-bold">
                Segurança e transparência contábil <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Bento Card 3 */}
            <div className="p-8 rounded-3xl bg-[#0c1225] border border-white/5 hover:border-white/10 hover:bg-[#0e162d] transition-all duration-300 flex flex-col justify-between group shadow-lg">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Receipt className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Impressão Personalizada</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Crie recibos perfeitos para o seu negócio. Ajuste o cabeçalho, rodapé, regras comerciais, termos de troca e de garantia. Suporte nativo para bobinas de 80mm, 58mm e impressões A4.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-blue-400 font-bold">
                Layouts de nota configuráveis <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Bento Card 4 (Full Width on md) */}
            <div className="p-8 rounded-3xl bg-[#0c1225] border border-white/5 hover:border-white/10 hover:bg-[#0e162d] transition-all duration-300 md:col-span-2 flex flex-col md:flex-row gap-8 items-center justify-between shadow-lg">
              <div className="space-y-4 max-w-lg">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase">
                  Multi-lojas
                </div>
                <h3 className="text-3xl font-black text-white">Centralize Todas as Suas Filiais</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Crie novos logins para caixas e gerentes de lojas individuais. O administrador do sistema tem total visão de faturamento consolidado e estoque segmentado por unidade comercial, bloqueando novos cadastros caso atinja a quota de unidades do plano contratado.
                </p>
              </div>
              <div className="w-full md:w-auto shrink-0 bg-[#090d1a] border border-white/5 p-6 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-8 text-xs">
                  <span className="text-slate-400 font-semibold">Plano Básico:</span>
                  <span className="text-white font-extrabold">1 Unidade</span>
                </div>
                <div className="flex items-center justify-between gap-8 text-xs">
                  <span className="text-slate-400 font-semibold">Plano Pro:</span>
                  <span className="text-white font-extrabold">5 Unidades</span>
                </div>
                <div className="flex items-center justify-between gap-8 text-xs">
                  <span className="text-slate-400 font-semibold">Plano Enterprise:</span>
                  <span className="text-emerald-400 font-extrabold">Ilimitadas</span>
                </div>
                <div className="h-[1px] bg-white/5 my-2"></div>
                <div className="text-[10px] text-slate-500 text-center font-bold">Bloqueio inteligente de quotas ativo</div>
              </div>
            </div>

            {/* Bento Card 5 */}
            <div className="p-8 rounded-3xl bg-[#0c1225] border border-white/5 hover:border-white/10 hover:bg-[#0e162d] transition-all duration-300 flex flex-col justify-between group shadow-lg">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Sliders className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Painel Administrativo Mestre</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Controle total sobre o seu ecossistema SaaS. Aprovação instantânea de licenças, edição de valores de planos, definição das cores e identidade visual da página inicial em tempo real.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-purple-400 font-bold">
                Controle SaaS de ponta a ponta <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="planos" className="py-28 relative overflow-hidden border-t border-white/5">
        <div 
          style={{ backgroundColor: secondaryColor }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-10 rounded-full blur-[140px] pointer-events-none"
        ></div>
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Escolha a Licença Certa</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10">
              Assine com flexibilidade e ganhe velocidade na gestão de suas unidades comerciais.
            </p>

            {/* Interactive Billing Toggle */}
            <div className="inline-flex items-center gap-3 bg-[#0c1225] border border-white/5 p-1.5 rounded-2xl shadow-inner mb-6">
              <button 
                onClick={() => setIsAnnual(false)}
                className={`py-2 px-6 rounded-xl text-xs font-black transition-all ${
                  !isAnnual ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Mensal
              </button>
              <button 
                onClick={() => setIsAnnual(true)}
                className={`py-2 px-6 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  isAnnual ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Anual
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[9px]">
                  -20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {plans.map((p: any) => {
              const isPro = p.id === "PRO";
              const monthlyPrice = p.price;
              const displayPrice = isAnnual ? monthlyPrice * 0.8 : monthlyPrice;

              return (
                <div 
                  key={p.id} 
                  style={{ 
                    borderColor: isPro ? primaryColor : "rgba(255, 255, 255, 0.05)",
                    boxShadow: isPro ? `0 0 35px rgba(${primaryRGB}, 0.15)` : "none"
                  }}
                  className={`p-8 rounded-3xl bg-[#0c1225] border flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                    isPro ? "scale-105 z-10 border-2" : "border hover:border-white/10"
                  }`}
                >
                  {isPro && (
                    <div 
                      style={{ backgroundColor: primaryColor }}
                      className="absolute top-0 right-0 px-5 py-1.5 text-[9px] font-black uppercase text-white tracking-widest rounded-bl-2xl shadow-md"
                    >
                      Recomendado
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Plano</span>
                      <h3 className="text-3xl font-black text-white">{p.name}</h3>
                      <p className="text-slate-400 text-xs mt-2.5 leading-relaxed">{p.desc}</p>
                    </div>

                    <div className="py-2 border-y border-white/5 my-4">
                      <div className="flex items-baseline">
                        <span className="text-xs font-bold text-slate-400 mr-1.5">R$</span>
                        <span className="text-5xl font-black text-white tracking-tight">
                          {displayPrice.toFixed(2)}
                        </span>
                        <span className="text-slate-500 text-xs font-bold ml-1.5"> / mês</span>
                      </div>
                      {isAnnual && (
                        <div className="text-[10px] text-emerald-400 font-extrabold mt-1">
                          Faturado anualmente (Economia de R$ {(monthlyPrice * 0.2 * 12).toFixed(2)}/ano)
                        </div>
                      )}
                    </div>

                    <div className="space-y-3.5 pt-2">
                      <div className="flex items-center gap-3 text-sm text-slate-200">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>Cota: <strong className="font-extrabold text-white">{p.maxUnits === 99 ? "Lojas Ilimitadas" : `${p.maxUnits} ${p.maxUnits === 1 ? 'Loja' : 'Lojas'}`}</strong></span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-200">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>Controle de Caixa PDV Completo</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-200">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>Gestão Financeira & Despesas</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-200">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>Impressão de Nota Customizada</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-200">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>Lançamentos Retroativos e Estornos</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      onClick={() => handleOpenSignup(p.id)}
                      style={{ 
                        backgroundColor: isPro ? primaryColor : "#1e293b",
                        boxShadow: isPro ? `0 0 20px rgba(${primaryRGB}, 0.35)` : "none"
                      }}
                      className="w-full text-white hover:scale-103 active:scale-98 transition-all font-black py-4 px-6 rounded-2xl text-sm hover:brightness-110"
                    >
                      Adquirir Plano {p.name}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Core comparison list banner */}
          <div className="mt-16 bg-[#0c1225] border border-white/5 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-lg">
            <div className="space-y-2 text-center md:text-left">
              <h4 className="text-xl font-bold text-white">Precisa de recursos adicionais ou licenças customizadas?</h4>
              <p className="text-slate-400 text-sm">Podemos construir soluções customizadas para a sua rede de franquias ou grandes comércios.</p>
            </div>
            <button
              onClick={() => handleOpenSignup("ENTERPRISE")}
              style={{ borderColor: primaryColor, color: primaryColor }}
              className="px-8 py-3.5 rounded-2xl border-2 font-black text-sm hover:bg-white/5 active:scale-95 transition-all w-full md:w-auto text-center"
            >
              Falar com Consultor
            </button>
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="py-24 bg-[#070b16] relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span style={{ color: primaryColor }} className="text-xs font-black uppercase tracking-wider">Depoimentos</span>
            <h2 className="text-3xl md:text-5xl font-black text-white mt-2 mb-4">Quem usa, aprova.</h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">Veja a experiência de empreendedores reais com a nossa plataforma.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "A migração para o sistema da CyberERP simplificou nossas operações cotidianas. O controle multi-unidades com travamento de quota nos deu segurança total ao expandir a rede.",
                author: "Carlos Eduardo",
                role: "Dono da Rede Frango Frito (5 Lojas)",
                stars: 5
              },
              {
                quote: "O PDV é extremamente fluido e rápido. A personalização dos recibos de venda nos ajudou a criar notas com visual premium que agregam muito valor às nossas sacolas.",
                author: "Amanda Souza",
                role: "Proprietária da Closet Boutique (1 Loja)",
                stars: 5
              },
              {
                quote: "O suporte técnico é fantástico e a transparência financeira do sistema nos deu segurança para auditorias. Conseguimos ajustar fluxos de caixas retroativos de forma fantástica.",
                author: "Roberto Lima",
                role: "Diretor Comercial da Distribuidora Real",
                stars: 5
              }
            ].map((t, idx) => (
              <div key={idx} className="p-8 rounded-3xl bg-[#0c1225] border border-white/5 flex flex-col justify-between shadow-lg relative">
                <div className="absolute top-8 right-8 text-slate-800 text-6xl font-serif select-none pointer-events-none">“</div>
                <div className="space-y-4 relative z-10">
                  <div className="flex gap-1">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed italic">"{t.quote}"</p>
                </div>
                <div className="mt-8 pt-6 border-t border-white/5">
                  <h4 className="font-bold text-white text-sm">{t.author}</h4>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section id="perguntas" className="py-24 relative overflow-hidden border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <span style={{ color: primaryColor }} className="text-xs font-black uppercase tracking-wider">Perguntas Frequentes</span>
            <h2 className="text-3xl md:text-5xl font-black text-white mt-2 mb-4">Tire Suas Dúvidas</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">Tudo o que você precisa saber sobre o sistema de gestão.</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Como funciona a liberação de licença?",
                a: "Após preencher a solicitação na plataforma, nosso time administrativo analisa e aprova o seu cadastro. Um usuário administrador principal é gerado para sua empresa, e você recebe os detalhes de acesso via e-mail ou WhatsApp para iniciar a configuração."
              },
              {
                q: "O que acontece ao atingir o limite de unidades?",
                a: "Cada plano possui uma quota máxima de unidades (lojas). Se tentar criar uma loja que ultrapasse o limite do seu plano, a plataforma bloqueará o cadastro de forma inteligente e convidará você a realizar o upgrade de plano."
              },
              {
                q: "É possível configurar o estilo de impressão dos recibos?",
                a: "Com certeza! No menu de configurações da empresa, você consegue escolher o tipo de bobina (80mm ou 58mm) ou folha A4, e personalizar os textos de cabeçalho, rodapé e as políticas de troca exibidas para os clientes."
              },
              {
                q: "Posso lançar movimentações financeiras em datas anteriores?",
                a: "Sim. A nossa plataforma suporta lançamentos retroativos. Desta forma, se você esqueceu de lançar uma venda ou despesa ontem, poderá fazê-lo e o sistema recalculará automaticamente o fluxo de caixa do respectivo dia."
              },
              {
                q: "A plataforma oferece backups diários dos meus dados?",
                a: "Sim, os seus dados comerciais, cadastros de produtos, fluxos de vendas e relatórios contábeis são salvos em nuvem de maneira segura e automática, com redundâncias diárias para evitar qualquer perda de informação."
              }
            ].map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div 
                  key={idx} 
                  className="rounded-2xl bg-[#0c1225] border border-white/5 overflow-hidden transition-all duration-300 shadow-md"
                >
                  <button 
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-white hover:bg-white/5 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    }`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-4 animate-in slide-in-from-top-3 duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-28 relative overflow-hidden text-center border-t border-white/5">
        <div 
          style={{ backgroundColor: primaryColor }}
          className="absolute inset-0 opacity-10 bg-gradient-to-b from-[#030712] to-slate-900 pointer-events-none -z-10"
        ></div>
        
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
            Leve transparência e controle <br />
            para as suas lojas hoje mesmo.
          </h2>
          <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto">
            Cadastre suas unidades comerciais, configure seus recibos e gerencie faturamentos de forma centralizada e sem dor de cabeça.
          </p>
          <button
            onClick={() => handleOpenSignup("PRO")}
            style={{ 
              backgroundColor: primaryColor,
              boxShadow: `0 0 25px rgba(${primaryRGB}, 0.5)`
            }}
            className="text-white hover:scale-105 active:scale-95 font-black py-5 px-14 rounded-2xl transition-all text-lg hover:brightness-110"
          >
            Aproveitar Teste Grátis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-slate-500 text-xs bg-[#02050f]">
        <div className="max-w-7xl mx-auto px-6 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div 
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              className="w-6 h-6 rounded-md flex items-center justify-center"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white tracking-widest uppercase">{appName}</span>
          </div>
          <p>© 2026 {appName}. Todos os direitos reservados. Orgulhosamente desenvolvido para Empreendedores.</p>
        </div>
      </footer>

      {/* -------------------- DYNAMIC SIGNUP & CHECKOUT MODAL -------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[#0c1225] border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 md:p-8 relative animate-in zoom-in-95 duration-200 my-8">
            
            {/* Close button - hidden in success to force onboarding finish */}
            {checkoutStep !== "SUCCESS" && (
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* STEP 1: REGISTRATION FORM */}
            {checkoutStep === "FORM" && (
              <>
                <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
                  <Building className="w-6 h-6" style={{ color: primaryColor }} />
                  Adquirir Licença - {appName}
                </h3>
                <p className="text-xs text-slate-400 mb-6 flex items-center gap-1.5 leading-relaxed">
                  <Info className="w-4 h-4 text-slate-500 shrink-0" />
                  Solicite a liberação da sua licença SaaS. O faturamento e ativação serão gerados na próxima tela.
                </p>

                <form onSubmit={handleSubmitRequest} className="space-y-4 text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">Nome da Empresa</label>
                      <div className="relative">
                        <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="Ex: Comercial Zionix"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-3 text-sm bg-[#040814] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">Nome do Proprietário</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="Ex: Zionix Silva"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-3 text-sm bg-[#040814] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-all font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">E-mail de Contato</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          placeholder="Ex: admin@comercial.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-3 text-sm bg-[#040814] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">Telefone de Contato</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          placeholder="Ex: (11) 99999-9999"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-3 text-sm bg-[#040814] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-all font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Plano Contratado</label>
                    <select
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="w-full px-3.5 py-3 text-sm bg-[#040814] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-all cursor-pointer font-bold"
                    >
                      {plans.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — R$ {p.price.toFixed(2)} / mês ({p.maxUnits === 99 ? 'Lojas Ilimitadas' : `Até ${p.maxUnits} ${p.maxUnits === 1 ? 'Loja' : 'Lojas'}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={submitting}
                      className="px-5 py-3 text-xs font-bold bg-slate-800 hover:bg-slate-750 text-white rounded-xl border border-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{ 
                        backgroundColor: primaryColor,
                        boxShadow: `0 0 20px rgba(${primaryRGB}, 0.35)`
                      }}
                      className="hover:scale-103 active:scale-98 text-white font-black py-3 px-8 rounded-xl text-xs flex items-center gap-1.5 hover:brightness-110 transition-all"
                    >
                      {submitting ? "Processando..." : "Confirmar Envio"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* STEP 2: CHECKOUT BILLING PANEL (PIX & CREDIT CARD) */}
            {checkoutStep === "PAYMENT" && (
              <div className="space-y-6">
                
                {/* Plan header resume */}
                <div className="bg-[#050914] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span style={{ color: primaryColor }} className="text-[10px] font-black uppercase tracking-widest block font-mono">Resumo do Pedido</span>
                    <h4 className="text-lg font-extrabold text-white">Licença {plans.find((p: any) => p.id === selectedPlan)?.name}</h4>
                    <span className="text-xs text-slate-400">{plans.find((p: any) => p.id === selectedPlan)?.maxUnits === 99 ? 'Lojas Ilimitadas' : `${plans.find((p: any) => p.id === selectedPlan)?.maxUnits} Unidades`}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white font-mono">R$ {plans.find((p: any) => p.id === selectedPlan)?.price.toFixed(2)}</span>
                    <span className="text-slate-500 text-[10px] block font-bold">faturamento mensal</span>
                  </div>
                </div>

                {/* Checkout tabs buttons */}
                <div className="flex border-b border-slate-800 gap-2">
                  <button
                    onClick={() => setPaymentMethod("PIX")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-all relative ${
                      paymentMethod === "PIX" ? "text-cyan-400 border-cyan-400 font-extrabold" : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    PIX (Ativação Instantânea)
                  </button>
                  <button
                    onClick={() => setPaymentMethod("CARD")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-all relative ${
                      paymentMethod === "CARD" ? "text-cyan-400 border-cyan-400 font-extrabold" : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Cartão de Crédito
                  </button>
                </div>

                {/* PIX TAB SCREEN */}
                {paymentMethod === "PIX" && (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      {/* QR Code Container */}
                      <div className="p-4 bg-white rounded-2xl shadow-[0_0_25px_rgba(255,255,255,0.1)] relative group overflow-hidden border-2 border-cyan-400/50">
                        {/* Simulated QR Code SVG */}
                        <svg className="w-36 h-36 text-slate-950" viewBox="0 0 100 100">
                          <rect width="100" height="100" fill="white"/>
                          {/* Outer borders */}
                          <rect x="5" y="5" width="25" height="25" fill="black"/>
                          <rect x="8" y="8" width="19" height="19" fill="white"/>
                          <rect x="11" y="11" width="13" height="13" fill="black"/>

                          <rect x="70" y="5" width="25" height="25" fill="black"/>
                          <rect x="73" y="8" width="19" height="19" fill="white"/>
                          <rect x="76" y="11" width="13" height="13" fill="black"/>

                          <rect x="5" y="70" width="25" height="25" fill="black"/>
                          <rect x="8" y="73" width="19" height="19" fill="white"/>
                          <rect x="11" y="76" width="13" height="13" fill="black"/>

                          {/* Random pixel data squares */}
                          <rect x="35" y="10" width="8" height="8" fill="black"/>
                          <rect x="45" y="5" width="6" height="12" fill="black"/>
                          <rect x="55" y="15" width="10" height="6" fill="black"/>
                          
                          <rect x="10" y="35" width="12" height="6" fill="black"/>
                          <rect x="25" y="45" width="8" height="8" fill="black"/>
                          <rect x="5" y="55" width="15" height="8" fill="black"/>
                          
                          <rect x="35" y="35" width="30" height="30" fill="black"/>
                          <rect x="40" y="40" width="20" height="20" fill="white"/>
                          <rect x="45" y="45" width="10" height="10" fill="black"/>
                          
                          <rect x="75" y="35" width="15" height="6" fill="black"/>
                          <rect x="85" y="45" width="10" height="12" fill="black"/>
                          <rect x="70" y="60" width="8" height="8" fill="black"/>

                          <rect x="35" y="75" width="12" height="15" fill="black"/>
                          <rect x="55" y="80" width="15" height="8" fill="black"/>
                          <rect x="75" y="75" width="20" height="20" fill="black"/>
                          <rect x="80" y="80" width="10" height="10" fill="white"/>
                        </svg>
                        
                        {/* Scanning line animation */}
                        <div className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#00f3ff] animate-scanning top-0 pointer-events-none"></div>
                      </div>
                      
                      {/* Copy & Paste Code */}
                      <div className="w-full space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-center">Pix Copia e Cola:</span>
                        <div className="flex gap-2 items-center bg-[#040814] border border-slate-800 p-2.5 rounded-xl">
                          <input
                            type="text"
                            readOnly
                            value={`00020101021226930014br.gov.bcb.pix2571${systemConfig?.pixKey || 'pix-qrcodex-key-goes-here-simulated-billing-transaction-lumus-erp-checkout-live'}`}
                            className="flex-1 bg-transparent text-[11px] text-slate-400 font-mono outline-none select-all truncate"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`00020101021226930014br.gov.bcb.pix2571${systemConfig?.pixKey || 'pix-qrcodex-key-goes-here-simulated-billing-transaction-lumus-erp-checkout-live'}`);
                              toast.success("Código PIX copiado!");
                            }}
                            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 p-2 rounded-lg text-slate-450 hover:text-white transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Waiting feedback & simulate button */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-2 text-xs text-slate-450">
                        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                        <span>Aguardando a confirmação do pagamento pelo banco...</span>
                      </div>

                      <button
                        onClick={() => triggerWebhookSuccess(requestId)}
                        style={{ 
                          backgroundColor: primaryColor,
                          boxShadow: `0 0 20px rgba(${primaryRGB}, 0.3)`
                        }}
                        className="w-full py-4 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-98 transition-all hover:brightness-110 cursor-pointer shadow-md"
                      >
                        <CheckCircle2 className="w-4 h-4 text-white animate-pulse" />
                        Confirmar Pagamento Simulado (Webhook)
                      </button>
                    </div>
                  </div>
                )}

                {/* CREDIT CARD TAB SCREEN */}
                {paymentMethod === "CARD" && (
                  <div className="space-y-5">
                    
                    {/* Visual Card Preview */}
                    <div 
                      style={{ 
                        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                        boxShadow: `0 0 25px rgba(${primaryRGB}, 0.25)`
                      }}
                      className="w-full h-44 rounded-2xl p-5 relative overflow-hidden text-white font-mono flex flex-col justify-between select-none shadow-lg border border-white/10"
                    >
                      {/* Chip & Brand */}
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-8 bg-gradient-to-r from-yellow-300 to-amber-500 rounded-md opacity-80 border border-amber-600/30 flex items-center justify-center relative">
                          <div className="absolute inset-1 border border-amber-700/20 rounded"></div>
                          <div className="w-6 h-[1px] bg-amber-700/30 absolute left-2 top-2"></div>
                          <div className="w-6 h-[1px] bg-amber-700/30 absolute left-2 top-4"></div>
                          <div className="w-6 h-[1px] bg-amber-700/30 absolute left-2 top-6"></div>
                        </div>
                        <span className="text-xs font-black tracking-widest bg-black/20 px-2 py-0.5 rounded uppercase">
                          {getCardBrand(cardNumber)}
                        </span>
                      </div>

                      {/* Number */}
                      <div className="text-lg font-black tracking-widest text-center my-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                        {cardNumber || "•••• •••• •••• ••••"}
                      </div>

                      {/* Name & Expiry */}
                      <div className="flex justify-between items-end text-xs">
                        <div className="truncate pr-4 max-w-[70%]">
                          <span className="text-[9px] text-white/50 block font-sans">Titular</span>
                          <span className="font-bold tracking-wider uppercase truncate block">
                            {cardName || "NOME DO TITULAR"}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-[9px] text-white/50 block font-sans">Validade</span>
                          <span className="font-bold tracking-wider">
                            {cardExpiry || "MM/YY"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Form */}
                    <form onSubmit={handleCardPaymentSubmit} className="space-y-4 relative text-left">
                      {isAuthorizing && (
                        <div className="absolute inset-0 bg-[#0c1225]/90 backdrop-blur-sm z-20 rounded-2xl flex flex-col items-center justify-center text-center p-4">
                          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
                          <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">{authorizingStep}</h4>
                          <p className="text-[10px] text-slate-400 mt-1">Isso simula o retorno real da API bancária em 1.8 segundos.</p>
                        </div>
                      )}

                      {/* Card Number */}
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Número do Cartão</label>
                        <div className="relative">
                          <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            placeholder="Ex: 4111 2222 3333 4444"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[#040814] border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500 transition-all"
                          />
                        </div>
                      </div>

                      {/* Name */}
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Nome Impresso no Cartão</label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            placeholder="Ex: ZIONIX SILVA"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value.toUpperCase())}
                            className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[#040814] border border-slate-700 rounded-xl text-white font-sans focus:outline-none focus:border-cyan-500 transition-all font-semibold uppercase"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Expiry */}
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1.5">Validade</label>
                          <input
                            type="text"
                            required
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={handleCardExpiryChange}
                            className="w-full px-3 py-2.5 text-xs bg-[#040814] border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500 transition-all text-center"
                          />
                        </div>

                        {/* CVV */}
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1.5">CVC / CVV</label>
                          <input
                            type="password"
                            required
                            maxLength={4}
                            placeholder="123"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                            className="w-full px-3 py-2.5 text-xs bg-[#040814] border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500 transition-all text-center"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isAuthorizing}
                        style={{ 
                          backgroundColor: primaryColor,
                          boxShadow: `0 0 20px rgba(${primaryRGB}, 0.3)`
                        }}
                        className="w-full py-3.5 mt-2 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-98 transition-all hover:brightness-110 cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <Lock className="w-4 h-4" />
                        Autorizar Cartão e Assinar
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: PAYMENT CONFIRMED / ACCESS GRANTED SCREEN */}
            {checkoutStep === "SUCCESS" && (
              <div className="text-center space-y-6">
                
                {/* Neon Sparkle Header */}
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 animate-pulse">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white">Pagamento Confirmado!</h3>
                  <p className="text-xs text-slate-400 mt-1">Sua conta comercial SaaS foi liberada e está ativada.</p>
                </div>

                {/* Credentials Panel */}
                <div className="bg-[#040814] border border-slate-800 rounded-2xl p-5 text-left space-y-4 font-mono text-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                  
                  <div>
                    <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Painel Administrativo:</span>
                    <span className="text-blue-400 break-all font-bold flex items-center gap-1">
                      {window.location.origin}/login
                      <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Seu E-mail de Acesso:</span>
                    <span className="text-slate-200 font-bold">{email}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Senha Provisória Gerada:</span>
                    <span className="text-emerald-400 font-extrabold text-sm tracking-wider">{tempPassword}</span>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleCopyCredentials}
                    className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    {copiedCredentials ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                    {copiedCredentials ? "Copiado!" : "Copiar Credenciais"}
                  </button>

                  <Link href="/login" className="flex-1">
                    <button
                      style={{ 
                        backgroundColor: primaryColor,
                        boxShadow: `0 0 20px rgba(${primaryRGB}, 0.35)`
                      }}
                      className="w-full text-white font-black py-3.5 px-6 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all hover:scale-102 hover:brightness-110 cursor-pointer shadow-md"
                    >
                      Acessar o CyberERP
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
