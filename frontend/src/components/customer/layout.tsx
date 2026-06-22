"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";

import CustomerFooter from "@/components/customer/footer";
import PremiumHeader from "@/components/customer/header";
import UnifiedAiWidget from "@/components/customer/UnifiedAiWidget";
import AuthModal from "@/components/customer/AuthModal";
import CustomerPageTransition from "@/components/customer/CustomerPageTransition";
import ChatBox from "@/components/customer/ChatBox";
import { settingService } from "@/services/settingService";

type CustomerLayoutProps = {
  children: React.ReactNode;
};

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // State cho ChatBox
  const [chatUser, setChatUser] = React.useState<{ id: number; fullName: string; username: string } | null>(null);
  const [chatToken, setChatToken] = React.useState<string | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);

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

    const verifyAndInitialize = async () => {
      try {
        const token = localStorage.getItem("token");
        const userRaw = localStorage.getItem("user");
        const user = userRaw ? (JSON.parse(userRaw) as { userType?: string }) : null;

        // If protected route and no token/user → redirect to login
        if (isProtectedRoute && (!token || !user || user.userType !== "customer")) {
          if (!cancelled) {
            router.replace("/login");
          }
          return;
        }

        // If we have a token, verify it with backend
        if (token && user) {
          if (isProtectedRoute) {
            setIsVerifying(true);
          }

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

            if (cancelled) return;

            // Verify still customer
            if (meData.userType !== 'CUSTOMER') {
              throw new Error('Not a customer user');
            }

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
            setChatUser(updatedUser as any);
            setChatToken(token);
          } catch (verifyError) {
            // Token verification failed
            if (!cancelled) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setChatUser(null);
              setChatToken(null);

              // If protected route, redirect to login
              if (isProtectedRoute) {
                router.replace("/login");
                return;
              }
            }
          } finally {
            if (!cancelled) {
              setIsVerifying(false);
            }
          }
        }

        // Check maintenance mode
        if (!cancelled) {
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
      } catch (error) {
        if (!cancelled && isProtectedRoute) {
          router.replace("/login");
        }
      }
    };

    verifyAndInitialize();

    return () => {
      cancelled = true;
    };
  }, [router, isProtectedRoute]);

  // Show loading state while verifying protected routes
  if (isVerifying && isProtectedRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="text-zinc-400">Đang xác thực...</p>
        </div>
      </div>
    );
  }

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
      <UnifiedAiWidget />
      <AuthModal />
      
      {/* Chat Box - Hiển thị khi user đã đăng nhập */}
      {chatUser && chatToken && (
        <ChatBox
          customerId={chatUser.id}
          customerName={chatUser.fullName || chatUser.username}
          token={chatToken}
        />
      )}
    </div>
  );
}
