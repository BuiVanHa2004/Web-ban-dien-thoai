"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  User as UserIcon,
  LogOut,
  Settings,
  Package,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import type { User } from "@/common/types/auth";
import { CART_UPDATED_EVENT, getLocalCartTotalQuantity } from "@/common/cartClient";
import { cartService } from "@/services/cartService";
import { orderService } from "@/services/orderService";
import { Logo } from "./Logo";
import CustomerNotifications from "./CustomerNotifications";

const iconBtn =
  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-500/50 bg-zinc-800/80 text-zinc-100 transition hover:bg-zinc-700/90 sm:h-10 sm:w-10";

export default function PremiumHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);
  const [orderTotal, setOrderTotal] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    setMounted(true);

    try {
      const raw = localStorage.getItem("user");
      setUser(raw ? (JSON.parse(raw) as User) : null);
    } catch {
      /* ignore */
    }

    const syncCartTotal = async () => {
      try {
        const rawUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");
        const u = rawUser ? (JSON.parse(rawUser) as User) : null;
        if (token && String(u?.userType || "").toLowerCase() === "customer") {
          const dto = await cartService.getMyCart();
          setCartTotal(dto.totalQuantity || 0);
          return;
        }
      } catch {
        /* ignore */
      }
      setCartTotal(getLocalCartTotalQuantity());
    };

    const syncOrderTotal = async () => {
      try {
        const rawUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");
        if (!token || !rawUser) {
          setOrderTotal(0);
          return;
        }
        const u = JSON.parse(rawUser) as User;
        if (String(u?.userType || "").toLowerCase() === "customer") {
          const orders = await orderService.getAll(Number(u.id));
          const activeOrders = orders.filter(
            (o) =>
              o.orderStatus === "PENDING_CONFIRM" ||
              o.orderStatus === "PENDING_PICKUP" ||
              o.orderStatus === "PENDING_SHIPPING"
          );
          setOrderTotal(activeOrders.length);
        }
      } catch {
        setOrderTotal(0);
      }
    };

    void syncCartTotal();
    void syncOrderTotal();

    const onCartUpdated = (ev: Event) => {
      const custom = ev as CustomEvent<{ totalQuantity?: number }>;
      if (typeof custom.detail?.totalQuantity === "number") {
        setCartTotal(custom.detail.totalQuantity);
      } else {
        void syncCartTotal();
      }
      void syncOrderTotal();
    };

    const onStorage = () => {
      void syncCartTotal();
      void syncOrderTotal();
    };

    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const sync = async () => {
      try {
        const rawUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");
        if (token && rawUser) {
          const u = JSON.parse(rawUser) as User;
          const orders = await orderService.getAll(Number(u.id));
          const activeOrders = orders.filter(
            (o) =>
              o.orderStatus === "PENDING_CONFIRM" ||
              o.orderStatus === "PENDING_PICKUP" ||
              o.orderStatus === "PENDING_SHIPPING"
          );
          setOrderTotal(activeOrders.length);
        }
      } catch {
        /* ignore */
      }
    };
    void sync();
  }, [pathname, mounted]);

  useEffect(() => {
    setMobileOpen(false);
    setShowUserMenu(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const onLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setShowUserMenu(false);
    router.replace("/login");
  };

  const navItems = [
    { href: "/home", label: "Trang chủ" },
    { href: "/product", label: "Sản phẩm" },
    { href: "/new", label: "Tin tức" },
    { href: "/contact", label: "Liên hệ" },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/home") return pathname === "/home" || pathname === "/";
    return pathname.startsWith(href);
  };

  const requireAuth = (e: React.MouseEvent, href?: string) => {
    const needsAuth =
      href === "/contact" || href === "/cart" || href === "/order" || href === "/profile";
    if (href && !needsAuth) return;
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");
    if (!token || !userRaw) {
      e.preventDefault();
      window.dispatchEvent(new Event("show-auth-popup"));
    }
  };

  return (
    <>
      <header
        className="customer-header fixed inset-x-0 top-0 z-[200] box-border border-b border-zinc-500/60 bg-[#2a2a2e] shadow-sm shadow-black/15 sm:bg-[#2a2a2e]/98 sm:backdrop-blur-sm"
        style={{
          paddingTop: "max(0px, env(safe-area-inset-top))",
          paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right))",
        }}
      >
        <div className="mx-auto flex h-[3.25rem] max-w-7xl items-center justify-between gap-1 overflow-visible sm:h-16 sm:gap-3 sm:px-2 lg:px-4">
          <Link
            href="/home"
            className="flex h-full shrink-0 items-center transition-transform active:scale-95"
            aria-label="MyPhone Store - Trang chủ"
          >
            <Logo variant="header" />
          </Link>

          <nav className="hidden items-center gap-1 rounded-2xl border border-zinc-500/50 bg-zinc-900/70 p-1 shadow-sm backdrop-blur-md lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => requireAuth(e, item.href)}
                className={`relative rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                  isActive(item.href)
                    ? "bg-white/10 text-purple-300 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/40"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-0.5 overflow-visible sm:gap-2">
            {mounted && user && <CustomerNotifications variant="header" />}

            <Link
              href="/order"
              onClick={(e) => requireAuth(e, "/order")}
              className={`${iconBtn} hidden text-orange-400 sm:flex`}
              title="Đơn hàng"
              aria-label="Đơn hàng"
            >
              <Package className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
              {mounted && orderTotal > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-0.5 text-[9px] font-black text-white">
                  {orderTotal > 99 ? "99+" : orderTotal}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              onClick={(e) => requireAuth(e, "/cart")}
              className={`${iconBtn} text-purple-300`}
              title="Giỏ hàng"
              aria-label="Giỏ hàng"
            >
              <ShoppingCart className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
              {mounted && cartTotal > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-black text-white">
                  {cartTotal > 99 ? "99+" : cartTotal}
                </span>
              )}
            </Link>

            {mounted && user ? (
              <div className="relative hidden sm:block" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex h-10 max-w-[140px] items-center gap-2 rounded-xl border border-zinc-500/50 bg-zinc-800/80 p-1 pr-2 transition hover:bg-zinc-700/90"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-sm font-black text-white">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden max-w-[72px] truncate text-xs font-bold text-zinc-200 md:block">
                    {user.name}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-zinc-500/55 bg-zinc-900 shadow-2xl"
                    >
                      <div className="border-b border-zinc-600/50 bg-zinc-800/80 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tài khoản</p>
                        <p className="mt-1 truncate text-sm font-black text-zinc-100">{user.name}</p>
                      </div>
                      <div className="p-2">
                        <Link
                          href="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800 hover:text-purple-300"
                        >
                          <Settings className="h-4 w-4" /> Thông tin tài khoản
                        </Link>
                      </div>
                      <div className="border-t border-zinc-600/50 p-2">
                        <button
                          type="button"
                          onClick={onLogout}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-rose-400 transition hover:bg-rose-500/10"
                        >
                          <LogOut className="h-4 w-4" /> Đăng xuất
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden h-10 shrink-0 items-center gap-2 rounded-xl border border-zinc-500/50 bg-zinc-100 px-4 text-sm font-black text-zinc-900 transition hover:bg-white sm:flex"
              >
                <UserIcon className="h-4 w-4" />
                Đăng nhập
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={mobileOpen}
              className="ml-0.5 flex size-11 shrink-0 items-center justify-center overflow-visible rounded-xl border border-zinc-400/75 bg-zinc-700/95 text-zinc-50 shadow-md transition active:scale-95 lg:hidden"
            >
              {mobileOpen ? (
                <X className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
              ) : (
                <Menu className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
              )}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-0 z-[250] bg-[#2a2a2e]/98 backdrop-blur-xl lg:hidden"
          >
            <div className="flex h-full flex-col overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-600/50 pb-5">
                <Logo variant="default" showText className="min-w-0 flex-1" />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Đóng menu"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-500/60 bg-zinc-700 text-zinc-100"
                >
                  <X className="h-6 w-6" strokeWidth={2.5} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:hidden">
                <Link
                  href="/order"
                  onClick={(e) => {
                    requireAuth(e, "/order");
                    setMobileOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl customer-card-surface border border-zinc-500/70 bg-zinc-800/60 py-3 text-sm font-bold text-orange-300 ring-1 ring-zinc-500/35"
                >
                  <Package className="size-4" />
                  Đơn hàng
                  {orderTotal > 0 && (
                    <span className="rounded-full bg-orange-500 px-1.5 text-[10px] text-white">
                      {orderTotal > 99 ? "99+" : orderTotal}
                    </span>
                  )}
                </Link>
                <Link
                  href="/cart"
                  onClick={(e) => {
                    requireAuth(e, "/cart");
                    setMobileOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl customer-card-surface border border-zinc-500/70 bg-zinc-800/60 py-3 text-sm font-bold text-purple-300 ring-1 ring-zinc-500/35"
                >
                  <ShoppingCart className="size-4" />
                  Giỏ hàng
                  {cartTotal > 0 && (
                    <span className="rounded-full bg-rose-500 px-1.5 text-[10px] text-white">
                      {cartTotal > 99 ? "99+" : cartTotal}
                    </span>
                  )}
                </Link>
              </div>

              <nav className="mt-6 flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      requireAuth(e, item.href);
                      setMobileOpen(false);
                    }}
                    className={`rounded-2xl border px-6 py-4 text-lg font-black transition ${
                      isActive(item.href)
                        ? "border-purple-500/50 bg-purple-500/15 text-purple-300"
                        : "border-transparent text-zinc-300 hover:border-zinc-600/50 hover:bg-zinc-800/50"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto border-t border-zinc-600/50 pt-6">
                {mounted && user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 rounded-2xl border border-zinc-600/50 bg-zinc-800/60 p-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 text-xl font-black text-white">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-zinc-100">{user.name}</p>
                        <p className="text-xs text-zinc-500">Khách hàng thân thiết</p>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-600/50 bg-zinc-800/60 py-3 text-sm font-bold text-zinc-200"
                    >
                      <Settings className="h-4 w-4" /> Tài khoản
                    </Link>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 py-4 font-black text-rose-400"
                    >
                      <LogOut className="h-5 w-5" /> Đăng xuất
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex h-14 items-center justify-center rounded-2xl border border-zinc-500/50 bg-zinc-100 font-black text-zinc-900"
                  >
                    Đăng nhập tài khoản
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="h-[3.25rem] sm:h-16"
        style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
        aria-hidden
      />
    </>
  );
}
