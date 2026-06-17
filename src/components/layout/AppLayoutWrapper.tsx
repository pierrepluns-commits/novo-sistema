"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface Props {
  session: {
    role: string;
    name: string;
  } | null;
  units: any[];
  selectedUnitId: string;
  children: React.ReactNode;
}

export function AppLayoutWrapper({ session, units, selectedUnitId, children }: Props) {
  const pathname = usePathname();

  // Se for a rota pública /, login, ou impressão de O.S., não exibe o sidebar do app
  const isAppRoute = session && pathname !== '/' && !pathname.startsWith('/login') && !pathname.startsWith('/mestre/login') && !pathname.includes('/os/imprimir');

  if (isAppRoute) {
    return (
      <div className="flex h-screen bg-[#060b14] text-slate-200 overflow-hidden">
        <Sidebar role={session.role} />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <Header 
            userName={session.name} 
            units={units}
            selectedUnitId={selectedUnitId}
            role={session.role}
          />
          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      {children}
    </div>
  );
}
