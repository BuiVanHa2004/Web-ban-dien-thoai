"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { createPortal } from "react-dom";

import { categoryService, type CategoryDto } from "@/services/categoryService";
import { brandService, type BrandDto } from "@/services/brandService";
import { productService, type ProductDto } from "@/services/productService";
import { addProductToCart, flyProductToCart } from "@/common/cartClient";
import ProductVariantPickerModal from "@/components/customers/ProductVariantPickerModal";
import CustomerProductCard from "@/components/customers/CustomerProductCard";
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

type Option = {
  id: number;
  name: string;
  imageUrl?: string;
};

type CategoryOption = Option;
type BrandOption = Option;

function mapCategory(dto: CategoryDto): CategoryOption {
  return {
    id: dto.categoryId,
    name: dto.categoryName,
  };
}

function mapBrand(dto: BrandDto): BrandOption {
  return {
    id: dto.brandId,
    name: dto.brandName,
    imageUrl: dto.brandImages?.[0],
  };
}

function PromotionBanner() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false }}
      className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 text-white shadow-2xl mb-8"
    >
      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-md">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wider uppercase mb-3 backdrop-blur-md">
              Limited Time Offer
            </span>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Siêu Ưu Đãi Mùa Hè!</h2>
            <p className="mt-2 text-indigo-100">Giảm giá lên đến 50% cho tất cả các dòng sản phẩm mới nhất. Đừng bỏ lỡ cơ hội sở hữu ngay!</p>
          </motion.div>
          <div className="mt-6 flex gap-3">
            <button className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-indigo-600 shadow-lg transition hover:scale-105 active:scale-95 cursor-pointer">
              Mua ngay
            </button>
            <button className="rounded-full border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-bold backdrop-blur-sm transition hover:bg-white/20 cursor-pointer">
              Xem chi tiết
            </button>
          </div>
        </div>
        <div className="hidden md:block">
           <motion.div 
             animate={{ 
               y: [0, -10, 0],
               rotate: [0, 5, 0, -5, 0]
             }}
             transition={{ 
               duration: 6, 
               repeat: Infinity,
               ease: "easeInOut" 
             }}
             className="h-40 w-40 rounded-full bg-gradient-to-tr from-white/30 to-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl"
           >
              <div className="text-center">
                <span className="block text-4xl font-black">50%</span>
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">Off Now</span>
              </div>
           </motion.div>
        </div>
      </div>
      
      {/* Decorative blobs */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
      <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-full bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px] opacity-20" />
    </motion.div>
  );
}

