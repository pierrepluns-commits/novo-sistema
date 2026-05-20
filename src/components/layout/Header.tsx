"use client";

import React, { useState } from "react";
import { 
  Menu, 
  X,
  UserCircle, 
  LogOut, 
  Store,
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Inbox, 
  Settings 
} from "lucide-react";
import { logoutUser } from "@/app/actions/auth";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function Header({ 
  userName = "Administrador",
  units = [],
  selectedUnitId = "",
  role = ""
}: { 
  userName?: string;
  units?: any[];
  selectedUnitId?: string;
  role?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "") {
      document.cookie = "selectedUnitId=; path=/; max-age=0; SameSite=Lax";
    } else {
      document.cookie = `selectedUnitId=${val}; path=/; max-age=31536000; SameSite=Lax`;
    }
    window.location.reload();
  };

  const isRestricted = role === "CASHIER" || role === "UNIT_MANAGER";
  const activeUnit = units.find(u => u.id === selectedUnitId);

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
    <>
      <header className="h-16 bg-[#0a0f1c]/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-3 sm:px-6 md:px-8 sticky top-0 z-20">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Hamburger Menu Button */}
          <button 
            onClick={() => setIsOpen(true)}
            className="md:hidden text-slate-400 hover:bg-slate-800/30 p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center cursor-pointer min-w-[40px] min-h-[40px] flex-shrink-0"
            title="Abrir menu"
          >
            <Menu className="w-6 h-6 text-slate-200" />
          </button>

          {/* Unit Selector / Badge */}
          {role && (
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Store className="w-4 h-4 text-cyan-400 flex-shrink-0 hidden xs:block" />
              {isRestricted ? (
                <span className="text-[10px] sm:text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 sm:px-3 py-1 rounded-full truncate max-w-[120px] xs:max-w-[150px] sm:max-w-none">
                  {activeUnit ? activeUnit.name : "Unidade Padrão"}
                </span>
              ) : (
                <div className="relative min-w-0">
                  <select
                    value={selectedUnitId}
                    onChange={handleUnitChange}
                    className="bg-[#0f172a] border border-slate-800 text-[11px] sm:text-xs font-bold text-slate-200 rounded-xl px-2.5 py-1.5 pr-7 focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer appearance-none hover:border-slate-700 transition-colors w-full max-w-[110px] xs:max-w-[150px] sm:max-w-none"
                  >
                    <option value="">Todas as Unidades</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[9px] sm:text-[10px]">
                    ▼
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-cyan-500/20 text-cyan-400 p-1.5 rounded-full flex-shrink-0">
              <UserCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-sm font-bold text-slate-200 hidden sm:block truncate max-w-[120px]">{userName}</span>
          </div>
          
          {/* Logout Button */}
          <button 
            onClick={() => logoutUser()} 
            className="flex items-center gap-1.5 sm:gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1.5 sm:p-2 rounded-lg transition-colors border border-transparent hover:border-red-500/30 cursor-pointer flex-shrink-0"
            title="Sair do sistema"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:block">Sair</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Drawer Panel */}
      <div className={`fixed top-0 left-0 bottom-0 w-72 bg-[#0a0f1c] border-r border-slate-800 z-50 p-6 flex flex-col shadow-2xl md:hidden transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex justify-between items-center pb-6 border-b border-slate-800 mb-6">
          <h2 className="text-2xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] to-[#0055ff] drop-shadow-[0_0_8px_rgba(0,243,255,0.4)] uppercase">
            Cyber<span className="text-white">ERP</span>
          </h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isActive 
                    ? "bg-[#162032] text-white shadow-sm border border-slate-700/50" 
                    : `text-slate-400 hover:text-slate-200 ${link.bgHover}`
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isActive ? "bg-slate-800/80 shadow-inner" : ""}`}>
                  <Icon className={`w-5 h-5 ${isActive ? link.color : "text-slate-500 group-hover:" + link.color}`} />
                </div>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-slate-800 mt-auto">
          <div className="flex items-center gap-3 mb-4 px-2">
            <UserCircle className="w-8 h-8 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-200 line-clamp-1">{userName}</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{role}</span>
            </div>
          </div>
          <button 
            onClick={() => logoutUser()} 
            className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 py-3 rounded-xl transition-colors border border-red-500/20 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-semibold">Sair do Sistema</span>
          </button>
        </div>
      </div>
    </>
  );
}
