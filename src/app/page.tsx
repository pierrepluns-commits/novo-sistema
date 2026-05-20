import React from "react";
import { LandingPageClient } from "./LandingPageClient";
import { getSystemConfig } from "@/app/actions/mestre";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const systemConfig = await getSystemConfig();

  return (
    <LandingPageClient systemConfig={systemConfig} />
  );
}

