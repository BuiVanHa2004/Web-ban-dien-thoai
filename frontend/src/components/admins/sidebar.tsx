"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useMemo, useCallback, useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  Award, 
  Layers, 
  Package, 
  Newspaper, 
  ShoppingCart, 
  Star, 
  Mail, 
  ShieldCheck, 
  Users, 
  Settings,
  Image as ImageIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/customers/Logo";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Trang chủ", href: "/statistical", icon: LayoutDashboard, color: "cyan" },
  { label: "Thương hiệu", href: "/brands", icon: Award, color: "purple" },
  { label: "Danh mục", href: "/categories", icon: Layers, color: "orange" },
  { label: "Sản phẩm", href: "/products", icon: Package, color: "emerald" },
  { label: "Tin tức", href: "/news", icon: Newspaper, color: "rose" },
  { label: "Đơn hàng", href: "/orders", icon: ShoppingCart, color: "blue" },
  { label: "Xác nhận thanh toán", href: "/payments", icon: ShieldCheck, color: "indigo" },
  { label: "Đánh giá", href: "/evaluates", icon: Star, color: "yellow" },
  { label: "Liên hệ", href: "/contacts", icon: Mail, color: "indigo" },
  { label: "Quản trị viên", href: "/accounts-roles", icon: ShieldCheck, color: "emerald" },
  { label: "Khách hàng", href: "/accounts", icon: Users, color: "cyan" },
  { label: "Cài đặt", href: "/settings", icon: Settings, color: "slate" },
  { label: "Banner", href: "/banners", icon: ImageIcon, color: "pink" },
];

const COLOR_SCHEMES: Record<string, string> = {
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-cyan-500/20",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-purple-500/20",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  pink: "bg-pink-500/10 text-pink-600 dark:text-pink-400 ring-pink-500/20",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20",
  yellow: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-slate-500/20",
  black: "bg-slate-900 text-slate-100 ring-slate-800 dark:bg-white dark:text-slate-900",
};

export default function Sidebar({ collapsed, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname() || "/";
  const [role, setRole] = useState<string>("ADMIN");

  const syncRole = useCallback(() => {
    try {
      const raw = localStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : null;
      setRole((parsed?.role || "ADMIN").toUpperCase());
    } catch {
      setRole("ADMIN");
    }
  }, []);

  useEffect(() => {
    syncRole();
    const onUserUpdated = () => syncRole();
    const onStorage = (e: StorageEvent) => { if (e.key === "user") syncRole(); };
    window.addEventListener("userUpdated", onUserUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("userUpdated", onUserUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [syncRole]);

  const hiddenForStaff = useMemo(() => new Set([
    "/brands", "/categories", "/accounts-roles", "/accounts", "/settings", "/banners"
  ]), []);

  const items = useMemo(() => {
    if (role !== "STAFF") return NAV_ITEMS;
    return NAV_ITEMS.filter((it) => !hiddenForStaff.has(it.href));
  }, [role, hiddenForStaff]);

  const isActivePath = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      aria-label="Admin Sidebar"
      className={`
      fixed inset-y-0 left-0 z-50 h-screen shrink-0 border-r border-zinc-500/60 bg-[#2a2a2e]/98 shadow-sm shadow-black/15 backdrop-blur-sm transition-all duration-300 ease-in-out transform-gpu
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        sm:relative sm:translate-x-0 sm:sticky sm:top-0
        ${collapsed ? "sm:w-[80px]" : "sm:w-[280px]"}
        w-[280px]
      `}
    >
      <div className="flex h-full flex-col">
        {/* Branding */}
        <Link
          href="/statistical"
          title="MyPhone Store - Trang quản trị"
          aria-label="MyPhone Store - Trang quản trị"
          className={`group flex h-20 shrink-0 items-center border-b border-zinc-500/60 bg-[#2a2a2e]/95 transition-all duration-300 ${
            collapsed ? "justify-center px-0" : "justify-start px-6"
          }`}
        >
          <Logo variant="header" showText={!collapsed} />
        </Link>

        {/* Navigation */}
        <nav 
          className={`flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-hide ${collapsed ? "px-2" : "px-4"}`}
          role="navigation"
          aria-label="Main Navigation"
        >
          <div className="space-y-1.5">
            {items.map((item) => {
              const active = isActivePath(item.href);
              const IconComp = item.icon;
              const colorScheme = COLOR_SCHEMES[item.color] || COLOR_SCHEMES.blue;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center transition-all duration-300 ${
                    collapsed ? "h-14 w-14 justify-center rounded-full p-0" : "gap-3 rounded-2xl p-2"
                  } ${
                    active 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 dark:bg-indigo-500/20 dark:text-indigo-300 dark:shadow-none ring-1 ring-indigo-500/50" 
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                  }`}
                >
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                    collapsed ? "rounded-full" : "rounded-xl ring-1 ring-inset"
                  } ${
                    active ? "bg-white/20 ring-white/30 dark:bg-indigo-500/20 dark:ring-indigo-500/40" : colorScheme
                  }`}>
                    <IconComp className="h-5 w-5" />
                  </div>
                  
                  {!collapsed && (
                    <span className="truncate text-sm font-bold tracking-tight">
                      {item.label}
                    </span>
                  )}

                  {collapsed && (
                    <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-y-1/2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white opacity-0 shadow-2xl transition-all group-hover:opacity-100 dark:bg-indigo-600 dark:text-white">
                      {item.label}
                    </div>
                  )}

                  {active && !collapsed && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white dark:bg-indigo-400 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer - Minimalist Support Section */}
        <div className="mt-auto px-4 pb-6 pt-4">
          <div className="mb-6 h-px w-full bg-zinc-600/50" />
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Hỗ trợ nhanh</span>
              </div>
              <p className="text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                Lọc dữ liệu theo thương hiệu để tối ưu hóa quản lý.
              </p>
            </div>
          ) : (
            <div className="flex justify-center group/tooltip relative">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-500/40 transition-all group-hover:bg-indigo-500 group-hover:scale-125" />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

