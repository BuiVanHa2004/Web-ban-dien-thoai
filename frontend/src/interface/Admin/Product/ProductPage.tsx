
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

import { resolveImageUrl } from "@/common/resolveImageUrl";

import { productService, ProductDto, ProductType, DiscountType, ProductImageDto } from "@/services/productService";
function getProductPreviewImage(dto: ProductDto): string | undefined {
  // Try to get thumbnail first, then first image
  const thumbnailImage = dto.productImages?.find(img => img.isThumbnail)?.imageUrl;
  const firstImage = dto.productImages?.[0]?.imageUrl;
  return (
    dto.productMainImage ||
    thumbnailImage ||
    firstImage ||
    dto.productColors?.[0]?.images?.[0] ||
    undefined
  );
}

function computeCurrentPrice(dto: ProductDto): number {
  const base = Number(dto.basePrice) || 0;
  const current = dto.currentPrice == null ? null : Number(dto.currentPrice);
  if (current != null && Number.isFinite(current) && current > 0) return current;

  const discountValue = dto.discountValue == null ? 0 : Number(dto.discountValue);
  if (!dto.discountType || dto.discountType === "NONE" || !Number.isFinite(discountValue) || discountValue <= 0) return base;

  if (dto.discountType === "PERCENT") {
    return Math.round(base * (1 - discountValue / 100));
  }
  if (dto.discountType === "AMOUNT") {
    return Math.max(0, base - discountValue);
  }
  return base;
}

