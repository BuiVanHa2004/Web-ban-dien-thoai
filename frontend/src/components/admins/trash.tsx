
"use client";

import Image from "next/image";
import React from "react";
import { useAppNotification } from "@/providers/AppNotificationProvider";

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

function resolveImageUrl(input?: string | null): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw)) return raw;
  if (/^(data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_URL}${raw}`;
  return `${API_URL}/${raw}`;
}

export type TrashItem = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  deletedAt?: string;
};

type TrashViewProps = {
  title: string;
  description?: string;
  items: TrashItem[];
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
  emptyText?: string;
  searchInSubtitle?: boolean;
  hideImage?: boolean;
  /** Ẩn nút "Xóa tất cả" trong bảng (khi trang cha đã có nút tương đương). */
  hideDeleteAll?: boolean;
};

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour12: false });
}

export default function TrashView({
  title,
  description,
  items,
  onRestore,
  onDeleteForever,
  emptyText = "Không có dữ liệu.",
  searchInSubtitle = true,
  hideImage = false,
  hideDeleteAll = false,
}: TrashViewProps) {
  const { confirm } = useAppNotification();
  const [query, setQuery] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [busyAll, setBusyAll] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const inTitle = it.title.toLowerCase().includes(q);
      if (inTitle) return true;
      if (!searchInSubtitle) return false;
      return (it.subtitle || "").toLowerCase().includes(q);
    });
  }, [items, query, searchInSubtitle]);

  function restore(id: string) {
    setBusyId(id);
    window.setTimeout(() => {
      onRestore(id);
      setBusyId(null);
    }, 180);
  }

  function deleteForever(id: string) {
    setBusyId(id);
    window.setTimeout(() => {
      onDeleteForever(id);
      setBusyId(null);
    }, 180);
  }

  async function deleteAllForever() {
    if (filtered.length === 0) return;
    const ok = await confirm({
      title: "Xóa vĩnh viễn",
      message: `Xóa vĩnh viễn tất cả (${filtered.length}) mục? Hành động không thể hoàn tác.`,
      type: "danger",
      confirmText: "XÓA TẤT CẢ",
    });
    if (!ok) return;

    setBusyAll(true);
    try {
      for (const it of filtered) {
        try {
          await onDeleteForever(it.id);
        } catch {
          // ignore (parent handler should show message if desired)
        }
        await new Promise((r) => window.setTimeout(r, 60));
      }
    } finally {
      setBusyAll(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-slate-950/45 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/60 text-slate-800 ring-1 ring-slate-200/70 backdrop-blur-xl dark:bg-white/5 dark:text-slate-100 dark:ring-white/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M6 6l1 16h10l1-16" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
            {description ? (
              <div className="text-xs text-slate-600 dark:text-slate-300">{description}</div>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:justify-end">
          {!hideDeleteAll ? (
          <button
            type="button"
            onClick={deleteAllForever}
            disabled={busyAll || busyId !== null || filtered.length === 0}
            className="inline-flex h-11 min-w-[140px] cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-rose-600 px-5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-1 dark:ring-rose-400/20 dark:hover:bg-rose-500/20 dark:hover:ring-rose-400/30 dark:hover:shadow-black/30"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M6 6l1 16h10l1-16" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
            {busyAll ? "Đang xóa..." : "Xóa tất cả"}
          </button>
          ) : null}

          <div className="w-full md:max-w-md">
            <div className="brandSearchSparkle relative overflow-hidden rounded-2xl p-px shadow-[0_16px_60px_-40px_rgba(34,211,238,0.55)] transition-all duration-700 ease-out focus-within:shadow-[0_18px_70px_-40px_rgba(168,85,247,0.55)]">
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
                  placeholder="Tìm kiếm theo tên ..."
                  className="h-11 w-full rounded-2xl bg-white/60 pl-11 pr-3 text-sm text-slate-900 ring-1 ring-white/10 outline-none backdrop-blur-xl transition-all duration-700 ease-out focus:bg-white/75 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:bg-white/10 dark:focus:ring-cyan-400/25"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur dark:hover:shadow-black/40">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="px-5 py-3">Tên</th>
                <th className="px-5 py-3">Thời gian xóa</th>
                <th className="px-5 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-600 dark:text-slate-300" colSpan={3}>
                    {emptyText}
                  </td>
                </tr>
              ) : (
                filtered.map((it) => {
                  const busy = busyId === it.id;
                  return (
                    <tr
                      key={it.id}
                      className={
                        "transition-all duration-200 " +
                        (busy
                          ? "opacity-70"
                          : "opacity-100 hover:bg-slate-50 dark:hover:bg-white/5")
                      }
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          {!hideImage && (
                            <div className="h-12 w-12 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                              <Image
                                src={
                                  resolveImageUrl(it.imageUrl) ||
                                  "https://dummyimage.com/200x200/e2e8f0/64748b&text=No+Image"
                                }
                                alt={it.title}
                                width={48}
                                height={48}
                                unoptimized
                                className="h-full w-full object-cover transition duration-300 hover:scale-110"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                              {it.title}
                            </div>
                            {it.subtitle ? (
                              <div className="mt-1 line-clamp-2 max-w-[540px] text-sm text-slate-700 dark:text-slate-300">
                                {it.subtitle}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                        {formatDate(it.deletedAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => restore(it.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-md active:translate-y-0 disabled:opacity-70 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-400/20 dark:hover:bg-emerald-500/20 dark:hover:ring-emerald-400/30 dark:hover:shadow-black/30"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 12a9 9 0 1 0 3-6.7" />
                              <path d="M3 4v6h6" />
                            </svg>
                            Khôi phục
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteForever(it.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-md active:translate-y-0 disabled:opacity-70 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-1 dark:ring-rose-400/20 dark:hover:bg-rose-500/20 dark:hover:ring-rose-400/30 dark:hover:shadow-black/30"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M6 6l1 16h10l1-16" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                            Xóa vĩnh viễn
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

      </div>
  );
}

