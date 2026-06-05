"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

import { contactService, type ContactDto } from "@/services/contactService";
import { useAppNotification } from "@/providers/AppNotificationProvider";

type Row = {
  id: number;
  fullName: string;
  currentFullName?: string;
  email: string;
  currentEmail?: string;
  currentPhone?: string;
  subject: string;
  message: string;
  imageUrls: string[];
  createdAt?: string;
};

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

function resolveImageUrl(input?: string | null | unknown): string {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw)) return raw;
  if (/^(data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_URL}${raw}`;
  return `${API_URL}/${raw}`;
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour12: false });
}

function mapDto(dto: ContactDto): Row {
  return {
    id: Number(dto.contactId),
    fullName: String(dto.fullName || "-"),
    currentFullName: dto.currentFullName || undefined,
    email: String(dto.email || "-").trim() || "-",
    currentEmail: dto.currentEmail || undefined,
    currentPhone: dto.currentPhone || undefined,
    subject: String(dto.subject || "-").trim() || "-",
    message: String(dto.message || "").trim(),
    imageUrls: Array.isArray(dto.imageUrls) ? dto.imageUrls.map(String) : [],
    createdAt: dto.createdAt || undefined,
  };
}

type Thread = {
  key: string;
  email: string;
  fullName: string;
  latestCreatedAt?: string;
  contacts: Row[];
};

type TableRow = {
  key: string;
  fullName: string;
  email: string;
  latest: Row;
  total: number;
  replied: boolean;
};

export default function ContactPage() {
  const { confirm } = useAppNotification();
  const router = useRouter();
  const [rows, setRows] = React.useState<Row[]>([]);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const [repliedMap, setRepliedMap] = React.useState<Record<number, boolean>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await contactService.getAllAdmin();
      const mapped = (data || []).map(mapDto).filter((x) => Number.isFinite(x.id));
      setRows(mapped);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Có lỗi xảy ra.";
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  async function softDelete(id: number) {
    const ok = await confirm({
      title: "Xóa liên hệ",
      message: "Xóa liên hệ này? (Sẽ chuyển vào thùng rác)",
      type: "warning",
      confirmText: "XÓA",
    });
    if (!ok) return;
    setBusyId(id);
    setError(null);
    try {
      await contactService.softDeleteAdmin(id);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Không thể xóa.";
      setError(msg);
    } finally {
      setBusyId(null);
    }
  }

  React.useEffect(() => {
    void load();
  }, [load]);

  const threads = React.useMemo<Thread[]>(() => {
    const m = new Map<string, Thread>();
    for (const r of rows) {
      const emailKey = (r.email || "-").toLowerCase();
      const key = emailKey && emailKey !== "-" ? emailKey : `unknown-${r.fullName}`;
      const existing = m.get(key);
      if (!existing) {
        m.set(key, {
          key,
          email: r.email,
          fullName: r.fullName,
          latestCreatedAt: r.createdAt,
          contacts: [r],
        });
      } else {
        existing.contacts.push(r);
        if (!existing.latestCreatedAt) existing.latestCreatedAt = r.createdAt;
        else if (r.createdAt && new Date(r.createdAt).getTime() > new Date(existing.latestCreatedAt).getTime()) {
          existing.latestCreatedAt = r.createdAt;
        }
      }
    }

    const arr = Array.from(m.values());
    for (const t of arr) {
      t.contacts.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
    }

    arr.sort((a, b) => {
      const ta = a.latestCreatedAt ? new Date(a.latestCreatedAt).getTime() : 0;
      const tb = b.latestCreatedAt ? new Date(b.latestCreatedAt).getTime() : 0;
      return tb - ta;
    });
    return arr;
  }, [rows]);

  const tableRows = React.useMemo<TableRow[]>(() => {
    return threads
      .map((t) => {
        const latest = t.contacts[0];
        if (!latest) return null;
        const replied = Boolean(repliedMap[latest.id]);
        return {
          key: t.key,
          fullName: latest.currentFullName || t.fullName,
          email: latest.currentEmail || t.email,
          latest,
          total: t.contacts.length,
          replied,
        };
      })
      .filter((x): x is TableRow => x !== null);
  }, [threads, repliedMap]);

  const filteredTableRows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tableRows;
    return tableRows.filter((tr) => {
      return (
        tr.fullName.toLowerCase().includes(q) ||
        tr.email.toLowerCase().includes(q) ||
        tr.latest.subject.toLowerCase().includes(q)
      );
    });
  }, [tableRows, query]);

  const latestIds = React.useMemo<number[]>(() => {
    return threads
      .map((t) => t.contacts[0])
      .filter((x): x is Row => Boolean(x) && Number.isFinite(x.id))
      .map((x) => x.id);
  }, [threads]);

  React.useEffect(() => {
    if (loading) return;
    if (latestIds.length === 0) return;
    let cancelled = false;

    const run = async () => {
      const need = latestIds.filter((id) => repliedMap[id] === undefined);
      if (need.length === 0) return;

      const next: Record<number, boolean> = {};
      await Promise.all(
        need.map(async (id) => {
          try {
            const rs = await contactService.getRepliesByContactId(id);
            next[id] = Array.isArray(rs) && rs.length > 0;
          } catch {
            next[id] = false;
          }
        })
      );

      if (!cancelled) {
        setRepliedMap((prev) => ({ ...prev, ...next }));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [loading, latestIds, repliedMap]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Liên hệ
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Quản lý liên hệ</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            Danh sách liên hệ từ khách hàng, xem chi tiết và quản lý phản hồi.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href="/contacts/trash"
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
          </Link>
          <button
            onClick={() => void load()}
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
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-slate-950/45 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/60 text-slate-800 ring-1 ring-slate-200/70 backdrop-blur-xl dark:bg-white/5 dark:text-slate-100 dark:ring-white/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h18v18H3z" />
              <path d="M7 15h3" />
              <path d="M7 11h10" />
              <path d="M7 7h10" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Danh sách liên hệ</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">Tổng: {filteredTableRows.length} liên hệ</div>
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
                placeholder="Tìm kiếm theo tên, email..."
                className="h-11 w-full rounded-2xl bg-white/60 pl-11 pr-3 text-sm text-slate-900 ring-1 ring-white/10 outline-none backdrop-blur-xl transition-all duration-700 ease-out focus:bg-white/75 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:bg-white/10 dark:focus:ring-cyan-400/25"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out hover:shadow-md dark:border-white/10 dark:bg-slate-950/45 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/55 text-xs uppercase tracking-wide text-slate-700 backdrop-blur-xl dark:bg-slate-950/35 dark:text-slate-200">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="px-5 py-3">STT</th>
                <th className="px-5 py-3">Tên khách hàng</th>
                <th className="px-5 py-3">Chủ đề</th>
                <th className="px-5 py-3">Nội dung (mới nhất)</th>
                <th className="px-5 py-3 text-center">Trạng thái</th>
                <th className="px-5 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-400 dark:text-slate-300" colSpan={6}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-5 py-12 text-center text-rose-600 dark:text-rose-300" colSpan={6}>
                    {error}
                  </td>
                </tr>
              ) : filteredTableRows.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-400 dark:text-slate-300" colSpan={6}>
                    Chưa có dữ liệu.
                  </td>
                </tr>
              ) : (
                filteredTableRows.map((tr, idx) => (
                  <tr key={tr.key} className="transition-all duration-500 hover:bg-slate-50/80 dark:hover:bg-white/5">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-white">{idx + 1}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{tr.fullName}</div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{tr.email}</div>
                      {tr.latest.createdAt && (
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatDate(tr.latest.createdAt)}</div>
                      )}
                      {tr.total > 1 && (
                        <div className="mt-1 inline-flex rounded-md bg-green-200 px-1.5 py-0.5 text-[10px] font-bold text-black ring-1 ring-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
                          {tr.total} Liên hệ
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-800 dark:text-slate-200 font-medium">{tr.latest.subject}</td>
                    <td className="px-5 py-4">
                      <div className="line-clamp-2 max-w-[400px] text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">
                        {tr.latest.message || "-"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center min-w-[110px]">
                        <span
                          className={
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold " +
                            (tr.replied
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400")
                          }
                        >
                          <span className={"mr-1.5 h-1.5 w-1.5 rounded-full " + (tr.replied ? "bg-emerald-500" : "bg-amber-500")} />
                          {tr.replied ? "Đã trả lời" : "Chưa trả lời"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/contacts/${tr.latest.id}`)}
                          className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                          </svg>
                          Chi tiết
                        </button>
                        <button
                          type="button"
                          onClick={() => void softDelete(tr.latest.id)}
                          disabled={busyId === tr.latest.id}
                          className={
                            "inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-rose-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-1 dark:ring-rose-400/20 dark:hover:bg-rose-500/20 " +
                            (busyId === tr.latest.id ? "opacity-70" : "")
                          }
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M6 6l1 16h10l1-16" />
                          </svg>
                          {busyId === tr.latest.id ? "..." : "Xóa"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
