"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { createPortal } from "react-dom";

import { adminAccountService, AdminAccountDto } from "@/services/adminAccountService";
import Avatar from "@/components/avatar/Avatar";

type AdminAccount = {
  id: string;
  fullName: string;
  username: string;
  password: string;
  roleName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

function getRoleLabel(roleName: string) {
  const name = (roleName || "").toUpperCase();
  if (name === "ADMIN" || name === "ADMINISTRATOR") return "Quản trị viên";
  if (name === "STAFF") return "Nhân viên";
  if (name === "EMPLOYEE") return "Nhân viên";
  return roleName;
}

function mapDtoToAdmin(dto: AdminAccountDto): AdminAccount {
  const anyDto = dto as any;
  const rawId: unknown = dto.accountId ?? anyDto.adminId;
  const id =
    rawId != null && String(rawId).trim() !== ""
      ? String(rawId)
      : `${dto.username || ""}::${dto.email || ""}`;
  return {
    id,
    fullName: dto.fullName,
    username: dto.username,
    password: dto.password,
    roleName: getRoleLabel(dto.roleName || "-"),
    email: dto.email,
    phone: dto.phone ?? null,
    address: dto.address ?? null,
    avatarUrl: dto.avatarUrl ?? null,
    createdAt: dto.createdAt || null,
    updatedAt: dto.updatedAt || null,
    deletedAt: dto.deletedAt || null,
  };
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour12: false });
}

