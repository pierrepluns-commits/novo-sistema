"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import toast from "react-hot-toast";

function ToastLogic() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get("error") === "unauthorized") {
      toast.error("Acesso Negado: Você não tem permissão para acessar este módulo.");
      // Clean up the URL so it doesn't toast again on refresh
      const newUrl = pathname;
      router.replace(newUrl);
    }
  }, [searchParams, pathname, router]);

  return null;
}

export function AuthErrorToast() {
  return (
    <Suspense fallback={null}>
      <ToastLogic />
    </Suspense>
  );
}
