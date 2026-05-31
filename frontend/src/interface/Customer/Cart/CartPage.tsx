"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  ShoppingBasket, 
  Check,
  ChevronRight,
  ShieldCheck,
  Truck,
  ArrowLeft
} from "lucide-react";
import { emitCartUpdated, getActiveCartStorageKey } from "@/common/cartClient";
import { writeCheckoutDraft } from "@/common/checkoutDraft";
import { cartService } from "@/services/cartService";
import type { CartItemDto } from "@/common/types/cart";

type User = {
  id: string;
};

function readCustomerId(): number | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw) as Partial<User>;
    const id = user?.id ? Number(user.id) : NaN;
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

function isCustomerLoggedIn(): boolean {
  try {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    if (!token || !raw) return false;
    const u = JSON.parse(raw) as { userType?: string };
    return String(u?.userType || "").toLowerCase() === "customer";
  } catch {
    return false;
  }
}

type CartItem = {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  productVariantId?: number | null;
  productColorId?: number | null;
  ramGb?: number | null;
  storageGb?: number | null;
  colorName?: string | null;
  imageUrl?: string | null;
};

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(getActiveCartStorageKey());
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  try {
    localStorage.setItem(getActiveCartStorageKey(), JSON.stringify(items));
    const totalQuantity = items.reduce((sum, it) => sum + Math.max(0, Number(it.quantity) || 0), 0);
    emitCartUpdated(totalQuantity);
  } catch {
    // ignore
  }
}

