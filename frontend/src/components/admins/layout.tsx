
"use client";

import React from "react";
import { useRouter } from "next/navigation";

import Sidebar from "./sidebar";
import Topbar from "./topbar";
import { settingService } from "@/services/settingService";

type AdminLayoutProps = {
  children: React.ReactNode;
  userName?: string;
};

export default function AdminLayout({ children, userName }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;
    try {
      const token = localStorage.getItem("token");
      const userRaw = localStorage.getItem("user");
      const user = userRaw ? (JSON.parse(userRaw) as { userType?: string; role?: string }) : null;

      if (!token || !user || user.userType !== "admin") {
        router.replace("/login");
        return;
      }

      const role = (user.role || "").toUpperCase();
      const isStaff = role && role !== "ADMIN";

      if (isStaff) {
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
      }
    } catch {
      router.replace("/login");
    }

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="customer-portal dark customer-portal-bg-base relative min-h-dvh text-zinc-100 antialiased" style={{ overflow: "visible" }}>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
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

      <div className="relative z-10 flex min-h-dvh">
        <Sidebar collapsed={collapsed} />
        <div className="min-w-0 flex-1">
          <Topbar
            userName={userName}
            onToggleSidebar={() => setCollapsed((v) => !v)}
            onLogout={() => {
              try {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
              } finally {
                router.replace("/login");
              }
            }}
          />
          <main className="min-w-0 p-4 sm:p-6">
            <div className="customer-card-surface relative rounded-2xl border border-zinc-500/70 bg-zinc-800/40 p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-500/35 backdrop-blur-xl transition-all duration-300 sm:rounded-[2.5rem] sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

