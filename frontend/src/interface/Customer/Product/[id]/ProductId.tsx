"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { createPortal } from "react-dom";

import { productService, type ProductDto, type ProductVariantDto } from "@/services/productService";
import {
  evaluateService,
  type ProductEvaluateCommentDto,
} from "@/services/evaluateService";
import { addProductToCart, flyProductToCart } from "@/common/cartClient";
import { writeCheckoutDraft } from "@/common/checkoutDraft";
import ProductVariantPickerModal from "@/components/customer/ProductVariantPickerModal";
import SocialQrContact from "@/components/customer/SocialQrContact";
import { motion, AnimatePresence } from "framer-motion";
import { resolveImageUrl } from "@/common/resolveImageUrl";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

function computeCurrentPrice(p: ProductDto): number {
  const base = Number(p.basePrice) || 0;
  if (p.currentPrice != null) return Number(p.currentPrice);
  if (!p.discountValue || Number(p.discountValue) <= 0) return base;
  if (!p.discountType || p.discountType === "NONE") return base;
  if (p.discountType === "PERCENT") {
    return Math.round(base * (1 - Number(p.discountValue) / 100));
  }
  if (p.discountType === "AMOUNT") {
    return Math.max(0, base - Number(p.discountValue));
  }
  return base;
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour12: false });
}

function formatAverageRating(value: number) {
  return Number.isInteger(value) ? `${value}.0` : value.toFixed(1);
}

function readCustomerId(): number | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw) as { id?: string };
    const id = u?.id ? Number(u.id) : NaN;
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

function getProductPreviewImage(p: { productMainImage?: string | null; productImages?: { imageUrl: string }[]; productColors?: { images?: string[] }[] }): string | null {
  return p.productMainImage || p.productImages?.[0]?.imageUrl || p.productColors?.[0]?.images?.[0] || null;
}

