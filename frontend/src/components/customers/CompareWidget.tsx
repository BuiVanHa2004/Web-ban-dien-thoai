"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Scale, X, Sparkles, Loader2, Search, CheckCircle2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { productService, type ProductDto } from "@/services/productService";
import { useDraggableEdge } from "@/hooks/useDraggableEdge";

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";
const AI_MAINTENANCE_MESSAGE = "Hiện tại AI đang bảo trì. Bạn vui lòng thử lại sau nhé.";

function resolveImg(input?: string | null): string | undefined {
  if (!input) return undefined;
  const raw = input.trim();
  if (!raw) return undefined;
  if (/^(https?:)?\/\//i.test(raw)) return raw;
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

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

function isTokenLimitErrorMessage(message?: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("token") ||
    normalized.includes("context length") ||
    normalized.includes("rate limit") ||
    normalized.includes("quota") ||
    normalized.includes("too many requests") ||
    normalized.includes("429")
  );
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

function getMinMaxPrice(p: ProductDto) {
  const prices: number[] = [];
  if (p.currentPrice != null) prices.push(Number(p.currentPrice));

  p.productColors?.forEach((color) => {
    color.variants?.forEach((v) => {
      if (v.finalPrice != null) prices.push(Number(v.finalPrice));
    });
  });

  const validPrices = prices.filter((v) => !isNaN(v) && v > 0);
  if (validPrices.length === 0) {
    // Fallback to basePrice if no currentPrice or variant prices
    const fallback = Number(p.currentPrice || p.basePrice || 0);
    return { min: fallback, max: fallback };
  }

  return {
    min: Math.min(...validPrices),
    max: Math.max(...validPrices),
  };
}

/* ---------- simple markdown renderer ---------- */
function RenderMd({ text }: { text: string }) {
  const parseLine = (line: string) => {
    return line.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/).map((seg, k) => {
      if (seg.startsWith("**") && seg.endsWith("**")) {
        return (
          <strong key={k} className="font-bold text-violet-600 dark:text-violet-400">
            {seg.slice(2, -2)}
          </strong>
        );
      }
      if (seg.startsWith("[") && seg.includes("](")) {
        const match = seg.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          return (
            <Link
              key={k}
              href={match[2]}
              className="font-bold text-violet-600 underline underline-offset-2 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
            >
              {match[1]}
            </Link>
          );
        }
      }
      return <span key={k}>{seg}</span>;
    });
  };

  return (
    <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
      {text.split("\n\n").map((paragraph, i) => {
        if (paragraph.trim().startsWith("- ")) {
          return (
            <ul key={i} className="list-inside list-disc space-y-1">
              {paragraph.split("\n").map((line, j) => (
                <li key={j}>{parseLine(line.replace(/^- /, ""))}</li>
              ))}
            </ul>
          );
        }

        return <p key={i}>{parseLine(paragraph)}</p>;
      })}
    </div>
  );
}

