import React from "react";
import { MasterLoginClient } from "./MasterLoginClient";
import { getSystemConfig } from "@/app/actions/mestre";

export const dynamic = "force-dynamic";

export default async function MasterLoginPage() {
  const systemConfig = await getSystemConfig();

  return (
    <MasterLoginClient systemConfig={systemConfig} />
  );
}
