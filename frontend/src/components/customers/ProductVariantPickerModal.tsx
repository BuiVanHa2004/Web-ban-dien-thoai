"use client";

import React from "react";
import { createPortal } from "react-dom";
import type { ProductDto, ProductVariantDto } from "@/services/productService";

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

function resolveImageUrl(input?: any): string | undefined {
  if (typeof input !== "string") return undefined;
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

type SelectedVariant = {
  productVariantId: number | null;
  productColorId: number | null;
  colorName: string | null;
  ramGb: number | null;
  storageGb: number | null;
  quantity: number;
  price: number;
  imageUrl: string | null;
};

type Props = {
  open: boolean;
  product: ProductDto | null;
  onClose: () => void;
  onConfirm: (value: SelectedVariant) => void;
  confirmText?: string;
};

function getVariantLabel(v: ProductVariantDto) {
  const ram = v.ramGb != null ? `${v.ramGb}GB RAM` : null;
  const rom = v.storageGb != null ? `${v.storageGb}GB` : null;
  return [ram, rom].filter(Boolean).join(" / ") || "Mặc định";
}

export default function ProductVariantPickerModal({
  open,
  product,
  onClose,
  onConfirm,
  confirmText = "Thêm vào giỏ",
}: Props) {
  const hasVariants = (product?.productColors ?? []).some((c) => (c.variants ?? []).length > 0);

  const [selectedColorId, setSelectedColorId] = React.useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = React.useState<number | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [portalReady, setPortalReady] = React.useState(false);

  React.useEffect(() => {
    setPortalReady(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open || !product) return;
    const firstColor = product.productColors?.[0] ?? null;
    const firstVariant = hasVariants ? firstColor?.variants?.[0] ?? null : null;
    setSelectedColorId(firstColor?.productColorId ?? null);
    setSelectedVariantId(firstVariant?.variantId ?? null);
    setQuantity(1);
  }, [open, product, hasVariants]);

  if (!open || !product || !portalReady) return null;

  const selectedColor =
    product.productColors?.find((c) => (c.productColorId ?? null) === (selectedColorId ?? null)) ?? null;
  const variants = selectedColor?.variants ?? [];
  const selectedVariant = variants.find((v) => v.variantId === selectedVariantId) ?? null;
  const selectedImage =
    selectedColor?.images?.[0] ??
    product.productMainImage ??
    product.productImages?.[0]?.imageUrl ??
    null;
  const maxQty = hasVariants
    ? variants.length > 0
      ? Number(selectedVariant?.quantity ?? 0) || 0
      : 0
    : (selectedColor?.variants ?? []).reduce((s, v) => s + (Number(v.quantity) || 0), 0) || (Number(selectedColor?.quantity) || 0);

  const canSubmit = maxQty > 0 && quantity >= 1 && quantity <= maxQty;

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="customer-card-surface flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-zinc-500/70 bg-zinc-900/90 shadow-2xl shadow-black/40 ring-1 ring-zinc-500/35 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="variant-picker-title"
      >
        <div className="overflow-y-auto p-5" style={{ scrollbarWidth: "thin" }}>
          <div className="flex gap-4">
            {/* Image (Left) */}
            <div className="w-24 shrink-0 overflow-hidden rounded-2xl border border-zinc-600/50 bg-zinc-800/50 p-1.5">
              <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-zinc-950/60">
                {(() => {
                  const variantDiscount = selectedVariant?.discountValue && selectedVariant.discountValue > 0;
                  const productDiscount = product.discountValue && product.discountValue > 0;
                  const hasDiscount = variantDiscount || productDiscount;

                  if (hasDiscount) {
                    const type = selectedVariant?.discountType || product.discountType;
                    const val = selectedVariant?.discountValue || product.discountValue || 0;
                    const label = type === "AMOUNT" ? `-${formatVnd(val)}` : `-${val}%`;
                    
                    return (
                      <div className="absolute top-1 right-1 z-10">
                        <div className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white shadow-lg uppercase tracking-tighter">
                          {label}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                {(() => {
                  const url = resolveImageUrl(selectedImage);
                  if (url) {
                    return (
                      <img
                        src={url}
                        alt={product.productName}
                        className={`h-full w-full object-cover transition-transform duration-500 hover:scale-110 ${maxQty <= 0 ? "blur-sm grayscale opacity-60" : ""}`}
                      />
                    );
                  }
                  return (
                    <div className="grid h-full place-items-center text-xs text-zinc-500">
                      No img
                    </div>
                  );
                })()}
                {maxQty <= 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded bg-rose-600/90 px-1 py-0.5 text-[8px] font-black text-white uppercase tracking-tighter">
                      Hết hàng
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info (Right) */}
            <div className="flex flex-1 flex-col justify-center">
              <div id="variant-picker-title" className="text-lg font-bold text-zinc-100">
                Chọn phiên bản
              </div>
              <div className="mt-1 line-clamp-2 text-sm text-zinc-400">{product.productName}</div>
              <div className="mt-2 space-y-1">
                {(() => {
                  const originalPrice = (selectedVariant?.originalPrice ?? product.basePrice ?? 0) * quantity;
                  const finalPrice = (selectedVariant?.finalPrice ?? product.currentPrice ?? 0) * quantity;
                  const hasDiscount = finalPrice < originalPrice;

                  return (
                    <>
                      {hasDiscount && (
                        <div className="text-sm text-zinc-500 line-through decoration-zinc-600">
                          {formatVnd(originalPrice)}
                        </div>
                      )}
                      <div className="text-2xl font-black text-rose-400">{formatVnd(finalPrice)}</div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Màu sắc</div>
              <div className="flex flex-wrap gap-2">
                {(product.productColors ?? []).map((c) => (
                  (() => {
                    const colorVariants = c.variants || [];
                    const variantQty = colorVariants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
                    const colorQty = hasVariants ? variantQty : (variantQty || Number(c.quantity ?? 0) || 0);
                    const isOutColor = colorQty <= 0;
                    return (
                      <button
                        key={c.productColorId}
                        type="button"
                        onClick={() => {
                          setSelectedColorId(c.productColorId);
                          setSelectedVariantId(hasVariants ? (c.variants?.[0]?.variantId ?? null) : null);
                        }}
                        disabled={isOutColor}
                        className={`rounded-full border px-3 py-1 text-xs transition-all ${selectedColorId === c.productColorId
                            ? "border-purple-500/50 bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30"
                            : "border-zinc-500/50 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/80"
                          } ${isOutColor ? "cursor-not-allowed opacity-30 blur-[0.5px] line-through decoration-rose-500" : ""}`}
                        title={isOutColor ? "Màu này đã hết hàng" : undefined}
                      >
                        {c.colorName} {isOutColor && "(Hết)"}
                      </button>
                    );
                  })()
                ))}
              </div>
            </div>

            {hasVariants && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">RAM / Bộ nhớ</div>
                <div className="flex flex-wrap gap-2">
                  {variants.length > 0 ? (
                    variants.map((v) => (
                      (() => {
                        const isOutVariant = (Number(v.quantity) || 0) <= 0;
                        return (
                          <button
                            key={v.variantId}
                            type="button"
                            onClick={() => setSelectedVariantId(v.variantId)}
                            disabled={isOutVariant}
                            className={`rounded-full border px-3 py-1 text-xs transition-all ${selectedVariantId === v.variantId
                                ? "border-purple-500/50 bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30"
                                : "border-zinc-500/50 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/80"
                              } ${isOutVariant ? "cursor-not-allowed opacity-30 blur-[0.5px] line-through decoration-rose-500" : ""}`}
                            title={isOutVariant ? "Phiên bản này đã hết hàng" : undefined}
                          >
                            {getVariantLabel(v)} {isOutVariant ? "(Hết hàng)" : `(${v.quantity ?? 0})`}
                          </button>
                        );
                      })()
                    ))
                  ) : (
                    <div className="text-sm text-zinc-500">Màu này chưa cấu hình RAM/Bộ nhớ.</div>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Số lượng</div>
              <input
                type="number"
                min={1}
                max={Math.max(maxQty, 1)}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="h-10 w-24 rounded-2xl border border-zinc-500/50 bg-zinc-800/60 px-3 text-sm text-zinc-100 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
              />
              <div className="mt-1 text-xs text-zinc-500">Tồn kho: {maxQty}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons (Sticky Bottom) */}
        <div className="border-t border-zinc-600/50 bg-zinc-800/50 p-5 backdrop-blur-md">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-2xl border border-zinc-500/50 bg-zinc-800/60 px-4 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700/80"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => {
                onConfirm({
                  productVariantId: selectedVariant?.variantId ?? null,
                  productColorId: selectedColor?.productColorId ?? null,
                  colorName: selectedColor?.colorName ?? null,
                  ramGb: selectedVariant?.ramGb ?? null,
                  storageGb: selectedVariant?.storageGb ?? null,
                  quantity,
                  price: selectedVariant?.finalPrice ?? product.currentPrice ?? 0,
                  imageUrl: selectedColor?.images?.[0] ?? product.productMainImage ?? product.productImages?.[0]?.imageUrl ?? null,
                });
                onClose();
              }}
              className={`h-10 rounded-2xl px-4 text-sm font-semibold text-white transition-all ${canSubmit ? "bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/25 active:scale-95" : "cursor-not-allowed bg-zinc-600"}`}
            >
              {maxQty <= 0 ? "Hết hàng" : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
    ,
    document.body
  );
}
