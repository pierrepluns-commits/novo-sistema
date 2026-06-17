"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { 
  LayoutDashboard, Users, Package, ShoppingCart, 
  DollarSign, Inbox, Settings, Shield, Building, Coins, CreditCard,
  ClipboardList, Contact
} from "lucide-react";

interface SidebarProps {
  role?: string;
}

function SidebarContent({ role }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams?.get("tab") || "empresas";

  const isMestre = role === "SUPER_ADMIN" || pathname.startsWith("/mestre");

  const normalSections = [
    {
      title: "Visão Geral",
      links: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, textColor: "text-sky-400", activeBg: "bg-sky-500/10", iconColor: "text-sky-400" },
      ]
    },
    {
      title: "Operacional",
      links: [
        { href: "/pdv", label: "PDV & Vendas", icon: ShoppingCart, textColor: "text-emerald-400", activeBg: "bg-emerald-500/10", iconColor: "text-emerald-400" },
        { href: "/caixa", label: "Caixa", icon: Inbox, textColor: "text-emerald-400", activeBg: "bg-emerald-500/10", iconColor: "text-yellow-400" },
        { href: "/estoque", label: "Estoque", icon: Package, textColor: "text-emerald-400", activeBg: "bg-emerald-500/10", iconColor: "text-amber-500" },
      ]
    },
    {
      title: "Atendimento",
      links: [
        { href: "/clientes", label: "Clientes", icon: Contact, textColor: "text-orange-500", activeBg: "bg-orange-500/10", iconColor: "text-orange-500" },
        { href: "/os", label: "Ordens de Serviço", icon: ClipboardList, textColor: "text-amber-300", activeBg: "bg-amber-500/10", iconColor: "text-amber-400" },
      ]
    },
    {
      title: "Administração",
      links: [
        { href: "/financeiro", label: "Financeiro", icon: DollarSign, textColor: "text-purple-400", activeBg: "bg-purple-500/10", iconColor: "text-purple-400" },
        { href: "/usuarios", label: "Usuários", icon: Users, textColor: "text-purple-400", activeBg: "bg-purple-500/10", iconColor: "text-fuchsia-400" },
        { href: "/configuracao", label: "Configurações", icon: Settings, textColor: "text-slate-400", activeBg: "bg-slate-500/10", iconColor: "text-slate-400" },
      ]
    }
  ];

  const adminSections = [
    {
      title: "Administração SaaS",
      links: [
        { href: "/mestre/empresas?tab=empresas", tabId: "empresas", label: "Clientes & Licenças", icon: Building, textColor: "text-cyan-400", activeBg: "bg-cyan-500/10", iconColor: "text-cyan-400" },
        { href: "/mestre/empresas?tab=solicitacoes", tabId: "solicitacoes", label: "Solicitações de Adesão", icon: Coins, textColor: "text-emerald-400", activeBg: "bg-emerald-500/10", iconColor: "text-emerald-400" },
        { href: "/mestre/empresas?tab=config", tabId: "config", label: "Customização SaaS", icon: Settings, textColor: "text-blue-400", activeBg: "bg-blue-500/10", iconColor: "text-blue-400" },
        { href: "/mestre/empresas?tab=pagamentos", tabId: "pagamentos", label: "Integração Bancária", icon: CreditCard, textColor: "text-cyan-400", activeBg: "bg-cyan-500/10", iconColor: "text-cyan-400" },
      ]
    }
  ];

  const sections = isMestre ? adminSections : normalSections;

  return (
    <aside className="w-64 bg-[#0a0f1c] border-r border-slate-800 shadow-[4px_0_24px_rgba(0,0,0,0.5)] hidden md:flex flex-col min-h-screen z-10">
      <div className="p-6 border-b border-slate-800 flex flex-col items-center justify-center">
        {isMestre ? (
          <h2 className="text-2xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] to-[#0055ff] drop-shadow-[0_0_10px_rgba(0,243,255,0.6)] uppercase flex items-center gap-1.5">
            <Shield className="w-6 h-6 text-cyan-400 animate-pulse" />
            <span>Mestre</span>
            <span className="text-white">SaaS</span>
          </h2>
        ) : (
          <h2 className="text-3xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] to-[#0055ff] drop-shadow-[0_0_10px_rgba(0,243,255,0.6)] uppercase">
            Cyber<span className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">ERP</span>
          </h2>
        )}
      </div>
      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-500/70 uppercase tracking-wider px-3 select-none">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.links.map((link) => {
                const Icon = link.icon;
                const isActive = isMestre 
                  ? activeTab === (link as any).tabId 
                  : pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-300 font-semibold group relative border ${
                      isActive 
                        ? `${link.activeBg} ${link.textColor} border-slate-700/30` 
                        : `text-slate-450 hover:text-slate-200 border-transparent hover:bg-slate-800/20`
                    }`}
                  >
                    {/* Color-specific Icon Container */}
                    <div 
                      className={`p-1.5 rounded-lg transition-all duration-300 flex items-center justify-center ${
                        isActive 
                          ? "bg-slate-900/60 border border-slate-700/50" 
                          : "bg-slate-900/10 border border-transparent group-hover:bg-slate-900/40"
                      }`}
                    >
                      <Icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${isActive ? link.iconColor : `opacity-70 ${link.iconColor} group-hover:opacity-100`}`} />
                    </div>
                    
                    <span className="text-xs relative z-10 transition-colors duration-300">{link.label}</span>
                    
                    {/* Active Right Indicator dot */}
                    {isActive && (
                      <div 
                        className="absolute right-3.5 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: "currentColor" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function Sidebar({ role }: SidebarProps) {
  return (
    <Suspense fallback={
      <aside className="w-64 bg-[#0a0f1c] border-r border-slate-800 hidden md:flex flex-col min-h-screen z-10 animate-pulse" />
    }>
      <SidebarContent role={role} />
    </Suspense>
  );
}
