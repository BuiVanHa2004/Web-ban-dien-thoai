"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { settingService, type MaintenanceSettingDto } from "@/services/settingService";

function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

export default function Setting() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<MaintenanceSettingDto | null>(null);
  const [confirmModal, setConfirmModal] = React.useState<{ open: boolean; nextState: boolean | null }>({
    open: false,
    nextState: null,
  });

  React.useEffect(() => {
    try {
      const userRaw = localStorage.getItem("user");
      const user = userRaw ? (JSON.parse(userRaw) as { userType?: string; role?: string }) : null;
      if (!user || user.userType !== "admin") {
        router.replace("/login");
        return;
      }
      const roleUpper = (user.role == null || String(user.role).trim() === "")
        ? "ADMIN"
        : String(user.role).toUpperCase();
      if (roleUpper !== "ADMIN") {
        router.replace("/statistical");
        return;
      }
    } catch {
      router.replace("/login");
    }
  }, [router]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const current = await settingService.getMaintenance();
      setData(current);
    } catch (e: any) {
      setError(e?.message || "Không thể tải cài đặt bảo trì.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggleMaintenance(next: boolean) {
    setSaving(true);
    setError(null);
    setConfirmModal({ open: false, nextState: null });
    try {
      const updated = await settingService.updateMaintenance({ isMaintenance: next });
      setData(updated);
    } catch (e: any) {
      setError(e?.message || "Không thể cập nhật chế độ bảo trì.");
    } finally {
      setSaving(false);
    }
  }

  const isMaintenance = !!data?.isMaintenance;

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/60 text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl dark:bg-white/5 dark:text-slate-100 dark:ring-white/10">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <h1 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Cấu hình hệ thống</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading || saving}
          className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-900/90 px-5 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-slate-900/10 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-900 active:scale-95 disabled:opacity-50 dark:bg-white/10 dark:text-slate-100 dark:ring-white/20 dark:hover:bg-white/15"
        >
          <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform duration-700 ${loading ? "animate-spin" : "group-hover:rotate-180"}`} fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          Làm mới
        </button>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/50 p-4 text-sm font-medium text-rose-700 shadow-sm backdrop-blur dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 animate-shake">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Maintenance Toggle Card */}
        <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl transition-all duration-500 hover:shadow-slate-200/50 dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/60 dark:ring-1 dark:ring-white/5 dark:backdrop-blur lg:col-span-2">
          {/* Subtle Background Pattern */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-linear-to-br from-emerald-500/10 to-cyan-500/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-linear-to-tr from-rose-500/10 to-fuchsia-500/5 blur-3xl" />

          <div className="relative p-8 sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-md">
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">Chế độ bảo trì hệ thống</div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Kích hoạt trạng thái bảo trì sẽ tạm thời ngăn khách hàng và nhân viên truy cập vào hệ thống.
                  Chỉ tài khoản Quản trị viên cao cấp mới có thể thao tác.
                </p>

                <div className="mt-6 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 rounded-2xl bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400 dark:ring-amber-400/20">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <path d="M12 9v4" />
                      <path d="M12 17h.01" />
                    </svg>
                    Hành động nhạy cảm
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className={`relative flex h-24 w-24 items-center justify-center rounded-3xl ring-1 transition-all duration-500 ${isMaintenance ? "bg-rose-500 text-white shadow-2xl shadow-rose-500/40 ring-rose-600" : "bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 ring-emerald-600"}`}>
                  <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {isMaintenance ? (
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    ) : (
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    )}
                    {!isMaintenance && <path d="M22 4L12 14.01l-3-3" />}
                  </svg>
                </div>
                <div className={`text-center text-sm font-semibold tracking-wide uppercase ${isMaintenance ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {loading ? "Đang tải..." : isMaintenance ? "Đang bảo trì" : "Hoạt động"}
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4 border-t border-slate-100 pt-8 dark:border-white/5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setConfirmModal({ open: true, nextState: true })}
                disabled={loading || saving || isMaintenance}
                className="group inline-flex cursor-pointer flex-1 items-center justify-center gap-3 rounded-[1.25rem] bg-rose-600 py-4 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-rose-500 hover:shadow-rose-500/25 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-rose-500/20 dark:text-rose-100 dark:ring-1 dark:ring-rose-500/30 dark:hover:bg-rose-500/30"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 transition-transform duration-300 group-hover:scale-110">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                    <line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                </div>
                Bật bảo trì
              </button>

              <button
                type="button"
                onClick={() => setConfirmModal({ open: true, nextState: false })}
                disabled={loading || saving || !isMaintenance}
                className="group inline-flex cursor-pointer flex-1 items-center justify-center gap-3 rounded-[1.25rem] bg-emerald-600 py-4 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-emerald-500 hover:shadow-emerald-500/25 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-emerald-500/20 dark:text-emerald-100 dark:ring-1 dark:ring-emerald-500/30 dark:hover:bg-emerald-500/30"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 transition-transform duration-300 group-hover:scale-110">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                Tắt bảo trì
              </button>

              {saving && (
                <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 dark:bg-white/5 dark:text-slate-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                  Đang xử lý...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur">
            <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16V12" />
                <path d="M12 8h.01" />
              </svg>
              <div className="text-base font-semibold">Lịch sử hệ thống</div>
            </div>

            <div className="mt-8 space-y-6">
              {[
                { label: "Bắt đầu bảo trì", value: formatDateTime(data?.maintenanceStart), icon: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M13 2v7h7", color: "text-rose-500" },
                { label: "Kết thúc bảo trì", value: formatDateTime(data?.maintenanceEnd), icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8", color: "text-emerald-500" },
                { label: "Cập nhật cuối", value: formatDateTime(data?.updatedAt), icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-cyan-500" },
              ].map((item, i) => (
                <div key={i} className="group flex items-start gap-4">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100 transition-colors group-hover:bg-white dark:bg-white/5 dark:ring-white/10 ${item.color}`}>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={item.icon} />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">{item.label}</div>
                    <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100 break-words">
                      {loading ? "..." : item.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-indigo-600/5 p-6 ring-1 ring-indigo-600/10 dark:bg-indigo-400/5 dark:ring-indigo-400/10">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">Hỗ trợ bảo mật</div>
                <p className="mt-1 text-xs leading-relaxed text-indigo-700/80 dark:text-indigo-300/70">
                  Mọi thay đổi trạng thái sẽ được ghi nhận vào nhật ký hệ thống để kiểm soát an ninh.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in" onClick={() => setConfirmModal({ open: false, nextState: null })} />
          <div className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-2xl animate-scale-in dark:border-white/10 dark:bg-slate-900">
            <div className="flex flex-col items-center text-center">
              <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl transition-colors ${confirmModal.nextState ? "bg-rose-50 text-rose-500 ring-4 ring-rose-500/10 dark:bg-rose-500/20 dark:text-rose-400" : "bg-emerald-50 text-emerald-500 ring-4 ring-emerald-500/10 dark:bg-emerald-500/20 dark:text-emerald-400"}`}>
                <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
              </div>

              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Xác nhận thay đổi?</h3>
              <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                Bạn có chắc chắn muốn <span className={`font-semibold ${confirmModal.nextState ? "text-rose-600" : "text-emerald-600"}`}>{confirmModal.nextState ? "BẬT" : "TẮT"}</span> chế độ bảo trì hệ thống không?
              </p>

              <div className="mt-10 flex w-full flex-col gap-3">
                <button
                  type="button"
                  onClick={() => toggleMaintenance(confirmModal.nextState!)}
                  className={`w-full cursor-pointer rounded-2xl py-4 text-sm font-semibold text-white shadow-lg transition-all duration-300 active:scale-95 ${confirmModal.nextState ? "bg-rose-600 hover:bg-rose-500 hover:shadow-rose-500/30" : "bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/30"}`}
                >
                  Xác nhận ngay
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmModal({ open: false, nextState: null })}
                  className="w-full cursor-pointer rounded-2xl bg-slate-100 py-4 text-sm font-semibold text-slate-700 transition-all duration-300 hover:bg-slate-200 active:scale-95 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Hủy bỏ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}