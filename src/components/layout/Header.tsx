"use client";

import React from "react";
import { Menu, UserCircle, LogOut, Store } from "lucide-react";
import { logoutUser } from "@/app/actions/auth";

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

  return (
    <header className="h-16 bg-[#0a0f1c]/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-20">
      <div className="flex items-center gap-6">
        <button className="md:hidden text-slate-400 hover:bg-slate-800 p-2 rounded-xl transition-colors">
          <Menu className="w-5 h-5" />
        </button>

        {/* Unit Selector / Badge */}
        {role && (
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-cyan-400" />
            {isRestricted ? (
              <span className="text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full">
                {activeUnit ? activeUnit.name : "Unidade Padrão"}
              </span>
            ) : (
              <div className="relative">
                <select
                  value={selectedUnitId}
                  onChange={handleUnitChange}
                  className="bg-[#0f172a] border border-slate-800 text-xs font-bold text-slate-200 rounded-xl px-3 py-1.5 pr-8 focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer appearance-none hover:border-slate-700 transition-colors"
                >
                  <option value="">Todas as Unidades</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[10px]">
                  ▼
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/20 text-cyan-400 p-1.5 rounded-full">
            <UserCircle className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-slate-200 hidden sm:block">{userName}</span>
        </div>
        
        {/* Logout Button */}
        <button 
          onClick={() => logoutUser()} 
          className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
          title="Sair do sistema"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:block">Sair</span>
        </button>
      </div>
    </header>
  );
}
