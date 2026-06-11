"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ProductDto } from "@/services/productService";

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

function resolveImageUrl(input?: string | null): string | undefined {
  if (typeof input !== "string") return undefined;
  const raw = input.trim();
  if (!raw) return undefined;
  if (/^(https?:)?\/\//i.test(raw)) return raw;
  if (/^(data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_URL}${raw}`;
  return `${API_URL}/${raw}`;
}

function getProductPreviewImage(p: ProductDto): string | null {
  return (
    p.productMainImage ||
    p.productImages?.[0]?.imageUrl ||
    p.productColors?.[0]?.images?.[0] ||
    null
  );
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

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

export type CustomerProductCardProps = {
  product: ProductDto;
  returnUrl: string;
  onAddToCart: (product: ProductDto, sourceEl?: HTMLElement) => void;
  isRecentlyAdded: boolean;
  /** Dòng phụ dưới tên (mặc định chỉ danh mục). */
  subtitle?: string;
  animate?: boolean;
};

export default function CustomerProductCard({
  product: p,
  returnUrl,
  onAddToCart,
  isRecentlyAdded,
  subtitle,
  animate = true,
}: CustomerProductCardProps) {
  const stockQuantity = getProductStockQuantity(p);
  const isOut = stockQuantity <= 0;
  const isLow = !isOut && stockQuantity <= 10;
  const previewImage = getProductPreviewImage(p);
  const meta =
    subtitle ??
    (p.categoryName ? String(p.categoryName) : "");

  const card = (
    <Link
      href={`/product/${p.productId}?returnUrl=${encodeURIComponent(returnUrl)}`}
      className={
        "group mx-auto block max-w-[220px] cursor-pointer overflow-hidden rounded-3xl customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/60 shadow-md transition-all duration-300 " +
        (isOut
          ? "opacity-75 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
          : "hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/25")
      }
    >
      <div className="relative aspect-9/16 w-full overflow-hidden bg-zinc-900 cursor-pointer">
        {previewImage ? (
          <Image
            src={resolveImageUrl(previewImage)!}
            alt={p.productName}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 220px"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="grid h-full place-items-center text-zinc-500">No image</div>
        )}

        <div className="absolute inset-0 bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="pointer-events-none absolute inset-0 flex scale-95 items-center justify-center opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
          <span className="inline-flex items-center justify-center rounded-3xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/15">
            Mua ngay
          </span>
        </div>

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {p.discountValue && p.discountValue > 0 && (
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white shadow-md shadow-rose-500/20"
            >
              {p.discountType === "AMOUNT"
                ? `-${formatVnd(Number(p.discountValue))}`
                : `-${p.discountValue}%`}
            </motion.span>
          )}
          {isOut ? (
            <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow-md">
              Hết hàng
            </span>
          ) : isLow ? (
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-md">
              Sắp hết
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-zinc-100 transition-colors group-hover:text-zinc-300">
          {p.productName}
        </h3>
        {meta ? <p className="mt-1 text-xs text-zinc-400">{meta}</p> : null}

        <div className="mt-3">
          <div className="mt-1 text-[11px] text-zinc-500">Tồn kho: {stockQuantity}</div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddToCart(p, e.currentTarget);
          }}
          disabled={isOut}
          className={
            "mt-3 inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-xl px-3 text-xs font-semibold transition " +
            (isOut
              ? "cursor-not-allowed bg-zinc-700 text-zinc-500"
              : isRecentlyAdded
                ? "bg-emerald-600 text-white"
                : "keep-light bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white hover:opacity-95")
          }
        >
          {isOut ? "Hết hàng" : isRecentlyAdded ? "Đã thêm" : "Thêm ngay vào giỏ hàng"}
        </button>
      </div>
    </Link>
  );

  if (!animate) return <div className="w-full">{card}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: false, margin: "-50px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full"
    >
      {card}
    </motion.div>
  );
}