export default function ProductPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = React.useState<ProductDto[]>([]);
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);
  const [brands, setBrands] = React.useState<BrandOption[]>([]);

  const [openDropdown, setOpenDropdown] = React.useState<"category" | "brand" | null>(null);
  const brandButtonRef = React.useRef<HTMLButtonElement>(null);
  const [brandDropdownPos, setBrandDropdownPos] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const [recentlyAddedProductIds, setRecentlyAddedProductIds] = React.useState<number[]>([]);
  const [selectedProductForCart, setSelectedProductForCart] = React.useState<ProductDto | null>(null);
  const [variantModalOpen, setVariantModalOpen] = React.useState(false);
  const [lastAddButtonEl, setLastAddButtonEl] = React.useState<HTMLElement | null>(null);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const filters = React.useMemo(() => {
    const q = (searchParams.get("q") ?? "").trim();
    const categoryId = searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : null;
    const brandId = searchParams.get("brandId") ? Number(searchParams.get("brandId")) : null;
    const sort = (searchParams.get("sort") ?? "category") as "category" | "name";
    return { q, categoryId, brandId, sort };
  }, [searchParams]);

  const returnUrl = React.useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const [draftQ, setDraftQ] = React.useState(filters.q);
  // Sync draftQ khi URL thay đổi từ bên ngoài
  React.useEffect(() => {
    setDraftQ(filters.q);
  }, [filters.q]);
  const [searchSuggestions, setSearchSuggestions] = React.useState<ProductDto[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const productsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [c, b, p] = await Promise.all([
          categoryService.getAll(),
          brandService.getAll(),
          productService.getAll(), // fetch tất cả, filter client-side
        ]);
        if (!mounted) return;
        setCategories(c.map(mapCategory).sort((a, b) => a.id - b.id));
        setBrands(b.map(mapBrand).sort((a, b) => a.name.localeCompare(b.name)));
        setProducts(p);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra khi tải sản phẩm.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Search suggestions — lọc client-side từ danh sách đã load
  React.useEffect(() => {
    const q = draftQ.trim().toLowerCase();
    if (!q || q.length < 1) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const matched = products
      .filter((p) => p.productName?.toLowerCase().includes(q))
      .slice(0, 8);
    setSearchSuggestions(matched);
    setShowSuggestions(matched.length > 0);
  }, [draftQ, products]);

  // Click outside để đóng suggestions
  React.useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Click outside để đóng brand dropdown (portal) — dùng click thay mousedown
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      const isBrandButton = brandButtonRef.current?.contains(target);
      // Kiểm tra xem click có nằm trong portal dropdown không
      const portalEl = document.getElementById('brand-dropdown-portal');
      const isInPortal = portalEl?.contains(target);
      if (!isBrandButton && !isInPortal && openDropdown === "brand") {
        closeDropdowns();
      }
    }
    if (openDropdown === "brand") {
      // Dùng setTimeout để tránh đóng ngay khi mở
      const timer = setTimeout(() => {
        document.addEventListener("click", onClick);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("click", onClick);
      };
    }
  }, [openDropdown]);

  function setParam(next: {
    q?: string;
    categoryId?: number | null;
    brandId?: number | null;
    sort?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.q !== undefined) {
      const v = next.q.trim();
      if (v) params.set("q", v);
      else params.delete("q");
    }

    if (next.categoryId !== undefined) {
      if (next.categoryId == null) params.delete("categoryId");
      else params.set("categoryId", String(next.categoryId));
    }

    if (next.brandId !== undefined) {
      if (next.brandId == null) params.delete("brandId");
      else params.set("brandId", String(next.brandId));
    }

    if (next.sort !== undefined) {
      if (!next.sort) params.delete("sort");
      else params.set("sort", next.sort);
    }

    const query = params.toString();
    router.replace(query ? `/product?${query}` : "/product");

    // Scroll xuống khu vực sản phẩm khi lọc
    if (next.categoryId !== undefined || next.brandId !== undefined || next.q !== undefined) {
      setTimeout(() => {
        productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }

  const productSections = React.useMemo(() => {
    const byName = (a: ProductDto, b: ProductDto) => {
      const na = (a.productName ?? "").toLowerCase();
      const nb = (b.productName ?? "").toLowerCase();
      if (na < nb) return -1;
      if (na > nb) return 1;
      return 0;
    };

    const orderItems = (items: ProductDto[]) => [...items].sort(filters.sort === "name" ? byName : byName);

    // Áp dụng tất cả filter client-side
    const filteredProducts = products.filter((p) => {
      if (filters.brandId != null && Number(p.brandId) !== Number(filters.brandId)) return false;
      if (filters.categoryId != null && Number(p.categoryId) !== Number(filters.categoryId)) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        if (!p.productName?.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const categoriesSorted = [...categories].sort((a, b) => a.id - b.id);

    const sections: { key: string; title: string; items: ProductDto[] }[] = [];

    for (const cat of categoriesSorted) {
      const items = filteredProducts.filter((p) => p.categoryId === cat.id);
      if (items.length === 0) continue;
      sections.push({ key: String(cat.id), title: cat.name, items: orderItems(items) });
    }

    const knownIds = new Set(categoriesSorted.map((c) => c.id));
    const others = filteredProducts.filter((p) => p.categoryId == null || !knownIds.has(p.categoryId));
    if (others.length > 0) {
      sections.push({ key: "others", title: "Khác", items: orderItems(others) });
    }

    return sections;
  }, [products, filters.sort, filters.brandId, filters.categoryId, filters.q, categories]);

  function closeDropdowns() {
    setOpenDropdown(null);
    setBrandDropdownPos(null);
  }

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
    <div className="min-h-screen overflow-hidden rounded-2xl customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/40 p-3 shadow-xl shadow-black/20 transition-colors duration-500 sm:rounded-[2.5rem] sm:p-6 lg:p-8" onClick={closeDropdowns}>
      <div className="space-y-8 sm:space-y-12">
        <PromotionBanner />
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Sản phẩm</h1>
            <p className="mt-1 text-sm text-slate-400">
              Hiển thị {products.filter((p) => {
                if (filters.brandId != null && Number(p.brandId) !== Number(filters.brandId)) return false;
                if (filters.categoryId != null && Number(p.categoryId) !== Number(filters.categoryId)) return false;
                if (filters.q && !p.productName?.toLowerCase().includes(filters.q.toLowerCase())) return false;
                return true;
              }).length} sản phẩm
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search với suggestions */}
            <div className="sm:col-span-2 relative" ref={searchRef} onClick={(e) => e.stopPropagation()}>
              <div className="group flex overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-md shadow-black/20 backdrop-blur-md transition hover:shadow-lg sm:rounded-3xl">
                <input
                  value={draftQ}
                  onChange={(e) => { setDraftQ(e.target.value); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { setParam({ q: draftQ }); setShowSuggestions(false); }
                    if (e.key === "Escape") setShowSuggestions(false);
                  }}
                  onFocus={() => { if (searchSuggestions.length > 0) setShowSuggestions(true); }}
                  placeholder="Tìm theo tên sản phẩm..."
                  className="h-11 w-full min-w-0 bg-transparent pl-4 pr-2 text-sm text-white outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => { setParam({ q: draftQ }); setShowSuggestions(false); }}
                  className="grid h-11 w-12 place-items-center text-cyan-300 transition hover:bg-white/10 cursor-pointer"
                  aria-label="Tìm kiếm"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 21l-4.3-4.3" /><circle cx="11" cy="11" r="7" />
                  </svg>
                </button>
              </div>
              {/* Suggestions dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/40">
                  {searchSuggestions.map((p) => {
                    const img = resolveImageUrl(p.productMainImage || p.productImages?.[0]?.imageUrl || p.productColors?.[0]?.images?.[0]);

                    // Tất cả tên màu
                    const colorNames = (p.productColors || []).map(c => c.colorName).filter(Boolean);

                    // Tổng số lượng
                    const totalQty = (p.productColors || []).reduce((sum, c) => {
                      const variants = c.variants || [];
                      return sum + (variants.length > 0
                        ? variants.reduce((s, v) => s + (Number(v.quantity) || 0), 0)
                        : (Number(c.quantity) || 0));
                    }, 0);

                    // Giá min - max từ tất cả variants (finalPrice > 0 ưu tiên, fallback originalPrice)
                    const allPrices = (p.productColors || [])
                      .flatMap(c => c.variants || [])
                      .map(v => Number(v.finalPrice) > 0 ? Number(v.finalPrice) : Number(v.originalPrice))
                      .filter(n => n > 0);
                    const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : (p.currentPrice ?? p.basePrice ?? 0);
                    const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : minPrice;
                    const fmt = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

                    return (
                      <Link
                        key={p.productId}
                        href={`/product/${p.productId}`}
                        onClick={() => setShowSuggestions(false)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0"
                      >
                        {img ? (
                          <img src={img} alt="" className="h-12 w-9 rounded-xl object-cover shrink-0 ring-1 ring-white/10" />
                        ) : (
                          <div className="h-12 w-9 rounded-xl bg-white/10 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white">{p.productName}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {p.brandName && (
                              <span className="text-[10px] text-indigo-300 font-medium">{p.brandName}</span>
                            )}
                            {p.categoryName && (
                              <span className="text-[10px] text-slate-400">{p.categoryName}</span>
                            )}
                            {colorNames.length > 0 && (
                              <span className="text-[10px] text-pink-300">
                                {colorNames.join(" · ")}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500">Kho: {totalQty}</span>
                          </div>
                          {minPrice > 0 && (
                            <div className="mt-0.5 text-[11px] font-bold text-emerald-400">
                              {minPrice === maxPrice
                                ? fmt(minPrice)
                                : `${fmt(minPrice)} - ${fmt(maxPrice)}`}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOpenDropdown((v) => (v === "category" ? null : "category"))}
                className="flex h-11 w-full items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-white shadow-md backdrop-blur-md transition hover:bg-white/10 cursor-pointer"
              >
                <span className="truncate">{categories.find((c) => c.id === filters.categoryId)?.name || "Tất cả danh mục"}</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {openDropdown === "category" && (
                <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl">
                  <button
                    type="button"
                    onClick={() => { setParam({ categoryId: null }); closeDropdowns(); }}
                    className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition hover:bg-white/10 cursor-pointer ${filters.categoryId == null ? "text-cyan-400 font-semibold" : "text-slate-200"}`}
                  >
                    Tất cả danh mục
                  </button>
                  <div className="max-h-60 overflow-auto">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setParam({ categoryId: c.id }); closeDropdowns(); }}
                        className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition hover:bg-white/10 cursor-pointer ${filters.categoryId === c.id ? "text-cyan-400 font-semibold" : "text-slate-200"}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Brand dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                ref={brandButtonRef}
                onClick={() => {
                  if (openDropdown === "brand") {
                    setOpenDropdown(null);
                    setBrandDropdownPos(null);
                  } else {
                    setOpenDropdown("brand");
                    if (brandButtonRef.current) {
                      const rect = brandButtonRef.current.getBoundingClientRect();
                      setBrandDropdownPos({
                        top: rect.bottom + 8,   // fixed: không cộng scrollY
                        left: rect.left,
                        width: rect.width,
                      });
                    }
                  }
                }}
                className="flex h-11 w-full items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-white shadow-md backdrop-blur-md transition hover:bg-white/10 cursor-pointer"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {filters.brandId && brands.find((b) => b.id === filters.brandId)?.imageUrl && (
                    <img
                      src={resolveImageUrl(brands.find((b) => b.id === filters.brandId)!.imageUrl) || ""}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover shrink-0"
                    />
                  )}
                  <span className="truncate">{brands.find((b) => b.id === filters.brandId)?.name || "Tất cả thương hiệu"}</span>
                </div>
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {openDropdown === "brand" && brandDropdownPos && typeof window !== "undefined" && createPortal(
                <div
                  id="brand-dropdown-portal"
                  style={{
                    position: "fixed",
                    top: brandDropdownPos.top,
                    left: brandDropdownPos.left,
                    width: Math.max(brandDropdownPos.width, 200),
                    zIndex: 9999,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl">
                    <button
                      type="button"
                      onClick={() => { setParam({ brandId: null }); closeDropdowns(); setBrandDropdownPos(null); }}
                      className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition hover:bg-white/10 cursor-pointer ${filters.brandId == null ? "text-cyan-400 font-semibold" : "text-slate-200"}`}
                    >
                      Tất cả thương hiệu
                    </button>
                    <div className="max-h-60 overflow-y-auto">
                      {brands.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => { setParam({ brandId: b.id }); closeDropdowns(); setBrandDropdownPos(null); }}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-white/10 cursor-pointer ${filters.brandId === b.id ? "text-cyan-400 font-semibold" : "text-slate-200"}`}
                        >
                          {b.imageUrl ? (
                            <img src={resolveImageUrl(b.imageUrl) || ""} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-white/10 shrink-0" />
                          )}
                          {b.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>


        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-900 dark:text-slate-300">
            Sắp xếp:
            <button
              type="button"
              onClick={() => setParam({ sort: "category" })}
              className={`ml-2 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${filters.sort === "category"
                ? "bg-cyan-600 text-white"
                : "bg-white/70 text-slate-800 hover:bg-white dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                }`}
            >
              Theo loại danh mục
            </button>
            <button
              type="button"
              onClick={() => setParam({ sort: "name" })}
              className={`ml-2 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${filters.sort === "name"
                ? "bg-cyan-600 text-white"
                : "bg-white/70 text-slate-800 hover:bg-white dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                }`}
            >
              Theo tên
            </button>
          </div>

          {(filters.q || filters.categoryId) && (
            <button
              type="button"
              onClick={() => {
                setDraftQ("");
                setParam({ q: "", categoryId: null, sort: "category" });
              }}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 dark:bg-white/10 dark:text-white dark:ring-white/10 dark:hover:bg-white/15 cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="rounded-3xl bg-slate-50 p-12 text-center dark:bg-slate-900/30 border border-black/5 dark:border-white/10">
            <p className="text-lg text-slate-900 dark:text-slate-300">Không tìm thấy sản phẩm phù hợp.</p>
          </div>
        )}

        {loading ? (
          <div ref={productsRef} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 scroll-mt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="mx-auto w-full max-w-[220px] rounded-3xl border border-black/5 bg-white/60 dark:border-white/10 dark:bg-white/5 overflow-hidden shadow-sm animate-pulse"
              >
                <div className="w-full aspect-9/16 bg-slate-200 dark:bg-slate-800" />
                <div className="p-3 space-y-2">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-4/5" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/5" />
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div ref={productsRef} className="space-y-12 scroll-mt-4">
            {productSections.map((section) => (
              <section key={section.key} className="pt-8 first:pt-0">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white border-t border-black/10 dark:border-white/10 pt-8 mb-8 first:border-none first:pt-0">
                  {section.title}
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.items.map((p) => (
                    <CustomerProductCard
                      key={p.productId}
                      product={p}
                      returnUrl={returnUrl}
                      onAddToCart={handleAddToCart}
                      isRecentlyAdded={recentlyAddedProductIds.includes(p.productId)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      <ProductVariantPickerModal
        open={variantModalOpen}
        product={selectedProductForCart}
        onClose={() => setVariantModalOpen(false)}
        onConfirm={async (selection) => {
          if (!selectedProductForCart) return;
          await addProductToCart({
            productId: selectedProductForCart.productId,
            productName: selectedProductForCart.productName,
            price: computeCurrentPrice(selectedProductForCart),
            quantity: selection.quantity,
            productVariantId: selection.productVariantId,
            productColorId: selection.productColorId,
            ramGb: selection.ramGb,
            storageGb: selection.storageGb,
            colorName: selection.colorName,
            imageUrl: selection.imageUrl,
          });
          if (lastAddButtonEl) flyProductToCart(lastAddButtonEl, selection.imageUrl);
          setRecentlyAddedProductIds((prev) =>
            prev.includes(selectedProductForCart.productId) ? prev : [...prev, selectedProductForCart.productId]
          );
          window.setTimeout(() => {
            setRecentlyAddedProductIds((prev) => prev.filter((id) => id !== selectedProductForCart.productId));
          }, 1300);
          
          // Show success modal
          setShowSuccessModal(true);
          setTimeout(() => {
            setShowSuccessModal(false);
          }, 2000);
        }}
      />

      {/* Success Modal */}
      {typeof window !== "undefined" && showSuccessModal && createPortal(
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
