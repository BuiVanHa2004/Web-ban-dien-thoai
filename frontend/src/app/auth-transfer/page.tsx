"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Auth Transfer Page
 * Receives token + user from another domain via URL params,
 * stores them in this domain's localStorage, then redirects.
 */
export default function AuthTransferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      const token = searchParams.get("token");
      const user = searchParams.get("user");

      if (token && user) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", user);
        // Clean URL then redirect
        window.history.replaceState({}, "", "/statistical");
        router.replace("/statistical");
      } else {
        router.replace("/login");
      }
    } catch {
      router.replace("/login");
    }
  }, [router, searchParams]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0f172a]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Đang chuyển hướng...</p>
      </div>
    </div>
  );
}
