import React, { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MestreDashboardClient } from "./MestreDashboardClient";
import { getSystemConfig } from "@/app/actions/mestre";

export default async function MasterDashboard() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  // 1. Fetch active companies with their admins and licenses
  const companies = await prisma.company.findMany({
    include: {
      license: true,
      users: {
        where: { role: "COMPANY_ADMIN" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // 2. Fetch all incoming SaaS license requests
  const requests = await prisma.licenseRequest.findMany({
    orderBy: { createdAt: "desc" }
  });

  // 3. Fetch singleton SystemConfig
  const systemConfig = await getSystemConfig();

  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto space-y-6 p-8 animate-pulse text-center text-slate-450 font-bold uppercase tracking-wider text-sm">
        Carregando Central do Mestre...
      </div>
    }>
      <MestreDashboardClient 
        initialCompanies={companies}
        initialRequests={requests}
        initialConfig={systemConfig}
      />
    </Suspense>
  );
}
