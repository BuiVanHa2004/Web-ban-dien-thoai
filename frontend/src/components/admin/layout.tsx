
"use client";

import React from "react";
import { useRouter } from "next/navigation";

import Sidebar from "./sidebar";
import Topbar from "./topbar";
import AdminChatBox from "./AdminChatBox";
import { settingService } from "@/services/settingService";

type AdminLayoutProps = {
  children: React.ReactNode;
  userName?: string;
};

export default function AdminLayout({ children, userName }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [adminUser, setAdminUser] = React.useState<{ id: number; fullName: string; username: string; avatarUrl?: string | null } | null>(null);
  const [adminToken, setAdminToken] = React.useState<string | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;

    const verifyAndInitialize = async () => {
      try {
        const token = localStorage.getItem("token");
        const userRaw = localStorage.getItem("user");
        const user = userRaw ? (JSON.parse(userRaw) as { userType?: string; role?: string }) : null;

        // No token or user in localStorage
        if (!token || !user || user.userType !== "admin") {
          if (!cancelled) {
            router.replace("/login");
          }
          return;
        }

        // Verify token with backend
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:8080'}/api/auth/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            // Token invalid/expired
            throw new Error('Token validation failed');
          }

          const meData = await response.json();
          
          // Verify still admin
          if (meData.userType !== 'ADMIN') {
            throw new Error('Not an admin user');
          }

          if (cancelled) return;

          // Update user data from backend (in case it changed)
          const updatedUser = {
            id: meData.userId,
            email: meData.email,
            name: meData.name,
            fullName: meData.name,
            username: meData.username,
            avatarUrl: meData.avatarUrl,
            userType: meData.userType.toLowerCase(),
            role: meData.role,
          };

          localStorage.setItem('user', JSON.stringify(updatedUser));
          setAdminUser(updatedUser as any);
          setAdminToken(token);

          const role = (meData.role || "").toUpperCase();
          const isStaff = role && role !== "ADMIN";

          if (isStaff) {
            try {
              const s = await settingService.getMaintenance();
              if (cancelled) return;
              if (s?.isMaintenance) {
                router.replace("/maintenance");
              }
            } catch {
              // ignore
            }
          }
        } catch (verifyError) {
          // Token verification failed - logout
          if (!cancelled) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.replace("/login");
          }
          return;
        }
      } catch (error) {
        if (!cancelled) {
          router.replace("/login");
        }
      } finally {
        if (!cancelled) {
          setIsVerifying(false);
        }
      }
    };

    verifyAndInitialize();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Show loading state while verifying
  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="text-slate-500">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-portal customer-portal-bg-base relative min-h-dvh text-slate-800 antialiased" style={{ overflow: "visible" }}>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="customer-portal-bg-shift absolute inset-0" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(99,102,241,0.04),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(241,245,249,0.5),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(148,163,184,0.3) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-dvh">
        {/* Overlay mobile - z-index thấp hơn sidebar */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 sm:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div className="min-w-0 flex-1">
          <Topbar
            userName={userName}
            userAvatarUrl={adminUser?.avatarUrl}
            onToggleSidebar={() => {
              // mobile: mở drawer, desktop: collapse
              if (window.innerWidth < 640) {
                setMobileOpen((v) => !v);
              } else {
                setCollapsed((v) => !v);
              }
            }}
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
            <div className="customer-card-surface relative rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-lg shadow-slate-200/50 ring-1 ring-slate-200/50 backdrop-blur-xl transition-all duration-300 sm:rounded-[2.5rem] sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      
      {adminUser && adminToken && (
        <AdminChatBox
          adminId={adminUser.id}
          adminName={adminUser.fullName || adminUser.username}
          token={adminToken}
        />
      )}
    </div>
  );
}

