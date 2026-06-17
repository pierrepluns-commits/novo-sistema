import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { Toaster } from "react-hot-toast";
import { AuthErrorToast } from "@/components/ui/AuthErrorToast";
import { prisma } from "@/lib/prisma";
import { getSelectedUnitId } from "@/app/actions/unit";
import { AppLayoutWrapper } from "@/components/layout/AppLayoutWrapper";

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

  let units: any[] = [];
  let selectedUnitId: string | null = null;

  if (session && session.companyId) {
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
        
        <AppLayoutWrapper 
          session={session ? { role: session.role, name: session.name as string } : null} 
          units={units} 
          selectedUnitId={selectedUnitId || ""}
        >
          {children}
        </AppLayoutWrapper>
      </body>
    </html>
  );
}