export default function ProductId() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const idRaw = params?.id;
  const productId = Number(idRaw);

  const returnHref = React.useMemo(() => {
    const raw = searchParams.get("returnUrl");
    if (!raw) return null;
    try {
      const decoded = decodeURIComponent(raw);
      if (decoded.startsWith("/")) return decoded;
      return null;
    } catch {
      return null;
    }
  }, [searchParams]);

  const [product, setProduct] = React.useState<ProductDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [portalReady, setPortalReady] = React.useState(false);
  const [reviews, setReviews] = React.useState<ProductEvaluateCommentDto[]>([]);
  const [reviewsLoading, setReviewsLoading] = React.useState(false);
  const [variantModalOpen, setVariantModalOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<"add" | "buy">("add");
  const [lastActionButtonEl, setLastActionButtonEl] = React.useState<HTMLElement | null>(null);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);

  const [selectedColorId, setSelectedColorId] = React.useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = React.useState<number | null>(null);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  const [imageKey, setImageKey] = React.useState(0);
  const [reveal, setReveal] = React.useState(false);

  React.useEffect(() => {
    setPortalReady(true);
  }, []);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!idRaw || Number.isNaN(productId)) {
        setError("Thiếu hoặc sai id sản phẩm.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const dto = await productService.getById(productId);
        if (!mounted) return;
        setProduct(dto);

        const firstColorId = dto.productColors?.[0]?.productColorId ?? null;
        setSelectedColorId(firstColorId);
        const hasVariants = (dto.productColors ?? []).some((c) => (c.variants ?? []).length > 0);
        const firstVariantId = hasVariants ? dto.productColors?.[0]?.variants?.[0]?.variantId ?? null : null;
        setSelectedVariantId(firstVariantId);
        const firstColorImage = dto.productColors?.[0]?.images?.[0] ?? null;
        const fallback = dto.productMainImage ?? dto.productImages?.[0]?.imageUrl ?? null;
        setSelectedImage(firstColorImage ?? fallback);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Không thể tải chi tiết sản phẩm.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [idRaw, productId]);

  React.useEffect(() => {
    if (!idRaw || Number.isNaN(productId)) {
      setReviews([]);
      return;
    }

    let mounted = true;
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const data = await evaluateService.getByProductIdWithImages(productId);
        if (!mounted) return;
        setReviews(data);
      } catch {
        if (!mounted) return;
        setReviews([]);
      } finally {
        if (mounted) setReviewsLoading(false);
      }
    };

    fetchReviews();

    const onFocus = () => {
      fetchReviews();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [idRaw, productId]);

  React.useEffect(() => {
    setImageKey((k) => k + 1);
  }, [selectedImage]);

  React.useEffect(() => {
    setReveal(true);
  }, []);

  const selectedColor = React.useMemo(() => {
    if (!product?.productColors || selectedColorId == null) return null;
    return product.productColors.find((c) => c.productColorId === selectedColorId) ?? null;
  }, [product, selectedColorId]);

  const hasVariants = (product?.productColors ?? []).some((c) => (c.variants ?? []).length > 0);
  const selectedVariants = React.useMemo(() => selectedColor?.variants ?? [], [selectedColor]);
  const selectedVariant = React.useMemo<ProductVariantDto | null>(
    () => selectedVariants.find((v) => v.variantId === selectedVariantId) ?? null,
    [selectedVariants, selectedVariantId]
  );

  const totalStockQuantity = React.useMemo(() => {
    return (product?.productColors || []).reduce((sum, c) => {
      const variants = c.variants || [];
      if (variants.length > 0) {
        return sum + variants.reduce((sub, v) => sub + (Number(v.availableStock) || 0), 0);
      }
      // Fallback to color-level quantity if no variants (legacy)
      return sum + (Number(c.quantity) || 0);
    }, 0);
  }, [product]);

  const selectedStockQuantity = React.useMemo(() => {
    if (selectedColorId == null) return totalStockQuantity;
    if (hasVariants) return Number(selectedVariant?.availableStock ?? 0) || 0;
    const variants = selectedColor?.variants || [];
    if (variants.length > 0) return variants.reduce((s, v) => s + (Number(v.availableStock) || 0), 0);
    return Number(selectedColor?.quantity) || 0;
  }, [selectedColor, selectedVariant, selectedColorId, totalStockQuantity, hasVariants]);

  const displaySpecs = React.useMemo(() => {
    const specs: { label: string; value: string | React.ReactNode }[] = [];

    const allRams = new Set<number>();
    const allStorages = new Set<number>();

    for (const c of product?.productColors || []) {
      for (const v of c.variants || []) {
        if (v.ramGb) allRams.add(Number(v.ramGb));
        if (v.storageGb) allStorages.add(Number(v.storageGb));
      }
    }

    if (allRams.size > 0) {
      const sortedRams = Array.from(allRams).sort((a, b) => a - b);
      specs.push({ label: "RAM", value: sortedRams.map(r => `${r} GB`).join(" / ") });
    }

    if (allStorages.size > 0) {
      const sortedStorages = Array.from(allStorages).sort((a, b) => a - b);
      specs.push({ label: "Bộ nhớ trong", value: sortedStorages.map(s => `${s} GB`).join(" / ") });
    }

    const pSpec = product?.productSpecs?.[0];
    if (pSpec) {
      if (pSpec.version) specs.push({ label: "Phiên bản", value: pSpec.version });
      if (pSpec.screen) specs.push({ label: "Màn hình", value: pSpec.screen });
      if (pSpec.operatingSystem) specs.push({ label: "Hệ điều hành", value: pSpec.operatingSystem });
      if (pSpec.chip) specs.push({ label: "Chip xử lý (CPU)", value: pSpec.chip });
      if (pSpec.cameraRear) specs.push({ label: "Camera sau", value: pSpec.cameraRear });
      if (pSpec.cameraFront) specs.push({ label: "Camera trước", value: pSpec.cameraFront });
      if (pSpec.battery) specs.push({ label: "Dung lượng pin", value: pSpec.battery });
      if (pSpec.fastCharge) specs.push({ label: "Sạc nhanh", value: pSpec.fastCharge });
      if (pSpec.refreshRate) specs.push({ label: "Tần số quét", value: pSpec.refreshRate });
      if (pSpec.support5g != null) specs.push({ label: "Hỗ trợ mạng 5G", value: pSpec.support5g ? "Có" : "Không" });
      if (pSpec.nfc != null) specs.push({ label: "NFC", value: pSpec.nfc ? "Có" : "Không" });
      if (pSpec.size) specs.push({ label: "Kích thước", value: pSpec.size });
      if (pSpec.weight) specs.push({ label: "Trọng lượng", value: pSpec.weight });
      if (pSpec.material) specs.push({ label: "Chất liệu", value: pSpec.material });
      if (pSpec.waterResistance) specs.push({ label: "Kháng nước/bụi", value: pSpec.waterResistance });
      if (pSpec.chargingPort) specs.push({ label: "Cổng sạc", value: pSpec.chargingPort });
      if (pSpec.sim) specs.push({ label: "Loại SIM", value: pSpec.sim });
      if (pSpec.warranty) {
        const wValue = pSpec.warranty.toLowerCase().includes("tháng")
          ? pSpec.warranty
          : `${pSpec.warranty} tháng`;
        specs.push({ label: "Bảo hành", value: wValue });
      }
    }

    return specs;
  }, [product, selectedVariant]);

  const isOutOfStock = totalStockQuantity <= 0;
  const isLowStock = !isOutOfStock && selectedStockQuantity <= 10;

  const reviewAverage = React.useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, rv) => sum + (Number(rv.rating) || 0), 0);
    return total / reviews.length;
  }, [reviews]);

  async function buyNowWithSelection(selection: {
    productColorId: number | null;
    productVariantId: number | null;
    colorName: string | null;
    ramGb?: number | null;
    storageGb?: number | null;
    imageUrl?: string | null;
    quantity: number;
    price: number;
  }) {
    if (!product) return;
    const customerId = readCustomerId();
    if (!customerId) {
      setError("Vui lòng đăng nhập để mua ngay.");
      return;
    }
    try {
      writeCheckoutDraft({
        source: "buy_now",
        createdAt: Date.now(),
        items: [
          {
            productId: product.productId,
            productName: product.productName,
            price: selection.price,
            quantity: selection.quantity,
            productColorId: selection.productColorId,
            productVariantId: selection.productVariantId,
            productColor: selection.colorName,
            ramGb: selection.ramGb ?? null,
            storageGb: selection.storageGb ?? null,
            imageUrl:
              selection.imageUrl ??
              selectedImage ??
              product.productMainImage ??
              product.productImages?.[0]?.imageUrl ??
              null,
          },
        ],
      });
      router.push("/payment");
    } catch (e: any) {
      setError(e?.message || "Không thể chuyển sang bước thanh toán.");
    }
  }

  function addToCartAndGo() {
    if (!product) return;
    if (isOutOfStock) return;
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      window.dispatchEvent(new Event("show-auth-popup"));
      return;
    }
    if (product.productColors && product.productColors.length > 0) {
      setPendingAction("buy");
      setVariantModalOpen(true);
      return;
    }
    void buyNowWithSelection({
      productColorId: null,
      productVariantId: null,
      colorName: null,
      ramGb: null,
      storageGb: null,
      imageUrl: selectedImage ?? product.productMainImage ?? product.productImages?.[0]?.imageUrl ?? null,
      quantity: 1,
      price: computeCurrentPrice(product),
    });
  }

  async function addToCartOnly(sourceEl?: HTMLElement) {
    if (!product) return;
    if (isOutOfStock) return;
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      window.dispatchEvent(new Event("show-auth-popup"));
      return;
    }
    setPendingAction("add");
    setLastActionButtonEl(sourceEl ?? null);
    setVariantModalOpen(true);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-36 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="mx-auto w-full max-w-[360px] aspect-[9/16] rounded-[2rem] bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="space-y-3">
            <div className="h-7 w-4/5 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-5 w-2/5 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-6 w-1/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-24 w-full rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {returnHref ? (
          <Link
            href={returnHref}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white/70 px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Quay lại
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) router.back();
              else router.push("/product");
            }}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white/70 px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Quay lại
          </button>
        )}
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-4">
        {returnHref ? (
          <Link
            href={returnHref}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white/70 px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Quay lại
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) router.back();
              else router.push("/product");
            }}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white/70 px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Quay lại
          </button>
        )}
        <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          Không tìm thấy sản phẩm.
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-4 pb-12">
      {/* Fixed back button via portal */}
      {typeof window !== "undefined" && createPortal(
        <div className="fixed left-3 top-[3.5rem] z-[190] sm:left-4 sm:top-[4.25rem]">
          {returnHref ? (
            <Link
              href={returnHref}
              className="group flex items-center gap-2 rounded-full border border-zinc-600 bg-zinc-900/90 py-1.5 pl-2 pr-4 text-sm font-bold text-slate-400 backdrop-blur-md transition-colors hover:border-purple-600 hover:text-purple-400"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 transition-all group-hover:bg-purple-600 group-hover:text-white">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              Quay lại
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) router.back();
                else router.push("/product");
              }}
              className="group flex items-center gap-2 rounded-full border border-zinc-600 bg-zinc-900/90 py-1.5 pl-2 pr-4 text-sm font-bold text-slate-400 backdrop-blur-md transition-colors hover:border-purple-600 hover:text-purple-400"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 transition-all group-hover:bg-purple-600 group-hover:text-white">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              Quay lại
            </button>
          )}
        </div>,
        document.body
      )}

      <div className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-64 bg-gradient-to-r from-cyan-500/10 via-transparent to-fuchsia-500/10 blur-3xl" />

      <div className="grid items-start gap-8 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto w-full max-w-[420px] lg:sticky lg:top-24 lg:z-10 lg:self-start"
        >
          <div className="overflow-hidden rounded-[2.5rem] customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 shadow-2xl shadow-black/25 transition-all duration-500 hover:shadow-black/35">
            <div className="group relative w-full aspect-[9/16] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {(() => {
                  const url = resolveImageUrl(selectedImage);
                  if (url) {
                    return (
                      <motion.img
                        key={imageKey}
                        src={url}
                        alt={product.productName}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4 }}
                        className="h-full w-full object-contain cursor-zoom-in transition-all duration-500"
                      />
                    );
                  }
                  return <div className="grid h-full place-items-center text-zinc-400">No image</div>;
                })()}
              </AnimatePresence>

              {isOutOfStock && (
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                  <div className="rotate-[-12deg] rounded-2xl border-4 border-rose-600 bg-white/90 px-8 py-4 shadow-2xl backdrop-blur-sm dark:bg-slate-900/90">
                    <span className="text-3xl font-black tracking-tighter text-rose-600 dark:text-rose-500">HẾT HÀNG</span>
                  </div>
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {product.discountValue && product.discountValue > 0 && (
                <div className="absolute right-6 top-6">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="rounded-full bg-rose-500 px-4 py-2 text-sm font-bold text-white shadow-xl shadow-rose-500/30"
                  >
                    {product.discountType === "AMOUNT" ? "Giảm cực sâu" : `-${product.discountValue}%`}
                  </motion.div>
                </div>
              )}
            </div>

            {/* Color Thumbnails */}
            {product.productColors && product.productColors.length > 1 && (
              <div className="flex gap-3 overflow-x-auto p-4 scrollbar-hide">
                {product.productColors.map((c) => (
                  <button
                    key={c.productColorId}
                    onClick={() => {
                      setSelectedColorId(c.productColorId);
                      setSelectedImage(c.images?.[0] ?? product.productMainImage ?? product.productImages?.[0]?.imageUrl ?? null);
                    }}
                    className={`relative h-20 aspect-[9/16] shrink-0 overflow-hidden rounded-xl border-2 bg-slate-100 dark:bg-slate-800 transition-all ${selectedColorId === c.productColorId ? "border-cyan-500 scale-105 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                  >
                    <img src={resolveImageUrl(c.images?.[0] || product.productMainImage)} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-[2.5rem] customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 p-6 shadow-xl shadow-black/20">
            <SocialQrContact title="Liên hệ nhanh qua mạng xã hội" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="min-w-0 space-y-6"
        >
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-50 sm:text-3xl md:text-4xl lg:text-5xl">{product.productName}</h1>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-900 dark:bg-white/10 dark:text-slate-300">
                {product.brandName}
              </span>
              {product.categoryName && (
                <span className="text-sm font-medium text-zinc-400">
                  trong {product.categoryName}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-black/5 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-xl shadow-black/5 backdrop-blur-md dark:border-white/10 dark:from-white/5 dark:to-white/[0.02] dark:shadow-black/30">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <motion.div 
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="rounded-2xl bg-blue-600 px-6 py-3 text-lg md:text-xl font-black text-white shadow-xl shadow-blue-500/40 border border-blue-400/20"
                >
                  Nhấn mua ngay để xem giá chi tiết
                </motion.div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100/50 px-3 py-1.5 dark:bg-white/5">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-tight">Còn lại:</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">{selectedStockQuantity}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              {isOutOfStock ? (
                <span className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-[11px] font-bold text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Hết hàng
                </span>
              ) : isLowStock ? (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Sắp hết hàng
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Đang sẵn hàng
                </span>
              )}
              {product.brandName && (
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-900">{product.brandName} Official</span>
              )}
            </div>

            {product.productColors && product.productColors.length > 0 && (
              <div className="mt-8">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">Phân loại màu sắc</div>
                <div className="flex flex-wrap gap-2.5">
                  {product.productColors.map((c) => (
                    <button
                      key={c.productColorId}
                      type="button"
                      onClick={() => {
                        setSelectedColorId(c.productColorId);
                        setSelectedVariantId(hasVariants ? (c.variants?.[0]?.variantId ?? null) : null);
                        setSelectedImage(c.images?.[0] ?? product.productMainImage ?? product.productImages?.[0]?.imageUrl ?? null);
                      }}
                      className={`group relative flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 transition-all ${selectedColorId === c.productColorId
                          ? "border-cyan-500 bg-cyan-500/5 shadow-md shadow-cyan-500/10"
                          : "border-black/5 bg-white hover:border-black/10 dark:border-white/5 dark:bg-white/5 dark:hover:border-white/10"
                        } cursor-pointer`}
                    >
                      <div
                        className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-inner"
                        style={{ backgroundColor: c.colorCode || "#e2e8f0" }}
                      />
                      <span className={`text-[13px] font-bold ${selectedColorId === c.productColorId ? "text-cyan-600 dark:text-cyan-400" : "text-zinc-400"}`}>
                        {c.colorName}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-3xl border border-black/5 bg-white/50 p-3 dark:border-white/5 dark:bg-white/5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 11v10l8 4" />
                </svg>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-900 dark:text-white">Free Ship</div>
                <div className="text-[10px] text-slate-900">Đơn từ 500k</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-3xl border border-black/5 bg-white/50 p-3 dark:border-white/5 dark:bg-white/5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-900 dark:text-white">Bảo hành</div>
                <div className="text-[10px] text-slate-900">Chính hãng 12th</div>
              </div>
            </div>
          </div>

          <div className="rounded-[2.5rem] customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 p-6 shadow-xl shadow-black/20 backdrop-blur-md">
            <div className="text-base font-bold text-slate-900 dark:text-white mb-4">Thông số kỹ thuật</div>
            <div className="overflow-hidden rounded-2xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/[0.02]">
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {displaySpecs.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-[110px_1fr] gap-3 px-4 py-2.5 text-xs">
                    <div className="font-bold text-zinc-400 uppercase tracking-tight">{s.label}</div>
                    <div className="font-semibold text-slate-900 dark:text-white truncate">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-4 space-y-6"
      >
        <div className="grid gap-6">
          {product.productDescribe && (
            <div className="rounded-[2.5rem] customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 p-6 shadow-xl shadow-black/20 backdrop-blur-md">
              <div className="text-base font-bold text-slate-900 dark:text-white mb-4">Mô tả chi tiết</div>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-900 dark:text-slate-200">
                  {product.productDescribe}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-[2.5rem] customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 p-6 shadow-xl shadow-black/20 backdrop-blur-md">
            <div className="flex items-center justify-between mb-6">
              <div className="text-base font-bold text-slate-900 dark:text-white">Đánh giá khách hàng</div>
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-1.5 text-amber-600">
                <span className="text-sm font-black">★ {formatAverageRating(reviewAverage)}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">({reviews.length})</span>
              </div>
            </div>
            {/* ... rest of reviews content ... */}

            {reviewsLoading ? (
              <div className="mt-3 text-sm text-zinc-400">Đang tải đánh giá...</div>
            ) : reviews.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-900 dark:border-white/15 dark:text-slate-900">
                Sản phẩm chưa có đánh giá nào.
              </div>
            ) : (
              <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {reviews.map((rv) => (
                  <div
                    key={rv.evaluateId}
                    className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {rv.customerName || "Khách hàng"}
                      </div>
                      <div className="text-xs text-zinc-400">{formatDate(rv.createdAt)}</div>
                    </div>
                    {/* Thông tin sản phẩm đã mua */}
                    {(rv.productName || rv.colorName || rv.ramGb || rv.storageGb || rv.quantity) && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs dark:border-white/10 dark:bg-slate-800/50">
                        <div className="font-medium text-slate-900 dark:text-slate-200">
                          {rv.productName || "Sản phẩm"}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-zinc-400">
                          {rv.colorName && (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-slate-900">Màu:</span>
                              <span className="font-medium text-slate-900 dark:text-slate-300">{rv.colorName}</span>
                            </span>
                          )}
                          {rv.ramGb && (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-slate-900">RAM:</span>
                              <span className="font-medium text-slate-900 dark:text-slate-300">{rv.ramGb}GB</span>
                            </span>
                          )}
                          {rv.storageGb && (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-slate-900">Bộ nhớ:</span>
                              <span className="font-medium text-slate-900 dark:text-slate-300">{rv.storageGb}GB</span>
                            </span>
                          )}
                          {rv.quantity && (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-slate-900">SL:</span>
                              <span className="font-medium text-slate-900 dark:text-slate-300">{rv.quantity}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="mt-1 text-sm font-semibold text-amber-500">
                      {"★".repeat(Math.max(0, Math.min(5, Number(rv.rating) || 0)))}
                      <span className="ml-1 text-slate-900 dark:text-slate-200">
                        ({formatAverageRating(Number(rv.rating) || 0)})
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-900 dark:text-slate-200">
                      {rv.content || "(Không có bình luận)"}
                    </p>
                    {/* Hiển thị ảnh đánh giá */}
                    {rv.images && rv.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rv.images.map((img) => (
                          <a
                            key={img.evaluateImageId}
                            href={resolveImageUrl(img.imageUrl) || img.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block overflow-hidden rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl border border-black/5 dark:border-white/10"
                          >
                            <img
                              src={resolveImageUrl(img.imageUrl) || img.imageUrl}
                              alt="Review"
                              className="max-h-40 w-auto object-contain transition-transform duration-300"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    {/* Hiển thị phản hồi của admin */}
                    {rv.adminReply && (
                      <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 dark:border-indigo-500/30 dark:bg-indigo-500/10">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white dark:bg-indigo-400 dark:text-indigo-950">
                            A
                          </span>
                          <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-200">Phản hồi từ Shop</span>
                          <span className="text-xs text-indigo-600/70 dark:text-indigo-300/70">{formatDate(rv.adminRepliedAt)}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm text-indigo-900 dark:text-indigo-100">
                          {rv.adminReply}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {portalReady
        ? createPortal(
          <div className="fixed inset-x-0 bottom-6 z-[90] px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="customer-card-surface mx-auto flex w-full max-w-4xl gap-3 rounded-[2rem] border-2 border-zinc-500/70 bg-zinc-900/90 p-3 shadow-2xl shadow-black/40 ring-1 ring-zinc-500/40 backdrop-blur-xl sm:gap-4"
            >
              <button
                type="button"
                onClick={(e) => addToCartOnly(e.currentTarget)}
                disabled={isOutOfStock}
                className={
                  "inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-zinc-500/70 bg-zinc-800/70 px-6 text-sm font-bold text-zinc-100 shadow-md shadow-black/20 ring-1 ring-zinc-500/35 transition " +
                  (isOutOfStock
                    ? "cursor-not-allowed opacity-30 grayscale blur-[0.5px] pointer-events-none"
                    : "cursor-pointer hover:border-purple-500/55 hover:bg-zinc-700/90 hover:text-purple-200 hover:ring-purple-500/30 active:scale-[0.98]")
                }
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Thêm vào giỏ
              </button>
              <button
                type="button"
                onClick={() => addToCartAndGo()}
                disabled={isOutOfStock}
                className={
                  "inline-flex h-14 flex-[1.5] items-center justify-center rounded-2xl border-2 border-purple-500/60 bg-gradient-to-r from-purple-600 to-indigo-600 px-6 text-sm font-bold text-white shadow-xl shadow-purple-600/30 ring-1 ring-purple-400/40 transition " +
                  (isOutOfStock
                    ? "cursor-not-allowed opacity-30 grayscale blur-[0.5px] pointer-events-none"
                    : "cursor-pointer hover:border-purple-400/80 hover:shadow-2xl hover:shadow-purple-500/35 active:scale-[0.98]")
                }
              >
                Mua ngay bây giờ
              </button>
            </motion.div>
          </div>,
          document.body
        )
        : null}

      <ProductVariantPickerModal
        open={variantModalOpen}
        product={product}
        onClose={() => setVariantModalOpen(false)}
        confirmText={pendingAction === "buy" ? "Đặt hàng" : "Thêm vào giỏ hàng"}
        onConfirm={async (selection) => {
          if (!product) return;
          if (pendingAction === "buy") {
            void buyNowWithSelection({
              productColorId: selection.productColorId,
              productVariantId: selection.productVariantId,
              colorName: selection.colorName,
              ramGb: selection.ramGb,
              storageGb: selection.storageGb,
              imageUrl: selection.imageUrl,
              quantity: selection.quantity,
              price: selection.price,
            });
            return;
          }

          await addProductToCart({
            productId: product.productId,
            productName: product.productName,
            price: selection.price,
            quantity: selection.quantity,
            productVariantId: selection.productVariantId,
            productColorId: selection.productColorId,
            ramGb: selection.ramGb,
            storageGb: selection.storageGb,
            colorName: selection.colorName,
            imageUrl: selection.imageUrl,
          });

          if (lastActionButtonEl) {
            flyProductToCart(lastActionButtonEl, resolveImageUrl(selection.imageUrl));
          }
          
          // Show success modal
          setShowSuccessModal(true);
          setTimeout(() => {
            setShowSuccessModal(false);
          }, 2000);
        }}
      />

      {/* Success Modal */}
      {portalReady && showSuccessModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div
            onClick={() => setShowSuccessModal(false)}
            style={{ 
              backgroundColor: "rgba(15, 23, 42, 0.7)", 
              backdropFilter: "blur(6px)", 
              WebkitBackdropFilter: "blur(6px)" 
            }}
            className="absolute inset-0"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2.5rem]"
            style={{ 
              background: "rgba(255,255,255,0.08)", 
              backdropFilter: "blur(20px)", 
              WebkitBackdropFilter: "blur(20px)", 
              border: "1px solid rgba(255,255,255,0.15)", 
              boxShadow: "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
              animation: "avatarModalScaleIn 180ms ease-out"
            }}
          >
            <div className="p-8">
              <div className="flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-400/50"
                >
                  <svg className="h-10 w-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <h3 className="text-2xl font-black tracking-tight text-white/95">
                  Thêm vào giỏ hàng thành công!
                </h3>
                <p className="mt-3 text-sm text-white/70">
                  Sản phẩm đã được thêm vào giỏ hàng của bạn.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                  className="mt-8 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 text-sm font-black text-white shadow-xl shadow-emerald-500/30 transition hover:shadow-2xl hover:shadow-emerald-500/40 active:scale-[0.98]"
                >
                  Đóng
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
