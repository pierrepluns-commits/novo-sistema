"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Package, ShoppingCart, DollarSign, Inbox, Settings } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-blue-400", bgHover: "hover:bg-blue-500/10" },
    { href: "/usuarios", label: "Usuários", icon: Users, color: "text-purple-400", bgHover: "hover:bg-purple-500/10" },
    { href: "/estoque", label: "Estoque", icon: Package, color: "text-orange-400", bgHover: "hover:bg-orange-500/10" },
    { href: "/caixa", label: "Caixa", icon: Inbox, color: "text-yellow-400", bgHover: "hover:bg-yellow-500/10" },
    { href: "/pdv", label: "PDV & Vendas", icon: ShoppingCart, color: "text-green-400", bgHover: "hover:bg-green-500/10" },
    { href: "/financeiro", label: "Financeiro", icon: DollarSign, color: "text-emerald-400", bgHover: "hover:bg-emerald-500/10" },
    { href: "/configuracao", label: "Configurações", icon: Settings, color: "text-cyan-400", bgHover: "hover:bg-cyan-500/10" },
  ];

  return (
    <aside className="w-64 bg-[#0a0f1c] border-r border-slate-800 shadow-[4px_0_24px_rgba(0,0,0,0.5)] hidden md:flex flex-col min-h-screen z-10">
      <div className="p-6 border-b border-slate-800 flex flex-col items-center justify-center">
        <h2 className="text-3xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] to-[#0055ff] drop-shadow-[0_0_10px_rgba(0,243,255,0.6)] uppercase">
          Cyber<span className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">ERP</span>
        </h2>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                isActive 
                  ? "bg-[#162032] text-white shadow-sm border border-slate-700/50" 
                  : `text-slate-400 hover:text-slate-200 ${link.bgHover}`
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${isActive ? "bg-slate-800/80 shadow-inner" : ""}`}>
                <Icon className={`w-5 h-5 ${isActive ? link.color : "text-slate-500 group-hover:" + link.color}`} />
              </div>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
