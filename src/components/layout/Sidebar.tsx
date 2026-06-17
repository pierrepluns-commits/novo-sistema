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

  const normalLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-blue-400", hoverColor: "group-hover:text-blue-400", bgHover: "hover:bg-blue-500/10", shadowColor: "rgba(96,165,250,0.3)" },
    { href: "/clientes", label: "Clientes", icon: Contact, color: "text-cyan-400", hoverColor: "group-hover:text-cyan-400", bgHover: "hover:bg-cyan-500/10", shadowColor: "rgba(34,211,238,0.3)" },
    { href: "/os", label: "Ordens de Serviço", icon: ClipboardList, color: "text-amber-500", hoverColor: "group-hover:text-amber-500", bgHover: "hover:bg-amber-500/10", shadowColor: "rgba(245,158,11,0.3)" },
    { href: "/usuarios", label: "Usuários", icon: Users, color: "text-purple-400", hoverColor: "group-hover:text-purple-400", bgHover: "hover:bg-purple-500/10", shadowColor: "rgba(192,132,252,0.3)" },
    { href: "/estoque", label: "Estoque", icon: Package, color: "text-orange-400", hoverColor: "group-hover:text-orange-400", bgHover: "hover:bg-orange-500/10", shadowColor: "rgba(251,146,60,0.3)" },
    { href: "/caixa", label: "Caixa", icon: Inbox, color: "text-yellow-400", hoverColor: "group-hover:text-yellow-400", bgHover: "hover:bg-yellow-500/10", shadowColor: "rgba(250,204,21,0.3)" },
    { href: "/pdv", label: "PDV & Vendas", icon: ShoppingCart, color: "text-emerald-400", hoverColor: "group-hover:text-emerald-400", bgHover: "hover:bg-emerald-500/10", shadowColor: "rgba(52,211,153,0.3)" },
    { href: "/financeiro", label: "Financeiro", icon: DollarSign, color: "text-green-400", hoverColor: "group-hover:text-green-400", bgHover: "hover:bg-green-500/10", shadowColor: "rgba(74,222,128,0.3)" },
    { href: "/configuracao", label: "Configurações", icon: Settings, color: "text-slate-400", hoverColor: "group-hover:text-slate-400", bgHover: "hover:bg-slate-500/10", shadowColor: "rgba(148,163,184,0.3)" },
  ];

  const adminLinks = [
    { href: "/mestre/empresas?tab=empresas", tabId: "empresas", label: "Clientes & Licenças", icon: Building, color: "text-cyan-400", hoverColor: "group-hover:text-cyan-400", bgHover: "hover:bg-cyan-500/10", shadowColor: "rgba(34,211,238,0.3)" },
    { href: "/mestre/empresas?tab=solicitacoes", tabId: "solicitacoes", label: "Solicitações de Adesão", icon: Coins, color: "text-emerald-400", hoverColor: "group-hover:text-emerald-400", bgHover: "hover:bg-emerald-500/10", shadowColor: "rgba(52,211,153,0.3)" },
    { href: "/mestre/empresas?tab=config", tabId: "config", label: "Customização SaaS", icon: Settings, color: "text-blue-400", hoverColor: "group-hover:text-blue-400", bgHover: "hover:bg-blue-500/10", shadowColor: "rgba(96,165,250,0.3)" },
    { href: "/mestre/empresas?tab=pagamentos", tabId: "pagamentos", label: "Integração Bancária", icon: CreditCard, color: "text-cyan-400", hoverColor: "group-hover:text-cyan-400", bgHover: "hover:bg-cyan-500/10", shadowColor: "rgba(34,211,238,0.3)" },
  ];

  const links = isMestre ? adminLinks : normalLinks;

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
      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = isMestre 
            ? activeTab === (link as any).tabId 
            : pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-semibold group relative overflow-hidden ${
                isActive 
                  ? "bg-[#162032] text-white shadow-sm border border-slate-700/50" 
                  : `text-slate-400 hover:text-slate-200 ${link.bgHover}`
              }`}
            >
              {/* Glassmorphism Icon Circle */}
              <div 
                className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center ${
                  isActive 
                    ? "bg-slate-900/60 border border-slate-700/50" 
                    : "bg-slate-900/20 border border-transparent group-hover:bg-slate-850 group-hover:border-slate-700/30"
                }`}
                style={isActive ? { boxShadow: `0 0 10px ${link.shadowColor}` } : {}}
              >
                <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? link.color : `text-slate-500 ${link.hoverColor}`}`} />
              </div>
              
              <span className="relative z-10 transition-colors duration-300">{link.label}</span>
              
              {/* Left active line indicator */}
              {isActive && (
                <div 
                  className="absolute left-0 top-1/4 w-[3px] h-1/2 rounded-r-full"
                  style={{ backgroundColor: link.shadowColor.replace("0.3", "1") }}
                />
              )}
            </Link>
          );
        })}
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
