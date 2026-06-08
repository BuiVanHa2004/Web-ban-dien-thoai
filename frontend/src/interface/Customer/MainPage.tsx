"use client";

import Link from "next/link";
import {
  motion,
  useInView,
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { compareProductsByCategoryThenName } from "@/common/categoryDisplayOrder";
import type { User } from "@/common/types/auth";
import { newsService, type NewsDto } from "@/services/newsService";
import { brandService, type BrandDto } from "@/services/brandService";
import { categoryService, type CategoryDto } from "@/services/categoryService";
import { productService, type ProductDto } from "@/services/productService";
import { bannerService, type BannerDto } from "@/services/bannerService";
import { addProductToCart, flyProductToCart } from "@/common/cartClient";
import ProductVariantPickerModal from "@/components/customers/ProductVariantPickerModal";
import CustomerProductCard from "@/components/customers/CustomerProductCard";
import SocialQrContact from "@/components/customers/SocialQrContact";
import CustomerBannerCarousel from "@/components/customers/CustomerBannerCarousel";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

function resolveImageUrl(input?: any): string | undefined {
  if (typeof input !== 'string') return undefined;
  const raw = input.trim();
  if (!raw) return undefined;
  if (/^(https?:)?\/\//i.test(raw)) return raw;
  if (/^(data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_URL}${raw}`;
  return `${API_URL}/${raw}`;
}

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

function getProductStockQuantity(product: ProductDto): number {
  return (product.productColors || []).reduce((sum, color) => {
    const variants = color.variants || [];
    if (variants.length > 0) {
      const variantQty = variants.reduce((s, v) => s + (Number(v.quantity) || 0), 0);
      return sum + variantQty;
    }
    return sum + (Number(color.quantity) || 0);
  }, 0);
}

function getProductPreviewImage(p: ProductDto): string | null {
  return (
    p.productMainImage ||
    p.productImages?.[0]?.imageUrl ||
    p.productColors?.[0]?.images?.[0] ||
    null
  );
}

/** Easing mượt — chỉ opacity + translate (GPU). */
const SMOOTH_EASE = [0.22, 1, 0.36, 1] as const;
const ENTER_DURATION = 0.55;
const EXIT_DURATION = 0.35;

type MainPageBodyVariant = "hero" | "banner" | "brands" | "categories" | "products" | "news";

/** Mỗi body một kiểu chuyển động riêng; cuộn lên/xuống đều chạy lại. */
const BODY_MOTION: Record<
  MainPageBodyVariant,
  { hidden: TargetAndTransition; visible: TargetAndTransition }
> = {
  hero: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  },
  banner: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  },
  brands: {
    hidden: { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0 },
  },
  categories: {
    hidden: { opacity: 0, x: 16 },
    visible: { opacity: 1, x: 0 },
  },
  products: {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0 },
  },
  news: {
    hidden: { opacity: 0, y: -12 },
    visible: { opacity: 1, y: 0 },
  },
};

const REDUCED_MOTION = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

function ScrollRevealBody({
  id,
  variant,
  children,
  className = "",
}: {
  id?: string;
  variant: MainPageBodyVariant;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isInView = useInView(ref, {
    once: false,
    amount: variant === "hero" ? 0.04 : 0.06,
    margin: "0px 0px -24px 0px",
  });

  const motionPreset = prefersReducedMotion ? REDUCED_MOTION : BODY_MOTION[variant];
  const transition: Transition = prefersReducedMotion
    ? { duration: 0.2, ease: "easeOut" }
    : {
        duration: isInView ? ENTER_DURATION : EXIT_DURATION,
        ease: SMOOTH_EASE,
      };

  return (
    <motion.section
      id={id}
      ref={ref}
      initial={false}
      animate={isInView ? motionPreset.visible : motionPreset.hidden}
      transition={transition}
      style={{ willChange: "opacity, transform" }}
      className={[className, "backface-hidden"].filter(Boolean).join(" ")}
    >
      {children}
    </motion.section>
  );
}

const SkeletonCard = () => (
  <div className="mx-auto w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 shadow-sm animate-pulse sm:max-w-[220px] sm:rounded-3xl">
    <div className="aspect-9/16 w-full bg-slate-800" />
    <div className="space-y-2 p-3">
      <div className="h-5 w-4/5 rounded bg-slate-700" />
      <div className="h-4 w-3/5 rounded bg-slate-700" />
      <div className="h-6 w-2/5 rounded bg-slate-700" />
    </div>
  </div>
);

export default function MainPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [brands, setBrands] = useState<BrandDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [news, setNews] = useState<NewsDto[]>([]);
  const [banners, setBanners] = useState<BannerDto[]>([]);
  
  const flattenedBannerImages = useMemo(() => {
    const list: Array<{
      imageUrl: string;
      title: string;
      subtitle?: string | null;
      linkUrl?: string | null;
      bannerId: number;
    }> = [];
    banners.forEach((b) => {
      (b.bannerImages || []).forEach((img) => {
        list.push({
          imageUrl: img.imageUrl,
          title: img.title || "",
          subtitle: img.subtitle,
          linkUrl: img.linkUrl,
          bannerId: b.bannerId,
        });
      });
    });
    return list;
  }, [banners]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBrandId, setHoveredBrandId] = useState<number | null>(null);
  const [recentlyAddedProductIds, setRecentlyAddedProductIds] = useState<number[]>([]);
  const [selectedProductForCart, setSelectedProductForCart] = useState<ProductDto | null>(null);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [lastAddButtonEl, setLastAddButtonEl] = useState<HTMLElement | null>(null);
  const [brandFxEnabled, setBrandFxEnabled] = useState(false);

  const brandViewportRef = useRef<HTMLDivElement | null>(null);
  const brandItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const brandRafRef = useRef<number | null>(null);
  const brandSectionVisible = useRef(false);
  /** Cố định seed để SSR và client khớp nhau (tránh hydration mismatch). */
  const BRAND_SHUFFLE_SEED = 0x9e3779b9;
  const [mounted, setMounted] = useState(false);

  const returnUrl = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  function scrollToProducts() {
    const el = document.getElementById("products");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSelectBrand(brandId: number) {
    const nextParams = new URLSearchParams(searchParams.toString());
    const current = searchParams.get("brandId") ? Number(searchParams.get("brandId")) : null;

    if (current === brandId) nextParams.delete("brandId");
    else nextParams.set("brandId", String(brandId));

    const href = `${pathname}?${nextParams.toString()}#products`;
    router.push(href);

    // Ensure scroll even when Next doesn't auto-scroll on query updates.
    window.requestAnimationFrame(scrollToProducts);
  }

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("user");
      setUser(raw ? (JSON.parse(raw) as User) : null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [p, n, b, c, ban] = await Promise.all([
          productService.getAll(),
          newsService.getAll(),
          brandService.getAll(),
          categoryService.getAll(),
          bannerService.getAll(),
        ]);
        if (!mounted) return;
        setProducts(p);
        setNews(n);
        setBrands(Array.from(new Map(b.map((x) => [x.brandId, x])).values()));
        setCategories(Array.from(new Map(c.map((x) => [x.categoryId, x])).values()));
        setBanners((ban || []).filter(item => item.isActive));
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra khi tải dữ liệu.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);


  const filters = useMemo(() => {
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const brandId = searchParams.get("brandId") ? Number(searchParams.get("brandId")) : null;
    const categoryId = searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : null;
    return { q, brandId, categoryId };
  }, [searchParams]);

  const selectedBrandName = useMemo(() => {
    if (filters.brandId == null) return null;
    return brands.find((b) => b.brandId === filters.brandId)?.brandName ?? null;
  }, [brands, filters.brandId]);

  const selectedCategoryName = useMemo(() => {
    if (filters.categoryId == null) return null;
    return categories.find((c) => c.categoryId === filters.categoryId)?.categoryName ?? null;
  }, [categories, filters.categoryId]);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      if (filters.brandId !== null && p.brandId !== filters.brandId) return false;
      if (filters.categoryId !== null && p.categoryId !== filters.categoryId) return false;
      if (filters.q && !(p.productName ?? "").toLowerCase().includes(filters.q)) return false;
      return true;
    });
    return [...filtered].sort(compareProductsByCategoryThenName);
  }, [products, filters]);

  const finalBrands = useMemo(() => {
    const pinnedSlots: Array<{ index0: number; brandId: number }> = [
      { index0: 2, brandId: 2 }, // vị trí thứ 3
      { index0: 3, brandId: 1 }, // vị trí thứ 4
      { index0: 4, brandId: 4 }, // vị trí thứ 5
    ];

    const pinnedIds = new Set<number>(pinnedSlots.map((x) => x.brandId));
    const rest = brands.filter((b) => !pinnedIds.has(b.brandId));

    const mulberry32 = (seed: number) => {
      let a = seed >>> 0;
      return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    const rand = mulberry32(BRAND_SHUFFLE_SEED);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }

    const result: BrandDto[] = [];
    const ensureLength = (n: number) => {
      while (result.length < n) result.push(null as unknown as BrandDto);
    };

    for (const slot of pinnedSlots) {
      const b = brands.find((x) => x.brandId === slot.brandId);
      if (!b) continue;
      ensureLength(slot.index0 + 1);
      result[slot.index0] = b;
    }

    let r = 0;
    for (let i = 0; i < result.length; i++) {
      if (result[i] != null) continue;
      if (r >= rest.length) break;
      result[i] = rest[r++];
    }

    while (r < rest.length) result.push(rest[r++]);
    return result.filter(Boolean);
  }, [brands]);

  const sortedNews = useMemo(() => {
    return [...news].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  }, [news]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => {
      const enabled = mq.matches;
      setBrandFxEnabled(enabled);
      if (!enabled) {
        for (const el of brandItemRefs.current) {
          if (!el) continue;
          el.style.transform = "";
          el.style.opacity = "";
          el.style.zIndex = "";
        }
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!brandFxEnabled) return;
    if (!brandViewportRef.current) return;
    if (brands.length === 0) return;

    const viewport = brandViewportRef.current;

    // Chỉ chạy RAF khi section brand đang trong viewport
    const observer = new IntersectionObserver(
      ([entry]) => { brandSectionVisible.current = entry.isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(viewport);

    const tick = () => {
      brandRafRef.current = window.requestAnimationFrame(tick);

      // Không tính toán nếu section không visible → tiết kiệm CPU khi scroll
      if (!brandSectionVisible.current) return;

      const vpRect = viewport.getBoundingClientRect();
      const centerX = vpRect.left + vpRect.width / 2;
      const maxD = Math.max(1, vpRect.width / 2);

      for (const el of brandItemRefs.current) {
        if (!el) continue;
        const elBrandIdRaw = el.getAttribute("data-brand-id");
        const elBrandId = elBrandIdRaw ? Number(elBrandIdRaw) : null;
        const hovered = elBrandId != null && hoveredBrandId != null && elBrandId === hoveredBrandId;
        const r = el.getBoundingClientRect();
        const itemCenterX = r.left + r.width / 2;
        const d = Math.min(maxD, Math.abs(itemCenterX - centerX));
        const t = d / maxD;
        const ease = 1 - t * t;

        const scale = 0.75 + 0.65 * ease + (hovered ? 0.35 : 0);
        const lift = -24 * ease - (hovered ? 12 : 0);
        el.style.transform = `translateY(${lift}px) scale(${scale})`;
        el.style.opacity = hovered ? "1" : String(0.6 + 0.4 * ease);
        el.style.zIndex = hovered ? "50" : "1";
      }
    };

    brandRafRef.current = window.requestAnimationFrame(tick);
    return () => {
      observer.disconnect();
      if (brandRafRef.current != null) window.cancelAnimationFrame(brandRafRef.current);
      brandRafRef.current = null;
    };
  }, [brands.length, hoveredBrandId, brandFxEnabled]);

  async function handleAddToCart(product: ProductDto, sourceEl?: HTMLElement) {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      window.dispatchEvent(new Event("show-auth-popup"));
      return;
    }
    setSelectedProductForCart(product);
    setLastAddButtonEl(sourceEl ?? null);
    setVariantModalOpen(true);
  }

  return (
    <div className="min-h-screen space-y-8 overflow-x-hidden pb-8 sm:space-y-12 sm:pb-12" style={{ contain: "layout" }}>
      {/* Body 1: Chào mừng / Hero */}
      <ScrollRevealBody
        variant="hero"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800/80 via-[#1a1a1a] to-neutral-900/90 p-4 shadow-inner ring-1 ring-zinc-700/40 sm:rounded-3xl sm:p-6 lg:p-8"
      >
        <div className="mx-auto max-w-7xl py-4 sm:py-8">
          <div className="grid items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-50 sm:mt-4 sm:text-3xl lg:text-4xl">
                {mounted && user ? (
                  <>
                    MyPhone Store - Xin chào,
                    <br />
                    <span className="text-zinc-300">{user.name}</span>
                  </>
                ) : (
                  "MyPhone Store - Chào mừng bạn"
                )}
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                {mounted && user
                  ? "Chúc bạn mua sắm vui vẻ hôm nay."
                  : "Đăng nhập để nhận gợi ý cá nhân hóa, ưu đãi và theo dõi đơn hàng."}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    scrollToProducts();
                  }}
                  className="inline-flex items-center justify-center rounded-2xl bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg shadow-black/20 transition-all hover:bg-white active:scale-95"
                >
                  Xem sản phẩm
                </button>

                {mounted && !user && (
                  <>
                    <Link
                      href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
                      className="inline-flex items-center justify-center rounded-2xl bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg shadow-black/20"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      href={`/register?returnUrl=${encodeURIComponent(returnUrl)}`}
                      className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white/70 px-5 py-2.5 text-sm font-semibold text-slate-900 backdrop-blur-sm hover:bg-white dark:border-white/25 dark:bg-slate-900/40 dark:text-white"
                    >
                      Tạo tài khoản
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 backdrop-blur-sm">
                  Hàng chính hãng
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 backdrop-blur-sm">
                  Giao nhanh
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 backdrop-blur-sm">
                  Hỗ trợ 24/7
                </span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-3 shadow-xl shadow-black/30 backdrop-blur-sm sm:rounded-3xl sm:p-4">
                <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-zinc-500/10 blur-2xl" />
                <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-neutral-500/8 blur-2xl" />

                <div className="relative">
                  <div className="text-sm font-semibold text-white">Gợi ý nhanh</div>
                  <div className="mt-3 grid gap-2">
                    <Link
                      href={`/product?returnUrl=${encodeURIComponent(returnUrl)}`}
                      className="group rounded-2xl border border-black/5 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>Xem tất cả sản phẩm</span>
                        <span className="text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-slate-500">→</span>
                      </div>
                    </Link>
                    <Link
                      href={`/product?returnUrl=${encodeURIComponent(returnUrl)}`}
                      className="group rounded-2xl border border-black/15 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-white dark:border-white/25 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>Tìm kiếm sản phẩm</span>
                        <span className="text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-slate-500">→</span>
                      </div>
                    </Link>
                    <Link
                      href={`/contact?returnUrl=${encodeURIComponent(returnUrl)}`}
                      onClick={(e) => {
                        const token = localStorage.getItem("token");
                        const user = localStorage.getItem("user");
                        if (!token || !user) {
                          e.preventDefault();
                          window.dispatchEvent(new Event("show-auth-popup"));
                        }
                      }}
                      className="group rounded-2xl border border-zinc-600/50 bg-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-100 shadow-lg shadow-black/20 transition hover:bg-zinc-600"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>Liên hệ hỗ trợ</span>
                        <span className="text-white/80 transition-transform group-hover:translate-x-0.5">→</span>
                      </div>
                    </Link>
                  </div>

                  {mounted && user && (
                    <div className="mt-4 rounded-2xl border border-zinc-600/40 bg-zinc-800/50 px-3 py-2 text-xs text-zinc-300 backdrop-blur-sm">
                      Mẹo: dùng bộ lọc thương hiệu / danh mục để tìm nhanh sản phẩm phù hợp.
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                    <SocialQrContact title="Liên hệ nhanh qua mạng xã hội" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollRevealBody>

      {/* Body 2: Banner */}
      {flattenedBannerImages.length > 0 && (
        <ScrollRevealBody variant="banner">
          <CustomerBannerCarousel slides={flattenedBannerImages} resolveImageUrl={resolveImageUrl} />
        </ScrollRevealBody>
      )}

      {/* Body 3: Thương hiệu */}
      <ScrollRevealBody variant="brands">
         <div className="mb-4 sm:mb-8">
           <h2 className="text-xl font-bold tracking-tight text-white sm:text-3xl">Các thương hiệu nổi bật</h2>
          <p className="mt-1 text-sm text-slate-400 sm:mt-2 sm:text-base">Khám phá những thương hiệu được yêu thích</p>
        </div>

        {/* Mobile: cuộn ngang, logo đều nhau — không dùng hiệu ứng fisheye */}
        <div className="sm:hidden">
          <div className="flex gap-4 overflow-x-auto px-1 pb-3 pt-2 scrollbar-hide snap-x snap-mandatory">
            {finalBrands.map((b) => (
              <button
                key={b.brandId}
                type="button"
                onClick={() => handleSelectBrand(b.brandId)}
                className="relative h-[68px] w-[68px] shrink-0 snap-center cursor-pointer overflow-hidden rounded-full bg-zinc-200 shadow-md ring-1 ring-zinc-500/25 transition active:scale-95"
                aria-label={b.brandName}
              >
                {b.brandImages && b.brandImages.length > 0 ? (
                  <Image
                    src={resolveImageUrl(b.brandImages[0])!}
                    alt={b.brandName}
                    fill
                    sizes="68px"
                    className="brand-logo-img object-cover"
                    draggable={false}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-lg font-bold text-zinc-600">
                    {(b.brandName || "").slice(0, 1)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: hiệu ứng fisheye phóng to ở giữa (như bản cũ) */}
        <div ref={brandViewportRef} className="relative mt-4 hidden overflow-visible pt-28 pb-20 sm:block">
          <div className="flex w-full flex-wrap items-center justify-center gap-x-12 gap-y-12">
            {finalBrands.map((b, idx) => (
              <div
                key={b.brandId}
                ref={(el) => {
                  brandItemRefs.current[idx] = el;
                }}
                data-brand-id={b.brandId}
                className="group relative h-[84px] w-[84px] shrink-0 cursor-pointer select-none overflow-hidden rounded-full bg-zinc-200 shadow-md ring-1 ring-white/20"
                style={{ transformOrigin: "center center", willChange: "transform, opacity" }}
                role="button"
                tabIndex={0}
                onMouseEnter={() => setHoveredBrandId(b.brandId)}
                onMouseLeave={() => setHoveredBrandId((v) => (v === b.brandId ? null : v))}
                onClick={() => handleSelectBrand(b.brandId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectBrand(b.brandId);
                  }
                }}
              >
                {b.brandImages && b.brandImages.length > 0 ? (
                  <Image
                    src={resolveImageUrl(b.brandImages[0])!}
                    alt={b.brandName}
                    fill
                    sizes="84px"
                    className="brand-logo-img object-cover transition-transform duration-500 group-hover:scale-105"
                    draggable={false}
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-lg font-bold text-zinc-600">
                    {(b.brandName || "").slice(0, 1)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </ScrollRevealBody>

      {/* Body 4: Danh mục */}
      <ScrollRevealBody variant="categories">
         <div className="mb-4 sm:mb-8">
           <h2 className="text-xl font-bold tracking-tight text-white sm:text-3xl">Các danh mục</h2>
          <p className="mt-1 text-sm text-slate-400 sm:mt-2 sm:text-base">Chọn danh mục để lọc sản phẩm nhanh hơn</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c) => {
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.set("categoryId", String(c.categoryId));
            const href = `${pathname}?${nextParams.toString()}#products`;

            return (
              <Link
                key={c.categoryId}
                href={href}
                className="group mx-auto w-full overflow-hidden rounded-2xl customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/25 sm:max-w-[260px] sm:rounded-3xl"
              >
                <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {c.categoryImages && c.categoryImages.length > 0 ? (
                    <Image
                      src={resolveImageUrl(c.categoryImages[0])!}
                      alt={c.categoryName}
                      fill
                      sizes="(max-width: 768px) 100vw, 260px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-slate-400 dark:text-slate-600">No image</div>
                  )}
                  <div className="absolute inset-0 bg-black/35 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>

                <div className="p-4">
                  <div className="truncate text-sm font-semibold text-zinc-100 group-hover:text-zinc-300 transition-colors">
                    {c.categoryName}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                    {c.categoryDescription || ""}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollRevealBody>

      {/* Body 5: Sản phẩm */}
      <ScrollRevealBody id="products" variant="products" className="scroll-mt-24">
        <div className="mb-4 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-xl font-bold tracking-tight text-white sm:text-3xl">Sản phẩm</h2>
              {(filters.q || filters.brandId || filters.categoryId) && (
                <button
                  type="button"
                  onClick={() => {
                    const nextParams = new URLSearchParams(searchParams.toString());
                    nextParams.delete("q");
                    nextParams.delete("brandId");
                    nextParams.delete("categoryId");
                    const href = nextParams.toString() ? `${pathname}?${nextParams.toString()}#products` : `${pathname}#products`;
                    router.push(href);
                    window.requestAnimationFrame(scrollToProducts);
                  }}
                  className="inline-flex h-9 cursor-pointer items-center justify-center rounded-2xl border border-black/10 bg-white/70 px-4 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur-sm transition hover:bg-white hover:shadow-md active:scale-[0.99] dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  Hiển thị toàn bộ sản phẩm
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-400 sm:mt-2 sm:text-base">
              Hiển thị {filteredProducts.length} / {products.length} sản phẩm
            </p>
          </div>
          {loading && <div className="text-slate-500 dark:text-slate-400 animate-pulse">Đang tải sản phẩm...</div>}
        </div>

        {(filters.q || filters.brandId || filters.categoryId) && (
          <div className="mb-6 flex flex-wrap gap-2">
            {filters.q && <span className="rounded-full bg-zinc-800 px-4 py-1.5 text-sm text-zinc-200 ring-1 ring-zinc-600/50">Từ khóa: {filters.q}</span>}
            {filters.brandId && (
              <span className="rounded-full bg-zinc-800 px-4 py-1.5 text-sm text-zinc-200 ring-1 ring-zinc-600/50">
                Thương hiệu: {selectedBrandName || filters.brandId}
              </span>
            )}
            {filters.categoryId && (
              <span className="rounded-full bg-zinc-800 px-4 py-1.5 text-sm text-zinc-200 ring-1 ring-zinc-600/50">
                Danh mục: {selectedCategoryName || filters.categoryId}
              </span>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-3xl bg-rose-50 p-6 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200 border border-rose-200 dark:border-rose-800/50 mb-8">
            {error}
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="rounded-3xl bg-slate-50 p-12 text-center dark:bg-slate-900/30 border border-black/15 dark:border-white/25">
            <p className="text-lg text-slate-600 dark:text-slate-300">Không tìm thấy sản phẩm phù hợp. Hãy thử thay đổi từ khóa hoặc bộ lọc.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : filteredProducts.map((p) => (
                <CustomerProductCard
                  key={p.productId}
                  product={p}
                  returnUrl={returnUrl}
                  onAddToCart={handleAddToCart}
                  isRecentlyAdded={recentlyAddedProductIds.includes(p.productId)}
                  subtitle={[p.brandName, p.categoryName].filter(Boolean).join(" • ")}
                  animate={false}
                />
              ))}
        </div>
      </ScrollRevealBody>

      <ProductVariantPickerModal
        open={variantModalOpen}
        product={selectedProductForCart}
        onClose={() => setVariantModalOpen(false)}
        onConfirm={async (selection) => {
          if (!selectedProductForCart) return;
          await addProductToCart({
            productId: selectedProductForCart.productId,
            productName: selectedProductForCart.productName,
            price: selection.price,
            quantity: selection.quantity,
            productVariantId: selection.productVariantId,
            productColorId: selection.productColorId,
            ramGb: selection.ramGb,
            storageGb: selection.storageGb,
            colorName: selection.colorName,
            imageUrl: selection.imageUrl,
          });
          if (lastAddButtonEl) {
            flyProductToCart(lastAddButtonEl, selection.imageUrl);
          }
          setRecentlyAddedProductIds((prev) =>
            prev.includes(selectedProductForCart.productId) ? prev : [...prev, selectedProductForCart.productId]
          );
          window.setTimeout(() => {
            setRecentlyAddedProductIds((prev) => prev.filter((id) => id !== selectedProductForCart.productId));
          }, 1300);
        }}
      />

      {/* Body 6: Tin tức */}
      <ScrollRevealBody variant="news">
        <div className="mb-4 sm:mb-8">
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-3xl">Tin tức công nghệ mới nhất</h2>
          <p className="mt-1 text-sm text-slate-400 sm:mt-2 sm:text-base">Cập nhật {sortedNews.length} bài viết</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {sortedNews.map((n) => (
            <Link
              key={n.newsId}
              href={`/new/${n.newsId}?returnUrl=${encodeURIComponent(returnUrl)}`}
              className="group mx-auto w-full overflow-hidden rounded-2xl customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/25 sm:max-w-[320px] sm:rounded-3xl"
            >
              <div className="relative aspect-square overflow-hidden">
                {n.newsImages?.[0] ? (
                  <img
                    src={resolveImageUrl(n.newsImages[0])}
                    alt={n.newsTitle}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="grid h-full place-items-center bg-slate-100 dark:bg-slate-800 text-slate-400">News</div>
                )}
                <div className="absolute inset-0 bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-95">
                  <span className="inline-flex items-center justify-center rounded-3xl bg-zinc-100/95 px-5 py-2 text-xs font-semibold text-zinc-900 shadow-lg shadow-black/25">
                    Xem ngay
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="line-clamp-2 text-base font-semibold text-zinc-100 group-hover:text-zinc-300 transition-colors">
                  {n.newsTitle}
                </h3>
                <p className="mt-2 line-clamp-3 text-xs text-slate-600 dark:text-slate-300">
                  {n.newsDescribe || "Đọc thêm để cập nhật thông tin công nghệ mới nhất..."}
                </p>
                <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                  {n.createdAt ? new Date(n.createdAt).toLocaleDateString("vi-VN", { dateStyle: "medium" }) : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </ScrollRevealBody>

    </div>
  );
}