type Product = {
  id: string;
  name: string;
  slug?: string | null;
  imageUrl: string | undefined;
  brandName: string;
  categoryName: string;
  colorNames: string;
  ramGbValues: string;
  storageGbValues: string;
  stockQuantity: number;
  productType: ProductType | null;
  description: string;
  deletedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

function mapDtoToProduct(dto: ProductDto): Product {
  const colorNames = Array.from(new Set((dto.productColors || []).map((c) => (c.colorName || "").trim()).filter(Boolean))).join(", ");

  const ramSet = new Set<number>();
  const storageSet = new Set<number>();

  for (const c of dto.productColors || []) {
    for (const v of c.variants || []) {
      const ram = v.ramGb == null ? null : Number(v.ramGb);
      const storage = v.storageGb == null ? null : Number(v.storageGb);
      if (ram != null && Number.isFinite(ram)) ramSet.add(ram);
      if (storage != null && Number.isFinite(storage)) storageSet.add(storage);
    }
  }

  const ramGbValues = Array.from(ramSet).sort((a, b) => a - b).map(String).join(", ");
  const storageGbValues = Array.from(storageSet).sort((a, b) => a - b).map(String).join(", ");

  const stockQuantity = (dto.productColors || []).reduce((sum, c) => {
    // Use availableStock instead of deprecated quantity field
    const variantSum = (c.variants || []).reduce((vSum, v) => {
      const stock = v.availableStock !== undefined ? v.availableStock : v.quantity;
      return vSum + (Number(stock) || 0);
    }, 0);
    return sum + variantSum;
  }, 0);

  return {
    id: String(dto.productId),
    name: dto.productName,
    slug: dto.slug,
    imageUrl: getProductPreviewImage(dto),
    brandName: dto.brandName || "",
    categoryName: dto.categoryName || "",
    colorNames,
    ramGbValues,
    storageGbValues,
    stockQuantity,
    productType: dto.productType,
    description: dto.productDescribe || "",
    createdAt: dto.createdAt || null,
    updatedAt: dto.updatedAt || null,
    deletedAt: dto.deletedAt || null,
  };
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
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

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("vi-VN");
}

function formatProductType(type: ProductType | null): string {
  const typeMap: Record<ProductType, string> = {
    NEW: "Mới",
    BEST_SELLER: "Bán chạy",
    SALE: "Giảm giá",
  };
  return type ? typeMap[type] : "-";
}

function formatDiscount(discountType: DiscountType | null, discountValue: number | null): string {
  const dv = discountValue == null ? 0 : Number(discountValue);
  if (!discountType || discountType === "NONE" || !Number.isFinite(dv) || dv <= 0) return "-";
  if (discountType === "AMOUNT") {
    return `-${formatMoney(dv)}đ`;
  } else {
    return `-${dv}%`;
  }
}

function normalizeSpecName(value: string) {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function ProductPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [products, setProducts] = React.useState<Product[]>([]);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [selectedProductDetail, setSelectedProductDetail] = React.useState<ProductDto | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  React.useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [active, trash] = await Promise.all([
        productService.getAll(),
        productService.getTrash(),
      ]);
      const merged = [...active, ...trash].map(mapDtoToProduct);
      setProducts(merged);
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu sản phẩm.");
    } finally {
      setLoading(false);
    }
  }

  const activeProducts = React.useMemo(
    () => products.filter((p) => !p.deletedAt),
    [products]
  );

  const trashCount = React.useMemo(
    () => products.filter((p) => !!p.deletedAt).length,
    [products]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeProducts;
    return activeProducts.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    });
  }, [activeProducts, query]);

  function softDelete(id: string) {
    setDeletingId(id);
    window.setTimeout(async () => {
      try {
        await productService.softDelete(Number(id));
        await refresh();
      } finally {
        setDeletingId(null);
      }
    }, 180);
  }

  React.useEffect(() => {
    if (!selectedProduct) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedProduct(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedProduct]);

  React.useEffect(() => {
    if (!selectedProduct) {
      setSelectedProductDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    const sp = selectedProduct;

    let cancelled = false;
    async function loadDetail() {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const productId = Number(sp.id);
        if (Number.isNaN(productId)) {
          throw new Error("Id sản phẩm không hợp lệ.");
        }
        const dto = await productService.getById(productId);
        if (cancelled) return;
        setSelectedProductDetail(dto);
      } catch (e: any) {
        if (cancelled) return;
        setSelectedProductDetail(null);
        setDetailError(e?.message || "Không thể tải chi tiết sản phẩm.");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedProduct]);

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
            Sản phẩm
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Quản lý sản phẩm</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            Quản lý danh sách sản phẩm, chỉnh sửa, xóa mềm và khôi phục.
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
            href="/products/create"
            className="group cursor-pointer inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900/90 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-slate-900/10 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-md active:translate-y-0 dark:bg-linear-to-br dark:from-cyan-400/20 dark:to-fuchsia-500/15 dark:text-slate-100 dark:ring-1 dark:ring-cyan-400/20 dark:shadow-lg dark:shadow-cyan-500/5 dark:hover:ring-cyan-400/30"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 transition dark:bg-white/5 dark:ring-white/10 dark:group-hover:ring-cyan-400/25">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </span>
            Thêm sản phẩm
          </Link>

          <Link
            href="/products/trash"
            className="group cursor-pointer inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-600/20 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-md active:translate-y-0 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-400/20 dark:hover:bg-emerald-500/20 dark:hover:ring-emerald-400/30 dark:hover:shadow-black/30"
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
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Danh sách sản phẩm</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">Tổng: {activeProducts.length} sản phẩm</div>
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
                placeholder="Tìm kiếm theo tên / thương hiệu / danh mục / mô tả..."
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
        <div className="max-h-[750px] overflow-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-white/80 text-xs uppercase tracking-wide text-slate-700 backdrop-blur-xl dark:bg-slate-900/90 dark:text-slate-200">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="px-5 py-4 font-black text-center">STT</th>
                <th className="px-5 py-4 font-black text-center">Tên sản phẩm</th>
                <th className="px-5 py-4 font-black text-center">Slug</th>
                <th className="px-5 py-4 font-black text-center">Ảnh sản phẩm</th>
                <th className="px-5 py-4 font-black text-center">Thương hiệu</th>
                <th className="px-5 py-4 font-black text-center">Danh mục</th>
                <th className="px-5 py-4 font-black text-center">Loại sản phẩm</th>
                <th className="px-5 py-4 font-black text-center">Màu</th>
                <th className="px-5 py-4 font-black text-center">RAM</th>
                <th className="px-5 py-4 font-black text-center">Bộ nhớ</th>
                <th className="px-5 py-4 font-black text-center">Tồn kho</th>
                <th className="px-5 py-4 font-black text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-400 dark:text-slate-300" colSpan={12}>
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => {
                  const isDeleting = deletingId === p.id;
                  return (
                    <motion.tr
                      key={p.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onClick={() => setSelectedProduct(p)}
                      className={
                        "transition-colors duration-200 " +
                        (isDeleting
                          ? "opacity-50 grayscale pointer-events-none"
                          : "cursor-pointer hover:bg-slate-50 active:bg-slate-100/70 dark:hover:bg-white/5 dark:active:bg-white/10")
                      }
                    >
                      <td className="px-5 py-4 text-center text-slate-600 dark:text-slate-300">{idx + 1}</td>
                      <td className="px-5 py-4 text-center">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 mx-auto">{p.name}</div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 mx-auto">
                          Cập nhật: {formatDate(p.updatedAt)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="text-sm text-slate-700 dark:text-slate-300">{p.slug || "-"}</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex justify-center">
                          <div className="aspect-[9/16] w-14 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                            <Image
                              src={
                                resolveImageUrl(p.imageUrl) ||
                                "https://dummyimage.com/200x200/e2e8f0/64748b&text=No+Image"
                              }
                              alt={p.name}
                              width={56}
                              height={100}
                              unoptimized
                              className="h-full w-full cursor-pointer object-cover transition-transform duration-700 ease-out hover:scale-110"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">{p.brandName || "-"}</td>
                      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">{p.categoryName || "-"}</td>
                      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">{formatProductType(p.productType)}</td>
                      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">{p.colorNames || "-"}</td>
                      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">{p.ramGbValues || "-"}</td>
                      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">{p.storageGbValues || "-"}</td>
                      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">
                        <div className="flex justify-center">
                          {p.stockQuantity <= 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 ring-1 ring-rose-200/50 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20">
                              Hết hàng
                            </span>
                          ) : (
                            <span className="font-medium">{p.stockQuantity}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/products/update?id=${encodeURIComponent(p.id)}`);
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
                              softDelete(p.id);
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
          {selectedProduct && (
            <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedProduct(null)}
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
                className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl shadow-xl max-h-[calc(100vh-2rem)]"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  boxShadow: "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                <div
                  className="flex items-start justify-between gap-3 px-5 py-4"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white/90">Chi tiết sản phẩm</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="inline-flex cursor-pointer h-10 w-10 items-center justify-center rounded-2xl text-white/70 shadow-sm transition hover:-translate-y-0.5 active:translate-y-0"
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

              <div className="flex-1 overflow-y-auto p-5">
                <div className="space-y-4">
                  <div
                    className="flex flex-col gap-5 rounded-3xl p-5 sm:flex-row sm:items-center"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div
                      className="aspect-[9/16] w-32 shrink-0 overflow-hidden rounded-2xl"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      <Image
                        src={
                          resolveImageUrl(selectedProduct.imageUrl) ||
                          "https://dummyimage.com/200x200/e2e8f0/64748b&text=No+Image"
                        }
                        alt={selectedProduct.name}
                        width={144}
                        height={256}
                        unoptimized
                        className="h-full w-full cursor-pointer object-cover transition-transform duration-700 ease-out hover:scale-110"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-semibold text-white/95">
                        {selectedProduct.name}
                      </div>
                      <div className="mt-2 text-sm text-white/80">
                        {selectedProduct.description || "(Không có mô tả)"}
                      </div>
                    </div>
                  </div>

                  <div
                    className="grid grid-cols-1 gap-3 rounded-3xl p-4 sm:grid-cols-3"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-white/75">Slug (URL)</div>
                      <div className="mt-1 text-sm text-white/90">
                        {selectedProduct.slug || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-white/75">Thương hiệu</div>
                      <div className="mt-1 text-sm text-white/90">
                        {selectedProduct.brandName || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-white/75">Danh mục</div>
                      <div className="mt-1 text-sm text-white/90">
                        {selectedProduct.categoryName || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-white/75">Loại sản phẩm</div>
                      <div className="mt-1 text-sm text-white/90">
                        {formatProductType(selectedProduct.productType)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-white/75">Tồn kho</div>
                      <div className="mt-1 text-sm font-black">
                        {selectedProduct.stockQuantity <= 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">Hết hàng</span>
                        ) : (
                          <span className="text-white/90">{selectedProduct.stockQuantity}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-white/75">Màu</div>
                      <div className="mt-1 text-sm text-white/90">
                        {selectedProduct.colorNames || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-white/75">RAM</div>
                      <div className="mt-1 text-sm text-white/90">
                        {selectedProduct.ramGbValues || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-white/75">Bộ nhớ</div>
                      <div className="mt-1 text-sm text-white/90">
                        {selectedProduct.storageGbValues || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-white/75">Tạo lúc</div>
                      <div className="mt-1 text-sm text-white/90">
                        {formatDate(selectedProduct.createdAt) || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-white/75">Cập nhật</div>
                      <div className="mt-1 text-sm text-white/90">
                        {formatDate(selectedProduct.updatedAt) || "-"}
                      </div>
                    </div>
                  </div>

                  {detailLoading ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200">
                      Đang tải chi tiết...
                    </div>
                  ) : null}

                  {detailError ? (
                    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                      {detailError}
                    </div>
                  ) : null}

                  {selectedProductDetail ? (
                    <>
                      {selectedProductDetail.productSpecs && selectedProductDetail.productSpecs.length > 0 ? (
                        <div
                          className="space-y-2 rounded-3xl p-4"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <div className="text-sm font-semibold text-white/90">Thông số kỹ thuật</div>
                          <div className="overflow-hidden rounded-3xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                            <table className="min-w-full border-collapse text-sm">
                              <thead className="text-xs font-semibold text-white/75" style={{ background: "rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <tr className="border-b border-slate-200 dark:border-white/10">
                                  <th className="px-4 py-3 text-center">Thông số</th>
                                  <th className="px-4 py-3 text-center">Giá trị</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                                {(() => {
                                  const specs = (selectedProductDetail.productSpecs || []).filter(Boolean) as any[];
                                  const firstSpec = specs[0];
                                  return (
                                    <>
                                      {specs.map((spec, idx) => (
                                        <tr key={String(spec?.specId ?? idx)}>
                                          <td className="px-4 py-3 text-center text-white/75">Phiên bản</td>
                                          <td className="px-4 py-3 text-center text-white/90">{spec?.version || "-"}</td>
                                        </tr>
                                      ))}

                                      {firstSpec?.chip && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Chip</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.chip}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.screen && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Màn hình</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.screen}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.refreshRate && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Tần số quét</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.refreshRate}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.battery && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Pin</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.battery}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.fastCharge && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Sạc nhanh</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.fastCharge}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.cameraRear && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Camera sau</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.cameraRear}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.cameraFront && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Camera trước</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.cameraFront}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.support5g != null && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Hỗ trợ 5G</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.support5g ? "Có" : "Không"}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.nfc != null && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">NFC</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.nfc ? "Có" : "Không"}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.operatingSystem && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Hệ điều hành</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.operatingSystem}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.size && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Kích thước</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.size}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.weight && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Trọng lượng</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.weight}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.material && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Chất liệu</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.material}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.waterResistance && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Chống nước</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.waterResistance}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.chargingPort && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Cổng sạc</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.chargingPort}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.sim && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">SIM</td>
                                          <td className="px-4 py-3 text-center text-white/90">{firstSpec.sim}</td>
                                        </tr>
                                      )}
                                      {firstSpec?.warranty && (
                                        <tr>
                                          <td className="px-4 py-3 text-center text-white/75">Bảo hành</td>
                                          <td className="px-4 py-3 text-center text-white/90">
                                            {firstSpec.warranty.toLowerCase().includes("tháng")
                                              ? firstSpec.warranty
                                              : `${firstSpec.warranty} tháng`}
                                          </td>
                                        </tr>
                                      )}
                                    </>
                                  );
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}

                      {(selectedProductDetail.productColors || []).length > 0 ? (
                        <div
                          className="space-y-2 rounded-3xl p-4"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <div className="text-sm font-semibold text-white/90">Màu sắc / Biến thể</div>
                          <div className="space-y-2">
                            {selectedProductDetail.productColors?.map((c) => {
                              // Use availableStock from variants instead of quantity
                              const variantQuantity = (c.variants || []).reduce((sum, v) => {
                                const stock = v.availableStock !== undefined ? v.availableStock : v.quantity;
                                return sum + (Number(stock) || 0);
                              }, 0);
                              return (
                                <div
                                  key={c.productColorId}
                                  className="rounded-3xl p-4"
                                  style={{
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                  }}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="font-semibold text-white/90">
                                      {c.colorName}
                                      {c.colorCode ? (
                                        <span className="ml-2 text-xs font-semibold text-white/75">
                                          ({c.colorCode})
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="text-sm text-white/80">Còn lại: {variantQuantity}</div>
                                  </div>

                                  {(c.images || []).length > 0 ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {(c.images || []).map((url, i) => (
                                        <div
                                          key={`${c.productColorId}-${url}-${i}`}
                                          className="group aspect-[9/16] w-14 overflow-hidden rounded-xl"
                                          style={{
                                            background: "rgba(255,255,255,0.08)",
                                            border: "1px solid rgba(255,255,255,0.15)",
                                          }}
                                        >
                                          <Image
                                            src={resolveImageUrl(url) || "https://dummyimage.com/200x200/e2e8f0/64748b&text=No+Image"}
                                            alt={c.colorName}
                                            width={56}
                                            height={100}
                                            unoptimized
                                            className="h-full w-full cursor-pointer object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}

                                  {(c.variants || []).length > 0 ? (
                                    <div className="mt-3 overflow-hidden rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                                      <table className="min-w-full border-collapse text-sm">
                                        <thead className="text-xs font-semibold text-white/75" style={{ background: "rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                          <tr>
                                            <th className="px-3 py-2 text-center">RAM</th>
                                            <th className="px-3 py-2 text-center">Bộ nhớ</th>
                                            <th className="px-3 py-2 text-center">Còn lại</th>
                                            <th className="px-3 py-2 text-center">Giá gốc</th>
                                            <th className="px-3 py-2 text-center">Giá giảm</th>
                                            <th className="px-3 py-2 text-center">Giá hiện tại</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                                          {(c.variants || []).map((v) => {
                                            const original = Number(v.originalPrice) || 0;
                                            const discountType = v.discountType;
                                            const discountValue = Number(v.discountValue) || 0;
                                            let finalPrice = Number(v.finalPrice) || original;
                                            let discountText = "";
                                            if (discountType === "PERCENT" && discountValue > 0) {
                                              discountText = `-${discountValue}%`;
                                              if (!v.finalPrice) finalPrice = Math.max(original - (original * discountValue / 100), 0);
                                            } else if (discountType === "AMOUNT" && discountValue > 0) {
                                              discountText = `-${discountValue.toLocaleString("vi-VN")}đ`;
                                              if (!v.finalPrice) finalPrice = Math.max(original - discountValue, 0);
                                            }
                                            const hasDiscount = discountType && discountType !== "NONE" && discountValue > 0;
                                            return (
                                              <tr key={v.variantId}>
                                                <td className="px-3 py-2 text-center text-white/90">{v.ramGb ?? "-"}</td>
                                                <td className="px-3 py-2 text-center text-white/90">{v.storageGb ?? "-"}</td>
                                                <td className="px-3 py-2 text-center text-white/90">
                                                  {v.availableStock !== undefined ? Number(v.availableStock) : Number(v.quantity || 0)}
                                                </td>
                                                <td className="px-3 py-2 text-center text-white/80">
                                                  {original > 0 ? (
                                                    <span className={hasDiscount ? "line-through" : ""}>
                                                      {original.toLocaleString("vi-VN")}đ
                                                    </span>
                                                  ) : "-"}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                  {hasDiscount ? (
                                                    <span className="font-medium text-rose-300">
                                                      {discountText}
                                                    </span>
                                                  ) : (
                                                    <span className="text-white/45">-</span>
                                                  )}
                                                </td>
                                                <td className="px-3 py-2 text-center font-semibold text-emerald-300">
                                                  {finalPrice > 0 ? `${finalPrice.toLocaleString("vi-VN")}đ` : "-"}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>

              <div
                className="flex items-center justify-end gap-2 px-5 py-4"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white/75 shadow-sm transition hover:-translate-y-0.5 active:translate-y-0"
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
                    setSelectedProduct(null);
                    router.push(`/products/update?id=${encodeURIComponent(selectedProduct.id)}`);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                  style={{
                    background: "rgba(245,158,11,0.85)",
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


