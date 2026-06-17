import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { getSession } from "@/lib/auth";
import { Toaster } from "react-hot-toast";
import { AuthErrorToast } from "@/components/ui/AuthErrorToast";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSelectedUnitId } from "@/app/actions/unit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CyberERP - Sistema de Gestão",
  description: "Gerencie seu negócio com facilidade.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  
  // Se for a rota pública /, login, ou impressão de O.S., não exibe o sidebar do app
  const isAppRoute = pathname !== '/' && !pathname.startsWith('/login') && !pathname.startsWith('/mestre/login') && !pathname.includes('/os/imprimir');

  let units: any[] = [];
  let selectedUnitId: string | null = null;

  if (session && session.companyId && isAppRoute) {
    [units, selectedUnitId] = await Promise.all([
      prisma.unit.findMany({
        where: { companyId: session.companyId },
        orderBy: { name: "asc" }
      }),
      getSelectedUnitId()
    ]);
  }

  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthErrorToast />
        <Toaster position="top-right" toastOptions={{ 
          style: { background: '#0a0f1c', color: '#fff', border: '1px solid #1e293b' },
          error: { style: { border: '1px solid #ef4444' } },
          success: { style: { border: '1px solid #22c55e' } }
        }} />
        
        {session && isAppRoute ? (
          <div className="flex h-screen bg-[#060b14] text-slate-200 overflow-hidden">
            <Sidebar role={session.role} />
            <div className="flex-1 flex flex-col min-w-0 relative">
              <Header 
                userName={session.name as string} 
                units={units}
                selectedUnitId={selectedUnitId || ""}
                role={session.role}
              />
              <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        ) : (
          <div className="min-h-screen bg-[#020617] text-slate-200">
            {children}
          </div>
        )}
      </body>
    </html>
  );
}
