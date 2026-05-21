import React from "react";
import { LandingPageClient } from "./LandingPageClient";
import { getPublicSystemConfig } from "@/app/actions/mestre";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const systemConfig = await getPublicSystemConfig();

  return (
    <LandingPageClient systemConfig={systemConfig} />
  );
}

