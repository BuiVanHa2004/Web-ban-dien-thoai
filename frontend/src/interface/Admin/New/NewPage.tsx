"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { createPortal } from "react-dom";
import { newsService, NewsDto } from "@/services/newsService";

type News = {
  id: string;
  title: string;
  slug?: string | null;
  newsImages: string[];
  description: string;
  deletedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

function mapDtoToNews(dto: NewsDto): News {
  return {
    id: String(dto.newsId),
    title: dto.newsTitle,
    slug: dto.slug || null,
    newsImages: dto.newsImages || [],
    description: dto.newsDescribe || "",
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

export default function NewPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<News[]>([]);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedNews, setSelectedNews] = React.useState<News | null>(null);
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
        newsService.getAll(),
        newsService.getTrash(),
      ]);
      setItems([...active, ...trash].map(mapDtoToNews));
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu tin tức.");
    } finally {
      setLoading(false);
    }
  }

  const activeItems = React.useMemo(() => items.filter((n) => !n.deletedAt), [items]);

  const trashCount = React.useMemo(
    () => items.filter((n) => !!n.deletedAt).length,
    [items]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeItems;
    return activeItems.filter((n) => {
      return (
        n.id.toLowerCase().includes(q) ||
        n.title.toLowerCase().includes(q) ||
        (n.description || "").toLowerCase().includes(q)
      );
    });
  }, [activeItems, query]);

  function softDelete(id: string) {
    setDeletingId(id);
    window.setTimeout(async () => {
      try {
        await newsService.softDelete(Number(id));
        await refresh();
      } finally {
        setDeletingId(null);
      }
    }, 180);
  }

  React.useEffect(() => {
    if (!selectedNews) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedNews(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNews]);

  if (!mounted) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Tin tức
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Quản lý tin tức</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Quản lý danh sách tin tức, chỉnh sửa, xóa mềm và khôi phục.</p>
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
            href="/news/create"
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900/90 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-slate-900/10 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-md active:translate-y-0 dark:bg-linear-to-br dark:from-cyan-400/20 dark:to-fuchsia-500/15 dark:text-slate-100 dark:ring-1 dark:ring-cyan-400/20 dark:shadow-lg dark:shadow-cyan-500/5 dark:hover:ring-cyan-400/30"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 transition-all duration-500 ease-out dark:bg-white/5 dark:ring-white/10 dark:group-hover:ring-cyan-400/25">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </span>
            Thêm tin tức
          </Link>

          <Link
            href="/news/trash"
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-600/20 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-md active:translate-y-0 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-400/20 dark:hover:bg-emerald-500/20 dark:hover:ring-emerald-400/30 dark:hover:shadow-black/30"
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
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/60 text-slate-800 ring-1 ring-slate-200/70 backdrop-blur-xl dark:bg-white/5 dark:text-slate-100 dark:ring-white/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h18v18H3z" />
              <path d="M7 15h3" />
              <path d="M7 11h10" />
              <path d="M7 7h10" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Danh sách tin tức</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">Tổng: {activeItems.length} bài viết</div>
          </div>
        </div>

        <div className="w-full md:max-w-md">
          <div className="relative overflow-hidden rounded-2xl p-px shadow-[0_16px_60px_-40px_rgba(34,211,238,0.55)] transition-all duration-700 ease-out focus-within:shadow-[0_18px_70px_-40px_rgba(168,85,247,0.55)]" style={{
            background: 'linear-gradient(110deg, rgba(34, 211, 238, 0.35), rgba(56, 189, 248, 0.18), rgba(168, 85, 247, 0.35), rgba(34, 211, 238, 0.3))',
            backgroundSize: '360% 360%',
            animation: 'newsSearchSparkleGradient 7s ease-in-out infinite'
          }}>
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
                placeholder="Tìm kiếm theo id / tiêu đề / thông tin..."
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
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/55 text-xs uppercase tracking-wide text-slate-700 backdrop-blur-xl dark:bg-slate-950/35 dark:text-slate-200">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="px-5 py-3">STT</th>
                <th className="px-5 py-3">Tiêu đề</th>
                <th className="px-5 py-3">Slug</th>
                <th className="px-5 py-3">Ảnh</th>
                <th className="px-5 py-3">Mô tả</th>
                <th className="px-5 py-3">Hành động</th>
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
                filtered.map((n, idx) => {
                  const isDeleting = deletingId === n.id;
                  return (
                    <tr
                      key={n.id}
                      onClick={() => setSelectedNews(n)}
                      className={
                        "transition-all duration-500 ease-out " +
                        (isDeleting
                          ? "opacity-0 translate-x-2"
                          : "cursor-pointer opacity-100 hover:bg-slate-50 active:bg-slate-100/70 dark:hover:bg-white/5 dark:active:bg-white/10")
                      }
                    >
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {idx + 1}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{n.title}</div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Cập nhật: {formatDate(n.updatedAt)}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-800 dark:text-slate-200">
                        <div className="text-sm font-mono">{n.slug || "-"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-16 w-16 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                          <Image
                            src={(n.newsImages && n.newsImages.length > 0) ? n.newsImages[0] : "https://dummyimage.com/200x200/e2e8f0/64748b&text=No+Image"}
                            alt={n.title}
                            width={64}
                            height={64}
                            unoptimized
                            className="h-full w-full object-cover cursor-pointer transition-transform duration-700 ease-out hover:scale-125"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-800 dark:text-slate-200">
                        <div className="line-clamp-2 max-w-[520px]">{n.description}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/news/update?id=${encodeURIComponent(n.id)}`);
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
                              softDelete(n.id);
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

      {typeof document !== "undefined" && selectedNews
        ? createPortal(
            <div
              className="fixed inset-0 flex items-center justify-center p-4 animate-[fadeIn_160ms_ease-out]"
              style={{ zIndex: 99999 }}
            >
              {/* Overlay */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
                onClick={() => setSelectedNews(null)}
              />

              {/* Modal card */}
              <div
                className="relative w-full max-w-2xl overflow-hidden rounded-3xl max-h-[calc(100vh-2rem)] flex flex-col animate-[scaleIn_180ms_ease-out]"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  boxShadow:
                    "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                {/* Header */}
                <div
                  className="flex items-start justify-between gap-3 px-5 py-4"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white/90">Chi tiết tin tức</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedNews(null)}
                    className="inline-flex cursor-pointer h-10 w-10 items-center justify-center rounded-2xl text-white/85 shadow-sm transition hover:-translate-y-0.5 active:translate-y-0"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                    aria-label="Đóng"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18" />
                      <path d="M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-6 overflow-y-auto">
                  <div className="flex flex-col gap-6 sm:flex-row">
                    <div className="group relative h-32 w-32 shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
                      <Image
                        src={
                          selectedNews.newsImages && selectedNews.newsImages.length > 0
                            ? selectedNews.newsImages[0]
                            : "https://dummyimage.com/200x200/e2e8f0/64748b&text=News"
                        }
                        alt={selectedNews.title}
                        width={128}
                        height={128}
                        unoptimized
                        className="h-full w-full object-cover cursor-pointer transition duration-500 group-hover:scale-110"
                      />
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col">
                      <div className="text-lg font-bold text-white/90 leading-tight">
                        {selectedNews.title}
                      </div>

                      <div className="mt-4 flex-1">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-white/50 mb-2">
                          Thông tin chi tiết
                        </div>
                        <div className="prose prose-sm max-w-none text-white/80 overflow-y-auto max-h-[300px] custom-scrollbar rounded-2xl p-4 ring-1 ring-white/10"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        >
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {selectedNews.description || "(Không có mô tả)"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div
                    className="grid grid-cols-1 gap-4 rounded-3xl p-5 sm:grid-cols-2"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-white/50">Slug (URL)</div>
                      <div className="text-sm font-mono p-2 rounded-lg text-white/90 break-all ring-1 ring-white/10"
                        style={{ background: "rgba(0,0,0,0.2)" }}
                      >
                        {selectedNews.slug || "-"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:col-span-1">
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-white/50">Tạo lúc</div>
                        <div className="text-sm text-white/90">
                          {formatDate(selectedNews.createdAt) || "-"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-white/50">Cập nhật</div>
                        <div className="text-sm text-white/90">
                          {formatDate(selectedNews.updatedAt) || "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="flex items-center justify-end gap-2 px-5 py-4"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedNews(null)}
                    className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white/85 shadow-sm transition hover:-translate-y-0.5 active:translate-y-0"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/news/update?id=${encodeURIComponent(selectedNews.id)}`);
                      setSelectedNews(null);
                    }}
                    className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-out hover:-translate-y-0.5 active:translate-y-0"
                    style={{
                      background: "rgba(245,158,11,0.85)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      boxShadow: "0 4px 20px rgba(245,158,11,0.25)",
                    }}
                  >
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes newsSearchSparkleGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    </div>
  );
}