function mapServerItem(it: CartItemDto): CartItem {
  return {
    productId: Number(it.productId),
    productName: String(it.productName || ""),
    price: Number(it.price || 0),
    quantity: Number(it.quantity || 1),
    productVariantId: it.productVariantId ?? null,
    productColorId: it.productColorId ?? null,
    ramGb: it.ramGb ?? null,
    storageGb: it.storageGb ?? null,
    colorName: it.colorName ?? null,
    imageUrl: it.imageUrl ?? null,
  };
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [zoomImageUrl, setZoomImageUrl] = React.useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isCustomerLoggedIn()) {
        if (mounted) setItems(readCart());
        return;
      }
      try {
        const dto = await cartService.getMyCart();
        const mapped = (dto.items || []).map(mapServerItem);
        if (mounted) setItems(mapped);
        emitCartUpdated(dto.totalQuantity);
      } catch {
        if (mounted) setItems([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const total = React.useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
  }, [items]);

  function getItemKey(it: CartItem): string {
    return `${it.productId}-${it.productColorId ?? "null"}-${it.productVariantId ?? "null"}-${it.ramGb ?? "null"}-${it.storageGb ?? "null"}`;
  }

  const selectedSet = React.useMemo(() => new Set(selectedKeys), [selectedKeys]);

  React.useEffect(() => {
    const valid = new Set(items.map(getItemKey));
    setSelectedKeys((prev) => prev.filter((k) => valid.has(k)));
  }, [items]);

  const selectedCount = React.useMemo(() => {
    return items.reduce((sum, it) => (selectedSet.has(getItemKey(it)) ? sum + 1 : sum), 0);
  }, [items, selectedSet]);

  const selectedTotal = React.useMemo(() => {
    return items.reduce((sum, it) => {
      if (!selectedSet.has(getItemKey(it))) return sum;
      return sum + Number(it.price || 0) * Number(it.quantity || 0);
    }, 0);
  }, [items, selectedSet]);

  function setQuantity(
    key: {
      productId: number;
      productColorId: number | null;
      productVariantId: number | null;
      ramGb: number | null;
      storageGb: number | null;
    },
    qty: number
  ) {
    const nextQty = Math.max(1, Math.min(99, Math.floor(qty) || 1));
    const next = items.map((it) => {
      const same =
        it.productId === key.productId &&
        (it.productColorId ?? null) === (key.productColorId ?? null) &&
        (it.productVariantId ?? null) === (key.productVariantId ?? null) &&
        ((key.productVariantId ?? null) != null ||
          ((it.ramGb ?? null) === (key.ramGb ?? null) && (it.storageGb ?? null) === (key.storageGb ?? null)));
      return same ? { ...it, quantity: nextQty } : it;
    });
    setItems(next);
    if (!isCustomerLoggedIn()) {
      writeCart(next);
      return;
    }
    void cartService
      .setQuantity({
        productId: key.productId,
        productColorId: key.productColorId,
        productVariantId: key.productVariantId,
        quantity: nextQty,
      })
      .then((dto) => {
        setItems((dto.items || []).map(mapServerItem));
        emitCartUpdated(dto.totalQuantity);
      })
      .catch(() => {
        // ignore
      });
  }

  function removeItem(key: {
    productId: number;
    productColorId: number | null;
    productVariantId: number | null;
    ramGb: number | null;
    storageGb: number | null;
  }) {
    const next = items.filter(
      (it) =>
        !(
          it.productId === key.productId &&
          (it.productColorId ?? null) === (key.productColorId ?? null) &&
          (it.productVariantId ?? null) === (key.productVariantId ?? null) &&
          ((key.productVariantId ?? null) != null ||
            ((it.ramGb ?? null) === (key.ramGb ?? null) && (it.storageGb ?? null) === (key.storageGb ?? null)))
        )
    );
    setItems(next);
    if (!isCustomerLoggedIn()) {
      writeCart(next);
      return;
    }
    void cartService
      .removeItem({
        productId: key.productId,
        productColorId: key.productColorId,
        productVariantId: key.productVariantId,
      })
      .then((dto) => {
        setItems((dto.items || []).map(mapServerItem));
        emitCartUpdated(dto.totalQuantity);
      })
      .catch(() => {
        // ignore
      });
  }

  function clearCart() {
    setItems([]);
    setSelectedKeys([]);
    if (!isCustomerLoggedIn()) {
      writeCart([]);
      return;
    }
    void cartService
      .clear()
      .then((dto) => {
        setItems((dto.items || []).map(mapServerItem));
        setSelectedKeys([]);
        emitCartUpdated(dto.totalQuantity);
      })
      .catch(() => {
        // ignore
      });
  }

  return (
    <>
    <div className="w-full overflow-x-hidden py-4 sm:py-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6 mb-10 sm:flex-row sm:items-center sm:justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex items-center gap-3 text-sm font-bold text-purple-600 dark:text-purple-400 mb-2 uppercase tracking-widest">
            <ShoppingBasket className="h-4 w-4" />
            <span>Giỏ hàng của bạn</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
            Túi <span className="text-purple-600">Mua Sắm</span>
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">
            Bạn đang có <span className="text-slate-900 dark:text-white font-bold">{items.length} sản phẩm</span> trong giỏ hàng
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-wrap gap-3"
        >
          <Link
            href="/product"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Tiếp tục mua sắm
          </Link>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-50 px-6 text-sm font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400"
            >
              <Trash2 className="h-4 w-4" />
              Làm trống giỏ
            </button>
          )}
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {items.length === 0 ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative overflow-hidden rounded-[3rem] customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 p-16 text-center shadow-2xl shadow-black/20"
          >
            <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-purple-500/5 blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl" />
            
            <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-purple-50 text-purple-600 dark:bg-purple-500/10">
              <ShoppingBag className="h-12 w-12" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Giỏ hàng của bạn đang trống</h3>
            <p className="mx-auto mt-3 max-w-sm text-slate-500 dark:text-slate-400">
              Có vẻ như bạn chưa chọn được sản phẩm nào. Khám phá hàng ngàn sản phẩm công nghệ tuyệt vời ngay!
            </p>
            <Link
              href="/product"
              className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-purple-600 px-8 text-sm font-black text-white shadow-xl shadow-purple-500/20 transition hover:bg-purple-700 active:scale-95"
            >
              Khám phá sản phẩm
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
            {/* Items List */}
            <div className="lg:col-span-8">
              <motion.div 
                layout
                className="space-y-4"
              >
                {items.map((it, index) => {
                  const itemKey = getItemKey(it);
                  const key = {
                    productId: it.productId,
                    productColorId: it.productColorId ?? null,
                    productVariantId: it.productVariantId ?? null,
                    ramGb: it.ramGb ?? null,
                    storageGb: it.storageGb ?? null,
                  };
                  return (
                    <motion.div
                      layout
                      key={itemKey}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                      className="group relative flex flex-col gap-3 rounded-2xl customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/60 p-3 shadow-xl shadow-black/20 transition-all hover:border-zinc-500/40 sm:flex-row sm:gap-4 sm:rounded-[2rem] sm:p-5"
                    >
                      <div className="flex flex-col items-center pt-2">
                        <label className="relative flex cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedSet.has(itemKey)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedKeys((prev) =>
                                checked ? (prev.includes(itemKey) ? prev : [...prev, itemKey]) : prev.filter((k) => k !== itemKey)
                              );
                            }}
                            className="peer sr-only"
                          />
                          <div className="h-6 w-6 rounded-lg border-2 border-slate-200 bg-white transition-all peer-checked:border-purple-600 peer-checked:bg-purple-600 dark:border-slate-700 dark:bg-slate-800" />
                          <Check className="absolute h-4 w-4 scale-0 text-white transition-transform peer-checked:scale-100" />
                        </label>
                      </div>

                      <div className="w-24 aspect-[9/16] shrink-0 overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800">
                        {it.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => setZoomImageUrl(it.imageUrl ?? null)}
                            className="h-full w-full cursor-zoom-in"
                          >
                            <img
                              src={it.imageUrl}
                              alt={it.productName}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          </button>
                        ) : (
                          <div className="grid h-full place-items-center bg-slate-100 dark:bg-slate-800">
                            <ShoppingBag className="h-8 w-8 text-slate-300" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-lg font-black text-slate-900 dark:text-white group-hover:text-purple-600 transition">
                              {it.productName}
                            </h3>
                            
                            <div className="mt-1 flex flex-wrap gap-2">
                              {it.colorName && (
                                <span className="inline-flex items-center rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase text-slate-500 dark:bg-white/5">
                                  {it.colorName}
                                </span>
                              )}
                              {(it.ramGb != null || it.storageGb != null) && (
                                <span className="inline-flex items-center rounded-lg bg-purple-50 px-2 py-1 text-[10px] font-bold uppercase text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                                  {it.ramGb}GB / {it.storageGb}GB
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(key)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:bg-white/5"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="mt-auto flex flex-wrap items-end justify-between gap-4">
                          <div className="flex items-center rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
                            <button
                              type="button"
                              onClick={() => setQuantity(key, it.quantity - 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:text-purple-600 dark:bg-slate-800 dark:text-slate-300"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center text-sm font-black text-slate-900 dark:text-white">
                              {it.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuantity(key, it.quantity + 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:text-purple-600 dark:bg-slate-800 dark:text-slate-300"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="text-right">
                            <div className="text-[10px] font-black uppercase text-slate-400">Thành tiền</div>
                            <div className="text-lg font-black text-slate-900 dark:text-white">
                              {formatVnd(Number(it.price || 0) * Number(it.quantity || 0))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            {/* Sidebar Summary */}
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="overflow-hidden rounded-[2.5rem] customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 p-8 shadow-2xl shadow-black/20"
                >
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                       <h2 className="text-xl font-black text-slate-900 dark:text-white">Tổng đơn hàng</h2>
                       <div className="rounded-full bg-purple-50 px-3 py-1 text-[10px] font-black uppercase text-purple-600 dark:bg-purple-500/10">
                         {selectedCount} sản phẩm
                       </div>
                    </div>
                    <p className="text-xs text-slate-500">Giá trị đơn hàng sẽ được tính dựa trên các sản phẩm bạn đã chọn bên dưới.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-white/5">
                      <span className="text-sm font-bold text-slate-500">Tạm tính</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{formatVnd(selectedTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-white/5">
                      <span className="text-sm font-bold text-slate-500">Giảm giá</span>
                      <span className="text-sm font-black text-emerald-600">- 0 ₫</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-white/5">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-slate-500">Giao hàng</span>
                        <Truck className="h-3 w-3 text-slate-400" />
                      </div>
                      <span className="text-sm font-black text-slate-900 dark:text-white">Miễn phí</span>
                    </div>
                    
                    <div className="pt-4">
                      <div className="flex items-center justify-between">
                         <span className="text-lg font-black text-slate-900 dark:text-white">Tổng cộng</span>
                         <span className="text-2xl font-black text-purple-600">{formatVnd(selectedTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {checkoutError && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-6 rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-600 dark:bg-rose-500/10"
                    >
                      {checkoutError}
                    </motion.div>
                  )}

                  <div className="mt-8 space-y-3">
                    <button
                      type="button"
                      disabled={selectedCount === 0 || checkingOut}
                      onClick={async () => {
                        if (checkingOut) return;
                        const customerId = readCustomerId();
                        if (!customerId) {
                          setCheckoutError("Vui lòng đăng nhập để thực hiện thanh toán.");
                          return;
                        }

                        const picked = items.filter((it) => selectedSet.has(getItemKey(it)));
                        if (picked.length === 0) return;

                        setCheckingOut(true);
                        setCheckoutError(null);
                        try {
                          writeCheckoutDraft({
                            source: "cart",
                            createdAt: Date.now(),
                            items: picked.map((it) => ({
                              productId: it.productId,
                              productName: it.productName,
                              price: Number(it.price || 0),
                              quantity: Number(it.quantity || 1),
                              productColorId: it.productColorId ?? null,
                              productVariantId: it.productVariantId ?? null,
                              productColor: it.colorName ?? null,
                              ramGb: it.ramGb ?? null,
                              storageGb: it.storageGb ?? null,
                              imageUrl: it.imageUrl ?? null,
                              cartItemKey: getItemKey(it),
                            })),
                          });
                          router.push("/payment");
                        } catch (e) {
                          setCheckoutError(e instanceof Error ? e.message : "Không thể chuyển sang bước thanh toán.");
                        } finally {
                          setCheckingOut(false);
                        }
                      }}
                      className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-slate-900 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-purple-600 dark:hover:bg-purple-700"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {checkingOut ? "Đang xử lý..." : "Tiến hành thanh toán"}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </button>

                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-100 py-3 transition hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                      <div className="relative flex h-5 w-5 items-center justify-center">
                        <input
                          type="checkbox"
                          checked={items.length > 0 && selectedCount === items.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedKeys(items.map(getItemKey));
                            else setSelectedKeys([]);
                          }}
                          className="peer sr-only"
                        />
                        <div className="h-5 w-5 rounded-md border-2 border-slate-200 bg-white transition-all peer-checked:border-purple-600 peer-checked:bg-purple-600 dark:border-slate-700 dark:bg-slate-800" />
                        <Check className="absolute h-3.5 w-3.5 scale-0 text-white transition-transform peer-checked:scale-100" />
                      </div>
                      <span className="text-xs font-bold text-slate-500">Chọn tất cả sản phẩm</span>
                    </label>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                     <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-slate-50 dark:bg-white/5">
                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                        <span className="text-[8px] font-black uppercase text-slate-400">An toàn 100%</span>
                     </div>
                     <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-slate-50 dark:bg-white/5">
                        <Truck className="h-5 w-5 text-purple-500" />
                        <span className="text-[8px] font-black uppercase text-slate-400">Giao nhanh 2h</span>
                     </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>

    <AnimatePresence>
      {zoomImageUrl &&
        createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xl"
            onClick={() => setZoomImageUrl(null)}
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={zoomImageUrl}
              alt="Ảnh sản phẩm"
              className="max-h-[85vh] max-w-[85vw] rounded-[2.5rem] object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              className="absolute top-8 right-8 h-12 w-12 flex items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/20 transition"
              onClick={() => setZoomImageUrl(null)}
            >
              <Minus className="h-6 w-6 rotate-45" />
            </button>
          </motion.div>,
          document.body
        )}
    </AnimatePresence>
    </>
  );
}
