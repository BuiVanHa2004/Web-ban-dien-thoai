"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { createPortal } from "react-dom";
import { bannerService, BannerDto } from "@/services/bannerService";
import { useAppNotification } from "@/providers/AppNotificationProvider";

type Banner = {
  id: string;
  position: string;
  isActive: boolean;
  bannerImages: { imageUrl: string; title?: string | null; subtitle?: string | null; linkUrl?: string | null }[];
  deletedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

function mapDtoToBanner(dto: BannerDto): Banner {
  return {
    id: String(dto.bannerId),
    position: dto.position,
    isActive: dto.isActive,
    bannerImages: dto.bannerImages || [],
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

export default function BannerPage() {
  const { confirm } = useAppNotification();
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<Banner[]>([]);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedBanner, setSelectedBanner] = React.useState<Banner | null>(null);
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
        bannerService.getAll(),
        bannerService.getTrash(),
      ]);
      setItems([...active, ...trash].map(mapDtoToBanner));
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu banner.");
    } finally {
      setLoading(false);
    }
  }

  const activeItems = React.useMemo(() => items.filter((b) => !b.deletedAt), [items]);

  const trashCount = React.useMemo(
    () => items.filter((b) => !!b.deletedAt).length,
    [items]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeItems;
    return activeItems.filter((b) => {
      const firstImage = b.bannerImages && b.bannerImages.length > 0 ? b.bannerImages[0] : null;
      return (
        b.id.toLowerCase().includes(q) ||
        (firstImage?.title || "").toLowerCase().includes(q) ||
        (firstImage?.subtitle || "").toLowerCase().includes(q) ||
        b.position.toLowerCase().includes(q)
      );
    });
  }, [activeItems, query]);

  async function softDelete(id: string) {
    const ok = await confirm({
      title: "Chuyển vào thùng rác",
      message: "Chuyển banner này vào thùng rác?",
      type: "warning",
    });
    if (!ok) return;
    setDeletingId(id);
    window.setTimeout(async () => {
      try {
        await bannerService.softDelete(Number(id));
        await refresh();
      } catch (e: any) {
        setError(e?.message || "Không thể xóa banner.");
      } finally {
        setDeletingId(null);
      }
    }, 180);
  }

  React.useEffect(() => {
    if (!selectedBanner) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedBanner(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedBanner]);

  if (!mounted) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(236,72,153,0.55)]" />
            Banners
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Quản lý Banner</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Quản lý các banner quảng cáo, vị trí hiển thị và trạng thái.</p>
        </div>

        <div className="flex flex-wrap gap-2 sm:flex-row sm:items-center">
          <Link
            href="/banners/create"
            className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-slate-900/90 px-3 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-slate-900/10 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-md active:translate-y-0 sm:px-4 sm:text-sm dark:bg-linear-to-br dark:from-pink-400/20 dark:to-purple-500/15 dark:text-slate-100 dark:ring-1 dark:ring-pink-400/20 dark:shadow-lg dark:shadow-pink-500/5 dark:hover:ring-pink-400/30"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 transition-all duration-500 ease-out sm:h-9 sm:w-9 sm:rounded-2xl dark:bg-white/5 dark:ring-white/10 dark:group-hover:ring-pink-400/25">
              <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </span>
            Thêm banner
          </Link>

          <Link
            href="/banners/trash"
            className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-emerald-600/20 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-md active:translate-y-0 sm:px-4 sm:text-sm dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-400/20 dark:hover:bg-emerald-500/20 dark:hover:ring-emerald-400/30 dark:hover:shadow-black/30"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/15 transition-all duration-500 ease-out sm:h-9 sm:w-9 sm:rounded-2xl dark:bg-emerald-500/20 dark:ring-emerald-400/20">
              <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2">
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
              <path d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5z" />
              <path d="M4 10h16" />
              <path d="M10 4v16" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Danh sách banner</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">Tổng: {activeItems.length} banner</div>
          </div>
        </div>

        <div className="w-full md:max-w-md">
          <div className="relative overflow-hidden rounded-2xl p-px shadow-[0_16px_60px_-40px_rgba(236,72,153,0.55)] transition-all duration-700 ease-out focus-within:shadow-[0_18px_70px_-40px_rgba(168,85,247,0.55)]" style={{
            background: 'linear-gradient(110deg, rgba(236, 72, 153, 0.35), rgba(56, 189, 248, 0.18), rgba(168, 85, 247, 0.35), rgba(236, 72, 153, 0.3))',
            backgroundSize: '360% 360%',
            animation: 'bannerSearchSparkleGradient 7s ease-in-out infinite'
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
                placeholder="Tìm kiếm theo tiêu đề / phụ đề / vị trí..."
                className="h-11 w-full rounded-2xl bg-white/60 pl-11 pr-3 text-sm text-slate-900 ring-1 ring-white/10 outline-none backdrop-blur-xl transition-all duration-700 ease-out focus:bg-white/75 focus:ring-pink-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:bg-white/10 dark:focus:ring-pink-400/25"
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
          <table className="w-full text-left text-sm">
            <thead className="bg-white/55 text-xs uppercase tracking-wide text-slate-700 backdrop-blur-xl dark:bg-slate-950/35 dark:text-slate-200">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="px-5 py-3 w-16 text-center">STT</th>
                <th className="px-5 py-3 min-w-[200px] text-center">Thông tin Banner</th>
                <th className="px-5 py-3 w-32 text-center">Vị trí</th>
                <th className="px-5 py-3 w-32 text-center">Ảnh</th>
                <th className="px-5 py-3 w-32 text-center">Trạng thái</th>
                <th className="px-5 py-3 min-w-[180px] text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-400 dark:text-slate-300" colSpan={6}>
                    Không có dữ liệu banner.
                  </td>
                </tr>
              ) : (
                filtered.map((b, idx) => {
                  const isDeleting = deletingId === b.id;
                  return (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedBanner(b)}
                      className={
                        "transition-all duration-500 ease-out " +
                        (isDeleting
                          ? "opacity-0 translate-x-2"
                          : "cursor-pointer opacity-100 hover:bg-slate-50 active:bg-slate-100/70 dark:hover:bg-white/5 dark:active:bg-white/10")
                      }
                    >
                      <td className="px-5 py-4 text-center text-slate-600 dark:text-slate-300">
                        {idx + 1}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-center">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {b.bannerImages.length > 0 ? b.bannerImages[0].title : "Chưa có tiêu đề"}
                          </div>
                          {b.bannerImages.length > 0 && b.bannerImages[0].subtitle && (
                            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                              {b.bannerImages[0].subtitle}
                            </div>
                          )}
                          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                            Cập nhật: {formatDate(b.updatedAt)}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          <div className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 dark:bg-white/5 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-white/10">
                            {b.position}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          <div className="relative h-12 w-24 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                            <Image
                              src={(b.bannerImages && b.bannerImages.length > 0) ? b.bannerImages[0].imageUrl : "https://dummyimage.com/240x120/e2e8f0/64748b&text=No+Image"}
                              alt={b.bannerImages.length > 0 ? (b.bannerImages[0].title || "Banner") : "Banner"}
                              width={96}
                              height={48}
                              unoptimized
                              className="h-full w-full object-cover cursor-pointer transition-transform duration-700 ease-out hover:scale-125"
                            />
                            {b.bannerImages.length > 1 && (
                              <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[8px] font-bold text-white">
                                +{b.bannerImages.length - 1}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          {b.isActive ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-white/10">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Tạm dừng
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/banners/update?id=${encodeURIComponent(b.id)}`);
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
                              softDelete(b.id);
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

      {mounted && selectedBanner ? createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            onMouseDown={() => setSelectedBanner(null)}
          />
          {/* Modal card */}
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-[2.5rem] animate-[scaleIn_180ms_ease-out]"
            style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}
          >
            {/* Header */}
            <div
              className="flex items-start justify-between gap-3 px-6 py-5"
              style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-white/90">Chi tiết Banner</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBanner(null)}
                className="inline-flex cursor-pointer h-10 w-10 items-center justify-center rounded-2xl text-white/70 shadow-sm transition hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-1">Tiêu đề (Ảnh 1)</div>
                    <div className="text-lg font-semibold text-white/90 leading-tight">
                      {selectedBanner.bannerImages.length > 0 ? selectedBanner.bannerImages[0].title : "N/A"}
                    </div>
                  </div>
                  {selectedBanner.bannerImages.length > 0 && selectedBanner.bannerImages[0].subtitle && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-1">Phụ đề (Ảnh 1)</div>
                      <div className="text-sm text-white/70">
                        {selectedBanner.bannerImages[0].subtitle}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-1">Vị trí</div>
                      <div
                        className="inline-flex rounded-lg px-2 py-1 text-xs font-bold text-white/85"
                        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                      >
                        {selectedBanner.position}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-1">Trạng thái</div>
                      <div className={`text-xs font-bold ${selectedBanner.isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {selectedBanner.isActive ? 'Đang hoạt động' : 'Đã tạm dừng'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-1">Hình ảnh ({selectedBanner.bannerImages.length})</div>
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                    {selectedBanner.bannerImages.map((img, i) => (
                      <div
                        key={i}
                        className="group relative aspect-video overflow-hidden rounded-xl"
                        style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                      >
                        <Image
                          src={img.imageUrl}
                          alt={`Banner image ${i + 1}`}
                          fill
                          unoptimized
                          className="object-cover cursor-pointer transition-transform duration-700 group-hover:scale-110"
                        />
                        {img.linkUrl && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] font-bold text-white uppercase tracking-tighter truncate px-2">{img.linkUrl}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Meta grid */}
              <div
                className="grid grid-cols-2 gap-6 rounded-3xl p-6"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-white/50">Ngày tạo</div>
                  <div className="text-sm text-white/85 font-medium">
                    {formatDate(selectedBanner.createdAt) || "-"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-white/50">Cập nhật lần cuối</div>
                  <div className="text-sm text-white/85 font-medium">
                    {formatDate(selectedBanner.updatedAt) || "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-3 px-6 py-5"
              style={{ background: "rgba(255,255,255,0.05)", borderTop: "1px solid rgba(255,255,255,0.1)" }}
            >
              <button
                type="button"
                onClick={() => setSelectedBanner(null)}
                className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-white/85 shadow-sm transition hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  router.push(`/banners/update?id=${encodeURIComponent(selectedBanner.id)}`);
                  setSelectedBanner(null);
                }}
                className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
                style={{ background: "rgba(236,72,153,0.85)", border: "1px solid rgba(236,72,153,0.3)", boxShadow: "0 4px 20px rgba(236,72,153,0.25)" }}
              >
                Chỉnh sửa
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bannerSearchSparkleGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.4);
        }
      `}</style>
    </div>
  );
}