export default function AccountRolePage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [accounts, setAccounts] = React.useState<AdminAccount[]>([]);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = React.useState<AdminAccount | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [active, trash] = await Promise.all([
        adminAccountService.getAll(),
        adminAccountService.getTrash(),
      ]);
      const merged = [...active, ...trash]
        .map(mapDtoToAdmin)
        .filter((a) => a.id.trim() !== "" && a.id !== "::");
      setAccounts(merged);
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu tài khoản admin.");
    } finally {
      setLoading(false);
    }
  }

  const activeAccounts = React.useMemo(
    () => accounts.filter((a) => !a.deletedAt),
    [accounts]
  );

  const trashCount = React.useMemo(
    () => accounts.filter((a) => !!a.deletedAt).length,
    [accounts]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeAccounts;
    return activeAccounts.filter((a) => {
      return (
        a.fullName.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q) ||
        a.roleName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.phone || "").toLowerCase().includes(q) ||
        (a.address || "").toLowerCase().includes(q)
      );
    });
  }, [activeAccounts, query]);

  function softDelete(id: string) {
    setDeletingId(id);
    window.setTimeout(async () => {
      try {
        await adminAccountService.softDelete(Number(id));
        await refresh();
      } finally {
        setDeletingId(null);
      }
    }, 180);
  }

  React.useEffect(() => {
    if (!selectedAccount) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedAccount(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedAccount]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Tài khoản quản trị viên
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Quản lý tài khoản Quản trị viên/Nhân viên</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            Quản lý danh sách tài khoản Quản trị viên/Nhân viên, chỉnh sửa, xóa mềm và khôi phục.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={refresh}
            disabled={loading}
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/70 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10"
          >
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200/70 transition-all duration-500 ease-out dark:bg-white/5 dark:ring-white/10 ${loading ? "animate-spin" : ""}`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </span>
            Làm mới
          </button>

          <Link
            href="/accounts-roles/create"
            className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-900/90 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-slate-900/10 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-md active:translate-y-0 dark:bg-linear-to-br dark:from-cyan-400/20 dark:to-fuchsia-500/15 dark:text-slate-100 dark:ring-1 dark:ring-cyan-400/20 dark:shadow-lg dark:shadow-cyan-500/5 dark:hover:ring-cyan-400/30"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 transition-all duration-500 ease-out dark:bg-white/5 dark:ring-white/10 dark:group-hover:ring-cyan-400/25">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </span>
            Thêm tài khoản
          </Link>

          <Link
            href="/accounts-roles/trash"
            className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-600/20 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-md active:translate-y-0 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-400/20 dark:hover:bg-emerald-500/20 dark:hover:ring-emerald-400/30 dark:hover:shadow-black/30"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/15 transition-all duration-500 ease-out dark:bg-emerald-500/20 dark:ring-emerald-400/20">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M6 6l1 16h10l1-16" />
              </svg>
            </span>
            Thùng rác
            <span className="ml-1 inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white ring-1 ring-white/15 transition-all duration-500 ease-out dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-400/20">
              {trashCount}
            </span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-slate-950/45 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60 text-slate-800 ring-1 ring-slate-200/70 backdrop-blur-xl dark:bg-white/5 dark:text-slate-100 dark:ring-white/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h18v18H3z" />
              <path d="M7 15h3" />
              <path d="M7 11h10" />
              <path d="M7 7h10" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Danh sách tài khoản</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">Tổng: {activeAccounts.length} tài khoản</div>
          </div>
        </div>

        <div className="w-full md:max-w-md">
          <div className="productSearchSparkle relative overflow-hidden rounded-2xl p-px shadow-[0_16px_60px_-40px_rgba(34,211,238,0.55)] transition-all duration-700 ease-out focus-within:shadow-[0_18px_70px_-40px_rgba(168,85,247,0.55)]">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-950 drop-shadow-sm dark:text-slate-100">
                <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 21l-4.3-4.3" />
                  <path d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                </svg>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên / username / role / email / SĐT / địa chỉ..."
                className="h-11 w-full rounded-2xl bg-white/60 pl-11 pr-3 text-sm text-slate-900 ring-1 ring-white/10 outline-none backdrop-blur-xl transition-all duration-700 ease-out focus:bg-white/75 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:bg-white/10 dark:focus:ring-cyan-400/25"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200">
          Đang tải dữ liệu...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out hover:shadow-md dark:border-white/10 dark:bg-slate-950/45 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-white/55 text-xs uppercase tracking-wide text-slate-700 backdrop-blur-xl dark:bg-slate-950/35 dark:text-slate-200">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="px-5 py-3 text-center">STT</th>
                <th className="px-5 py-3 text-center">Tên người dùng</th>
                <th className="px-5 py-3 text-center">Tên đăng nhập</th>
                <th className="px-5 py-3 text-center">Email</th>
                <th className="px-5 py-3 text-center">Vai trò</th>
                <th className="px-5 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-400 dark:text-slate-300" colSpan={6}>
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                filtered.map((a, idx) => {
                  const isDeleting = deletingId === a.id;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAccount(a)}
                      className={
                        "transition-all duration-500 ease-out " +
                        (isDeleting
                          ? "opacity-0 translate-x-2"
                          : "cursor-pointer opacity-100 hover:bg-slate-50 active:bg-slate-100/70 dark:hover:bg-white/5 dark:active:bg-white/10")
                      }
                    >
                      <td className="px-5 py-4 text-center text-slate-600 dark:text-slate-300">{idx + 1}</td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <Avatar 
                            src={a.avatarUrl} 
                            name={a.fullName}
                            className="h-9 w-9 rounded-full shrink-0"
                            textClassName="text-xs font-bold"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{a.fullName}</div>
                            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                              Cập nhật: {formatDate(a.updatedAt)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">{a.username}</td>
                      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">{a.email}</td>
                      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">{a.roleName}</td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/accounts-roles/update?id=${encodeURIComponent(a.id)}`);
                            }}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-amber-500 px-3 py-2 text-xs font-semibold text-amber-950 shadow-sm ring-1 ring-amber-500/20 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-amber-400 hover:shadow-md active:translate-y-0 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-1 dark:ring-amber-400/20 dark:hover:bg-amber-500/20 dark:hover:ring-amber-400/30 dark:hover:shadow-black/30"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16.5 3.5l4 4L7 21H3v-4z" />
                            </svg>
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              softDelete(a.id);
                            }}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-rose-600/20 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-md active:translate-y-0 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-1 dark:ring-rose-400/20 dark:hover:bg-rose-500/20 dark:hover:ring-rose-400/30 dark:hover:shadow-black/30"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M6 6l1 16h10l1-16" />
                            </svg>
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>


      {mounted && selectedAccount ? createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            onMouseDown={() => setSelectedAccount(null)}
          />
          {/* Modal card */}
          <div
            className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl animate-[productModalIn_180ms_ease-out] max-h-[calc(100vh-2rem)]"
            style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}
          >
            {/* Header */}
            <div
              className="flex items-start justify-between gap-3 px-5 py-4"
              style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white/90">Chi tiết tài khoản</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAccount(null)}
                className="inline-flex cursor-pointer h-10 w-10 items-center justify-center rounded-2xl text-white/70 shadow-sm transition hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                aria-label="Đóng"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                {/* Avatar + name section */}
                <div
                  className="flex flex-col gap-5 rounded-3xl p-5 sm:flex-row sm:items-center"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <div className="shrink-0">
                    <Avatar 
                      src={selectedAccount.avatarUrl} 
                      name={selectedAccount.fullName || selectedAccount.username}
                      className="h-24 w-24 rounded-full"
                      textClassName="text-2xl font-bold"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold text-white/95">
                      {selectedAccount.fullName || "(Chưa có tên)"}
                    </div>
                    <div className="mt-2 text-sm text-white/70">{selectedAccount.username}</div>
                    <div className="mt-1 text-xs text-white/50">Vai trò: {selectedAccount.roleName || "-"}</div>
                  </div>
                </div>

                {/* Info grid */}
                <div
                  className="grid grid-cols-1 gap-3 rounded-3xl p-4 sm:grid-cols-2"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div>
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wide">Gmail</div>
                    <div className="mt-1 text-sm text-white/85">{selectedAccount.email || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wide">Số điện thoại</div>
                    <div className="mt-1 text-sm text-white/85">{selectedAccount.phone || "-"}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wide">Địa chỉ</div>
                    <div className="mt-1 text-sm text-white/85">{selectedAccount.address || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wide">Tạo lúc</div>
                    <div className="mt-1 text-sm text-white/85">{formatDate(selectedAccount.createdAt) || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wide">Cập nhật</div>
                    <div className="mt-1 text-sm text-white/85">{formatDate(selectedAccount.updatedAt) || "-"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-2 px-5 py-4"
              style={{ background: "rgba(255,255,255,0.05)", borderTop: "1px solid rgba(255,255,255,0.1)" }}
            >
              <button
                type="button"
                onClick={() => setSelectedAccount(null)}
                className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white/85 shadow-sm transition hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedAccount(null);
                  router.push(`/accounts-roles/update?id=${encodeURIComponent(selectedAccount.id)}`);
                }}
                className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
                style={{ background: "rgba(245,158,11,0.85)", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 4px 20px rgba(245,158,11,0.25)" }}
              >
                Chỉnh sửa
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
