import React from "react";
import { LoginClient } from "./LoginClient";
import { getSystemConfig } from "@/app/actions/mestre";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const systemConfig = await getSystemConfig();

  return (
    <LoginClient systemConfig={systemConfig} />
  );
}
