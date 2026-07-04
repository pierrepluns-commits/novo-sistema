import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import SalariosPageClient from "./SalariosPageClient";

export default async function SalariosPage() {
  const session = await getSession();
  if (!session || !session.companyId) {
    return redirect("/login");
  }

  // Fetch active company users (technicians and administrative staff)
  const employees = await prisma.user.findMany({
    where: {
      companyId: session.companyId,
    },
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <SalariosPageClient employees={employees} />
  );
}
