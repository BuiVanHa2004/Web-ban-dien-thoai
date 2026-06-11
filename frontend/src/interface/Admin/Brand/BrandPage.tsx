
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

import { brandService, BrandDto } from "@/services/brandService";

type Brand = {
  id: string;
  name: string;
  slug?: string | null;
  brandImages: string[];
  description: string;
  deletedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

function mapDtoToBrand(dto: BrandDto): Brand {
  return {
    id: String(dto.brandId),
    name: dto.brandName,
    slug: dto.slug || null,
    brandImages: dto.brandImages || [],
    description: dto.brandDescription || "",
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

export default function BrandPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = React.useState<Brand | null>(null);

  React.useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [active, trash] = await Promise.all([
        brandService.getAll(),
        brandService.getTrash(),
      ]);
      console.log('=== API Response ===');
      console.log('Active brands:', JSON.stringify(active, null, 2));
      console.log('Trash brands:', JSON.stringify(trash, null, 2));
      const merged = [...active, ...trash].map(mapDtoToBrand);
      console.log('=== Mapped Brands ===');
      console.log('Merged brands:', JSON.stringify(merged, null, 2));
      setBrands(merged);
    } catch (e: any) {
      console.error('Error loading brands:', e);
      setError(e?.message || "Không thể tải dữ liệu thương hiệu.");
    } finally {
      setLoading(false);
    }
  }

  const activeBrands = React.useMemo(
    () => brands.filter((b) => !b.deletedAt),
    [brands]
  );

  const trashCount = React.useMemo(
    () => brands.filter((b) => !!b.deletedAt).length,
    [brands]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeBrands;
    return activeBrands.filter((b) => {
      return b.name.toLowerCase().includes(q);
    });
  }, [activeBrands, query]);

  function softDelete(id: string) {
    setDeletingId(id);
    window.setTimeout(async () => {
      try {
        await brandService.softDelete(Number(id));
        await refresh();
      } catch (e: any) {
        setError(e?.message || "Không thể xóa thương hiệu.");
      } finally {
        setDeletingId(null);
      }
    }, 180);
  }

  React.useEffect(() => {
    if (!selectedBrand) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedBrand(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedBrand]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Thương hiệu
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Quản lý thương hiệu</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            Quản lý danh sách thương hiệu, chỉnh sửa, xóa mềm và khôi phục.
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
            href="/brands/create"
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900/90 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-slate-900/10 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-md active:translate-y-0 dark:bg-linear-to-br dark:from-cyan-400/20 dark:to-fuchsia-500/15 dark:text-slate-100 dark:ring-1 dark:ring-cyan-400/20 dark:shadow-lg dark:shadow-cyan-500/5 dark:hover:ring-cyan-400/30"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 transition-all duration-500 ease-out dark:bg-white/5 dark:ring-white/10 dark:group-hover:ring-cyan-400/25">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </span>
            Thêm thương hiệu
          </Link>

          <Link
            href="/brands/trash"
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
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Danh sách thương hiệu</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">Tổng: {activeBrands.length} thương hiệu</div>
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
                placeholder="Tìm kiếm theo tên thương hiệu..."
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
        <div className="max-h-[700px] overflow-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-white/80 text-xs uppercase tracking-wide text-slate-700 backdrop-blur-xl dark:bg-slate-900/90 dark:text-slate-200">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="px-5 py-4 font-black text-center">STT</th>
                <th className="px-5 py-4 font-black text-center">Tên thương hiệu</th>
                <th className="px-5 py-4 font-black text-center">Slug</th>
                <th className="px-5 py-4 font-black text-center">Ảnh</th>
                <th className="px-5 py-4 font-black text-center">Mô tả</th>
                <th className="px-5 py-4 font-black text-center">Hành động</th>
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
                filtered.map((b, idx) => {
                  const isDeleting = deletingId === b.id;
                  return (
                    <motion.tr
                      key={b.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onClick={() => setSelectedBrand(b)}
                      className={
                        "transition-colors duration-200 " +
                        (isDeleting
                          ? "opacity-50 grayscale pointer-events-none"
                          : "cursor-pointer hover:bg-slate-50 active:bg-slate-100/70 dark:hover:bg-white/5 dark:active:bg-white/10")
                      }
                    >
                      <td className="px-5 py-4 text-center text-slate-600 dark:text-slate-300">{idx + 1}</td>
                      <td className="px-5 py-4 text-center">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{b.name}</div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          Cập nhật: {formatDate(b.updatedAt)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">
                        <div className="text-sm font-mono">{b.slug || "-"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                            <Image
                              src={
                                (b.brandImages && b.brandImages.length > 0)
                                  ? b.brandImages[0]
                                  : "https://dummyimage.com/200x200/e2e8f0/64748b&text=No+Image"
                              }
                              alt={b.name}
                              width={80}
                              height={80}
                              unoptimized
                              className="h-full w-full cursor-pointer object-cover transition-transform duration-700 ease-out hover:scale-125"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">
                        <div className="line-clamp-2 max-w-[520px] mx-auto">{b.description}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/brands/update?id=${encodeURIComponent(b.id)}`);
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
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
        {selectedBrand && (
          <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 99999 }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBrand(null)}
              className="absolute inset-0"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.7)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl max-h-[calc(100vh-2rem)]"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                boxShadow: "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-start justify-between gap-3 px-5 py-4"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white/90">Chi tiết thương hiệu</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBrand(null)}
                  className="inline-flex cursor-pointer h-10 w-10 items-center justify-center rounded-2xl text-white/70 transition hover:-translate-y-0.5 hover:text-white active:translate-y-0"
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
              <div className="flex-1 overflow-y-auto p-5">
                <div className="space-y-4">
                  {/* Thông tin chính */}
                  <div
                    className="flex flex-col gap-5 rounded-3xl p-5 sm:flex-row sm:items-center"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div
                      className="h-32 w-32 shrink-0 overflow-hidden rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      <Image
                        src={
                          (selectedBrand.brandImages && selectedBrand.brandImages.length > 0)
                            ? selectedBrand.brandImages[0]
                            : "https://dummyimage.com/200x200/e2e8f0/64748b&text=No+Image"
                        }
                        alt={selectedBrand.name}
                        width={128}
                        height={128}
                        unoptimized
                        className="h-full w-full cursor-pointer object-cover transition-transform duration-700 ease-out hover:scale-110"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-semibold text-white/95">
                        {selectedBrand.name}
                      </div>
                      <div className="mt-2 text-sm text-white/65 leading-relaxed">
                        {selectedBrand.description || "(Không có mô tả)"}
                      </div>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div
                    className="grid grid-cols-1 gap-3 rounded-3xl p-4 sm:grid-cols-3"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div>
                      <div className="text-xs font-semibold text-white/50 uppercase tracking-wide">Slug</div>
                      <div className="mt-1 text-sm text-white/85 font-mono">
                        {selectedBrand.slug || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white/50 uppercase tracking-wide">Tạo lúc</div>
                      <div className="mt-1 text-sm text-white/85">
                        {formatDate(selectedBrand.createdAt) || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white/50 uppercase tracking-wide">Cập nhật</div>
                      <div className="mt-1 text-sm text-white/85">
                        {formatDate(selectedBrand.updatedAt) || "-"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-end gap-2 px-5 py-4"
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedBrand(null)}
                  className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white/75 transition-all hover:-translate-y-0.5 hover:text-white active:translate-y-0"
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
                    setSelectedBrand(null);
                    router.push(`/brands/update?id=${encodeURIComponent(selectedBrand.id)}`);
                  }}
                  className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-amber-950 transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                  style={{
                    background: "rgba(245, 158, 11, 0.85)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    boxShadow: "0 4px 20px rgba(245,158,11,0.25)",
                  }}
                >
                  Chỉnh sửa
                </button>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}