export default function CompareWidget({ chatOpen }: { chatOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [isComparing, setIsComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const drag = useDraggableEdge({
    storageKey: "compare-widget-pos",
  });

  // Get current user ID for storage key
  const userId = useMemo(() => {
    if (typeof window === "undefined") return "guest";
    try {
      const u = localStorage.getItem("user");
      if (u) {
        const parsed = JSON.parse(u);
        return parsed.customerId || parsed.userId || parsed.id || "user";
      }
    } catch {}
    return "guest";
  }, []);

  const storageKey = useMemo(() => `bvh-compare-session-${userId}`, [userId]);

  // Load session on mount or user change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedIds) setSelectedIds(parsed.selectedIds);
        if (parsed.compareResult) setCompareResult(parsed.compareResult);
      } else {
        setSelectedIds([]);
        setCompareResult(null);
      }
    } catch (e) {
      console.error("Failed to load compare session", e);
    }
  }, [storageKey]);

  // Save session when data changes
  useEffect(() => {
    try {
      if (selectedIds.length > 0 || compareResult) {
        localStorage.setItem(storageKey, JSON.stringify({ selectedIds, compareResult }));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.error("Failed to save compare session", e);
    }
  }, [selectedIds, compareResult, storageKey]);

  // Fetch products when opened
  useEffect(() => {
    if (isOpen && products.length === 0) {
      let mounted = true;
      setLoadingProducts(true);
      productService.getAll()
        .then((data) => {
          if (mounted) setProducts(data);
        })
        .catch(() => {
          // silent error
        })
        .finally(() => {
          if (mounted) setLoadingProducts(false);
        });
      return () => { mounted = false; };
    }
  }, [isOpen, products.length]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter((p) => p.productName?.toLowerCase().includes(q));
  }, [products, searchQuery]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) return;
    setIsComparing(true);
    setError(null);
    setCompareResult(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        const serverError = data.error || `Lỗi server (${res.status})`;
        if (res.status === 429 || isTokenLimitErrorMessage(serverError)) {
          throw new Error(AI_MAINTENANCE_MESSAGE);
        }
        throw new Error(serverError);
      }
      setCompareResult(data.reply || "Không có kết quả.");
    } catch (err) {
      const rawError = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setError(isTokenLimitErrorMessage(rawError) ? AI_MAINTENANCE_MESSAGE : rawError);
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <>
      {/* Floating Button (Draggable, snaps to edge) */}
      <div
        ref={drag.ref}
        className="rounded-full"
        style={chatOpen ? {
          position: "fixed",
          bottom: 96,
          left: 24,
          right: "auto",
          top: "auto",
          zIndex: 60,
          touchAction: "none",
          transition: "all 0.3s ease",
          cursor: "grab",
          opacity: 1,
          animation: "fabPulse 2s infinite",
        } : {
          ...drag.style,
          animation: "fabPulse 2s infinite",
        }}
        {...(chatOpen ? {} : drag.handlers)}
      >
        <button
          onClick={() => { if (!drag.wasDragged() || chatOpen) setIsOpen(true); }}
          className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 sm:h-14 sm:w-auto sm:gap-3 sm:px-5 sm:shadow-2xl sm:hover:pr-6 dark:bg-slate-900"
          style={{ boxShadow: "0 8px 24px -8px rgba(139,92,246,0.45)" }}
          aria-label="So sánh AI - MyPhone Store"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-10 transition-opacity group-hover:opacity-20" />

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white shadow-md ring-2 ring-white/20 sm:h-11 sm:w-11">
            <Scale className="h-[18px] w-[18px] drop-shadow-md sm:h-[22px] sm:w-[22px]" />
          </div>

          <div className="hidden flex-col items-start pr-1 text-left whitespace-nowrap sm:flex">
            <span className="text-sm font-extrabold tracking-tight text-slate-800 dark:text-white">So sánh AI</span>
            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">MyPhone Store</span>
          </div>
        </button>
      </div>

      {/* Modal / Widget */}
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm sm:p-6">
          <div className="flex h-full max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl dark:bg-slate-950">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/5 bg-white px-6 py-4 dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                {compareResult ? (
                  <button
                    onClick={() => { setCompareResult(null); setError(null); }}
                    className="mr-2 rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft size={20} />
                  </button>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                    <Scale size={20} />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
                    {compareResult ? "Phân tích từ MyPhone AI" : "So sánh chuyên sâu"}
                  </h2>
                  {!compareResult && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                      Chọn tối đa 5 sản phẩm để bắt đầu
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin" }}>
              {compareResult ? (
                // RESULT VIEW
                <div className="mx-auto max-w-3xl">
                  <div
                    className="mb-6 flex gap-4 overflow-x-auto pb-4 overscroll-x-contain [scrollbar-gutter:stable]"
                    style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x", contain: "content" }}
                  >
                    {products.filter(p => selectedIds.includes(p.productId)).map(p => {
                      const { min, max } = getMinMaxPrice(p);
                      return (
                        <Link
                          key={p.productId}
                          href={`/product/${p.productId}`}
                          className="flex min-w-[220px] items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 shadow-sm transition-colors hover:border-violet-300 dark:border-white/10 dark:bg-slate-900 dark:hover:border-violet-700"
                        >
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                            <img
                              src={resolveImg(getProductPreviewImage(p))}
                              alt={p.productName}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">{p.productName}</div>
                            <div className="mt-1 text-[10px] font-medium text-violet-600 dark:text-violet-400">
                              {min === max ? formatVnd(min) : `${formatVnd(min)} - ${formatVnd(max)}`}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="rounded-[2.5rem] border border-purple-100 bg-white p-8 shadow-xl dark:border-purple-900/30 dark:bg-slate-900/50 backdrop-blur-xl">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-500/30">
                        <Sparkles size={20} />
                      </div>
                      <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Đánh giá chuyên gia</span>
                    </div>
                    <RenderMd text={compareResult} />
                  </div>
                </div>
              ) : isComparing ? (
                // LOADING VIEW
                <div className="flex h-full flex-col items-center justify-center space-y-4">
                  <Loader2 size={48} className="animate-spin text-violet-500" />
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-900 dark:text-white">AI đang phân tích thông số...</div>
                    <div className="mt-1 text-sm text-slate-500">Quá trình này có thể mất vài giây</div>
                  </div>
                </div>
              ) : (
                // SELECTION VIEW
                <>
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex flex-1 items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 shadow-sm dark:border-white/10 dark:bg-slate-900">
                      <Search size={18} className="text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm sản phẩm..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
                      />
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        Đã chọn <span className="text-violet-600 dark:text-violet-400">{selectedIds.length}</span>/5
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-400">
                      {error}
                    </div>
                  )}

                  {loadingProducts ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">Không tìm thấy sản phẩm phù hợp.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {filteredProducts.map((p) => {
                        const isSelected = selectedIds.includes(p.productId);
                        const disabled = !isSelected && selectedIds.length >= 5;

                        return (
                          <div
                            key={p.productId}
                            onClick={() => !disabled && toggleSelect(p.productId)}
                            className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-200 ${isSelected
                              ? "border-violet-500 bg-violet-50 dark:border-violet-500 dark:bg-violet-900/20"
                              : disabled
                                ? "border-transparent bg-white opacity-50 grayscale dark:bg-slate-900"
                                : "border-transparent bg-white hover:border-violet-200 dark:bg-slate-900 dark:hover:border-violet-800"
                              }`}
                          >
                            <div className="relative z-0 aspect-[9/16] w-full overflow-hidden rounded-2xl p-4">
                              <img
                                src={resolveImg(getProductPreviewImage(p))}
                                alt={p.productName}
                                className="h-full w-full rounded-2xl object-cover shadow-sm transform-none transition-none"
                              />
                            </div>
                            <div className="p-4 pt-0 text-center">
                              <h3 className="line-clamp-3 text-xs font-bold leading-5 text-slate-900 dark:text-white">
                                {p.productName}
                              </h3>
                            </div>

                            <div className="pointer-events-none absolute right-3 top-3 z-20 rounded-full bg-white/90 p-0.5 shadow-md ring-1 ring-black/10 dark:bg-slate-900/90 dark:ring-white/20">
                              {isSelected ? (
                                <CheckCircle2 className="fill-violet-500 text-white" size={24} />
                              ) : (
                                <div className={`h-6 w-6 rounded-full border-2 border-slate-300 dark:border-slate-600 ${disabled ? "" : "group-hover:border-violet-400"}`} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!compareResult && !isComparing && (
              <div className="border-t border-black/5 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedIds([])}
                    disabled={selectedIds.length === 0}
                    className="rounded-2xl px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Bỏ chọn tất cả
                  </button>
                  <button
                    onClick={handleCompare}
                    disabled={selectedIds.length < 2}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Sparkles size={18} />
                    So sánh ({selectedIds.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* scoped styles */}
      <style jsx global>{`
        @keyframes fabPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.5); }
          50% { box-shadow: 0 0 0 15px rgba(139,92,246,0); }
        }
      `}</style>
    </>
  );
}
