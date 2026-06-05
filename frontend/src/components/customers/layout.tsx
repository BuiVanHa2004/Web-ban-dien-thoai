"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";

import CustomerFooter from "@/components/customers/footer";
import PremiumHeader from "@/components/customers/header";
import AiAssistantWidget from "@/components/customers/AiAssistantWidget";
import CompareWidget from "@/components/customers/CompareWidget";
import AuthModal from "@/components/customers/AuthModal";
import CustomerPageTransition from "@/components/customers/CustomerPageTransition";
import { settingService } from "@/services/settingService";

type CustomerLayoutProps = {
  children: React.ReactNode;
};

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = React.useState(false);

  const isProfilePage = pathname === "/profile";

  const isProtectedRoute = React.useMemo(() => {
    if (!pathname) return false;
    if (pathname === "/profile") return true;
    if (pathname === "/cart") return true;
    if (pathname === "/order") return true;
    if (pathname.startsWith("/order/")) return true;
    if (pathname === "/payment") return true;
    return false;
  }, [pathname]);

  React.useEffect(() => {
    let cancelled = false;
    try {
      const token = localStorage.getItem("token");
      const userRaw = localStorage.getItem("user");
      const user = userRaw ? (JSON.parse(userRaw) as { userType?: string }) : null;

      if (isProtectedRoute && (!token || !user || user.userType !== "customer")) {
        router.replace("/login");
        return;
      }

      (async () => {
        try {
          const s = await settingService.getMaintenance();
          if (cancelled) return;
          if (s?.isMaintenance) {
            router.replace("/maintenance");
          }
        } catch {
          // ignore
        }
      })();
    } catch {
      if (isProtectedRoute) {
        router.replace("/login");
      }
    }

    return () => {
      cancelled = true;
    };
  }, [router, isProtectedRoute]);

  return (
    <div className="customer-portal dark customer-portal-bg-base relative min-h-dvh text-zinc-100 antialiased">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="customer-portal-bg-shift absolute inset-0" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(228,228,231,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(24,24,27,0.45),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(212,212,216,0.22) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <PremiumHeader />
        <main className="flex-1 pt-3 pb-8 sm:pt-4 sm:pb-12">
          <CustomerPageTransition>
            <div
              className={`mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 ${
                isProfilePage
                  ? "customer-card-surface rounded-2xl border border-zinc-500/70 bg-zinc-800/40 p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-500/35 backdrop-blur-xl sm:rounded-[2.5rem] sm:p-8 lg:p-12"
                  : ""
              }`}
            >
              {children}
            </div>
          </CustomerPageTransition>
        </main>
        <CustomerFooter />
      </div>
      <AiAssistantWidget onOpenChange={setChatOpen} />
      <CompareWidget chatOpen={chatOpen} />
      <AuthModal />
    </div>
  );
}
