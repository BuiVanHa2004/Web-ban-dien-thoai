"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Maintenance() {
  const router = useRouter();
  const [role, setRole] = React.useState<string | null>(null);
  const [userType, setUserType] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const userRaw = localStorage.getItem("user");
      const user = userRaw ? (JSON.parse(userRaw) as { userType?: string; role?: string }) : null;
      setRole(user?.role ? String(user.role).toUpperCase() : null);
      setUserType(user?.userType ? String(user.userType).toLowerCase() : null);
    } catch {
      setRole(null);
      setUserType(null);
    }
  }, []);

  const isAdmin = userType === "admin" && role === "ADMIN";

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-4 py-12">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-500/15 dark:text-rose-200 dark:ring-rose-400/15">
            Thông báo
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Website đang bảo trì</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            Hệ thống đang trong thời gian bảo trì. Vui lòng quay lại sau.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            {isAdmin ? (
              <Link
                href="/settings"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 dark:bg-white/10 dark:text-slate-100"
              >
                Vào trang cài đặt
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                } finally {
                  router.replace("/login");
                }
              }}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Quay về đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
