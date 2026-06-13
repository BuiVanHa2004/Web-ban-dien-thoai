"use client";

import Link from "next/link";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Clock,
  CreditCard,
  ChevronRight,
  ShoppingBag,
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Truck,
  Box,
  ShieldCheck,
} from "lucide-react";

import { orderService, type OrderDto } from "@/services/orderService";
import { productService, type ProductDto } from "@/services/productService";
import { CancelOrderModal } from "@/components/customers/CancelOrderModal";
import { resolveImageUrl } from "@/common/resolveImageUrl";

function normalizeText(txt: any): string | null {
  if (typeof txt !== "string") return null;
  const s = txt.trim();
  return s === "" ? null : s;
}

type User = {
  id: string;
  email?: string;
  name?: string;
  userType?: string;
};

function readCustomerId(): number | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw) as Partial<User>;
    const id = user?.id ? Number(user.id) : NaN;
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING_CONFIRM: { label: "Chờ xác nhận", color: "text-amber-600 bg-amber-50 border-amber-100", icon: Clock },
  PENDING_PAYMENT_CONFIRMATION: { label: "Chờ xác nhận thanh toán", color: "text-cyan-600 bg-cyan-50 border-cyan-100", icon: CreditCard },
  CONFIRMED: { label: "Đã xác nhận", color: "text-purple-600 bg-purple-50 border-purple-100", icon: ShieldCheck },
  PENDING_PICKUP: { label: "Chờ lấy hàng", color: "text-blue-600 bg-blue-50 border-blue-100", icon: Package },
  SHIPPING: { label: "Đang giao hàng", color: "text-indigo-600 bg-indigo-50 border-indigo-100", icon: Truck },
  DELIVERED: { label: "Đã giao hàng", color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: CheckCircle2 },
  CANCELLED: { label: "Đã hủy", color: "text-rose-600 bg-rose-50 border-rose-100", icon: XCircle },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string }> = {
  UNPAID: { label: "Chưa thanh toán", color: "text-rose-600" },
  PENDING: { label: "Chờ thanh toán", color: "text-amber-600" },
  PAID: { label: "Đã thanh toán", color: "text-emerald-600" },
};

function getRealPaymentStatus(order: any) {
  if (order?.paymentStatus && order.paymentStatus !== "UNPAID") {
    return String(order.paymentStatus);
  }
  return String(order?.orderStatus || "") === "DELIVERED" ? "PAID" : "UNPAID";
}

export default function OrderPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [orders, setOrders] = React.useState<OrderDto[]>([]);
  const [productMap, setProductMap] = React.useState<Record<number, ProductDto>>({});
  const [productByNameMap, setProductByNameMap] = React.useState<Record<string, ProductDto>>({});
  const [selectedStatus, setSelectedStatus] = React.useState<string>("ALL");
  const [cancellingId, setCancellingId] = React.useState<number | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<OrderDto | null>(null);

  React.useEffect(() => {
    const customerId = readCustomerId();
    if (!customerId) {
      setLoading(false);
      setError("Vui lòng đăng nhập để xem đơn hàng.");
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await orderService.getAll(customerId);
        setOrders(data);

        const uniqueProductIds = Array.from(
          new Set(
            data.flatMap(o => o.items || [])
              .map((it) => Number(it.productId))
              .filter((pid) => Number.isFinite(pid) && pid > 0)
          )
        );

        if (uniqueProductIds.length > 0) {
          const productPairs = await Promise.all(
            uniqueProductIds.map(async (pid) => {
              try {
                const p = await productService.getById(pid);
                return [pid, p] as const;
              } catch {
                return null;
              }
            })
          );
          const nextMap: Record<number, ProductDto> = {};
          productPairs.forEach((pair) => {
            if (pair) nextMap[pair[0]] = pair[1];
          });
          setProductMap(nextMap);
        }

        const missingProductNames = Array.from(
          new Set(
            data.flatMap(o => o.items || [])
              .filter((it) => !Number.isFinite(Number(it.productId)) || Number(it.productId) <= 0)
              .map((it) => normalizeText(it.productName))
              .filter((name): name is string => name !== null)
          )
        );

        if (missingProductNames.length > 0) {
          const searchPairs = await Promise.all(
            missingProductNames.map(async (name) => {
              try {
                const results = await productService.getAllFiltered({ q: name });
                const matched = results.find(p => normalizeText(p.productName) === name);
                return [name, matched] as const;
              } catch {
                return null;
              }
            })
          );
          const nextNameMap: Record<string, ProductDto> = {};
          searchPairs.forEach((pair) => {
            if (pair && pair[1]) nextNameMap[pair[0]] = pair[1];
          });
          setProductByNameMap(nextNameMap);
        }
      } catch (e: any) {
        setError(e?.message || "Không thể tải danh sách đơn hàng.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sortedOrders = React.useMemo(() => {
    return [...orders].sort((a, b) => {
      const ta = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const tb = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return tb - ta;
    });
  }, [orders]);

  const filteredOrders = React.useMemo(() => {
    if (selectedStatus === "ALL") return sortedOrders;
    return sortedOrders.filter((o) => String(o.orderStatus || "") === selectedStatus);
  }, [sortedOrders, selectedStatus]);

  const statusFilters = ["ALL", "PENDING_CONFIRM", "PENDING_PAYMENT_CONFIRMATION", "CONFIRMED", "PENDING_PICKUP", "SHIPPING", "DELIVERED", "CANCELLED"];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 overflow-x-hidden py-2 animate-page sm:space-y-10 sm:py-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-fuchsia-700 px-4 py-8 shadow-2xl sm:rounded-[2.5rem] sm:px-8 sm:py-12">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-pink-500/20 blur-[100px]" />

        <div className="relative z-10 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="text-center md:text-left">
            <h1 className="bg-gradient-to-r from-white to-indigo-100 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-4xl lg:text-5xl">
              Đơn hàng của bạn
            </h1>
            <p className="mt-3 text-lg text-indigo-100 opacity-90">
              Quản lý và theo dõi hành trình đơn hàng của bạn một cách dễ dàng.
            </p>
          </div>

          <Link
            href="/product"
            className="group flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-purple-700 transition-all hover:bg-indigo-50 hover:shadow-xl active:scale-95"
          >
            <ShoppingBag className="h-5 w-5 transition-transform group-hover:-rotate-12" />
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 shadow-sm"
        >
          <AlertCircle className="h-5 w-5" />
          {error}
        </motion.div>
      )}

      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-2">
        {statusFilters.map((status) => {
          const isActive = selectedStatus === status;
          const config = STATUS_CONFIG[status];
          const count = status === "ALL"
            ? orders.length
            : orders.filter(o => o.orderStatus === status).length;

          return (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`
                group relative flex h-10 items-center gap-2.5 whitespace-nowrap rounded-2xl border px-5 text-sm font-bold transition-all
                ${isActive
                  ? "border-purple-600 bg-purple-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-purple-50 dark:border-slate-800 dark:bg-slate-900/50"
                }
              `}
            >
              {status === "ALL" ? <Box className="h-4 w-4" /> : config && <config.icon className="h-4 w-4" />}
              <span>{status === "ALL" ? "Tất cả" : config?.label}</span>
              <span className={`
                flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px]
                ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}
              `}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-[2rem] bg-slate-100 dark:bg-slate-800/50" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-purple-100 bg-purple-50/30 py-24 text-center dark:border-purple-900/20 dark:bg-purple-900/10"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl shadow-xl dark:bg-slate-800">
              📦
            </div>
            <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">Không tìm thấy đơn hàng</h3>
            <p className="mt-2 text-slate-500">Bạn chưa có đơn hàng nào ở trạng thái này.</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order, idx) => (
              <motion.div
                key={order.orderId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative overflow-hidden rounded-[2.5rem] customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 p-6 shadow-sm transition-all hover:border-zinc-500/40 hover:shadow-xl"
              >
                <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 space-y-6">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-500/10">
                        <Package className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Mã đơn hàng</span>
                          <span className="rounded-lg bg-purple-100 px-2 py-0.5 text-xs font-black text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                            #{order.orderCode || order.orderId}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {formatDate(order.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {(order.items || []).slice(0, 3).map((item, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="relative aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                            {(() => {
                              let product = productMap[Number(item.productId)];
                              if (!product && normalizeText(item.productName)) {
                                product = productByNameMap[normalizeText(item.productName)!];
                              }
                              const orderColorName = normalizeText(item.colorName);
                              let matchedImage: string | null = null;
                              if (orderColorName && product?.productColors) {
                                const matched = product.productColors.find(c => normalizeText(c.colorName)?.toLowerCase() === orderColorName.toLowerCase());
                                if (matched?.images?.[0]) matchedImage = matched.images[0];
                              }
                              const src = resolveImageUrl(matchedImage || item.imageUrl || product?.productMainImage || (product?.productImages?.[0]?.imageUrl));
                              return src ? (
                                <img src={src} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800">
                                  <Package className="h-6 w-6 text-slate-300" />
                                </div>
                              );
                            })()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">{item.productName}</h4>
                            <p className="mt-0.5 text-xs font-medium text-slate-500">
                              Màu: <span className="text-slate-700 dark:text-slate-300">{item.colorName || "N/A"}</span> • SL: {item.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                      {(order.items || []).length > 3 && (
                        <p className="text-xs font-bold text-purple-600 dark:text-purple-400">
                          + và {(order.items || []).length - 3} sản phẩm khác
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-6 border-t border-slate-100 pt-6 md:border-none md:pt-0">
                    <div className="flex flex-col items-end gap-2">
                      <div className={`
                        flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold
                        ${STATUS_CONFIG[order.orderStatus || ""]?.color || "bg-slate-50 text-slate-500 border-slate-100"}
                      `}>
                        {(() => {
                          const Config = STATUS_CONFIG[order.orderStatus || ""];
                          return Config ? (
                            <>
                              <Config.icon className="h-3.5 w-3.5" />
                              {Config.label}
                            </>
                          ) : order.orderStatus;
                        })()}
                      </div>

                      <div className="flex items-center gap-2 text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Thanh toán</div>
                        <span className={`text-sm font-black ${PAYMENT_CONFIG[getRealPaymentStatus(order)]?.color}`}>
                          {PAYMENT_CONFIG[getRealPaymentStatus(order)]?.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {["PENDING_CONFIRM", "PENDING_PAYMENT_CONFIRMATION", "CONFIRMED", "PENDING_PICKUP"].includes(order.orderStatus || "") && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsCancelModalOpen(true);
                          }}
                          className="flex h-11 items-center justify-center rounded-2xl bg-rose-50 px-6 text-xs font-bold text-rose-600 transition-all hover:bg-rose-100 active:scale-95 disabled:opacity-50"
                        >
                          Hủy đơn
                        </button>
                      )}

                      <Link
                        href={`/order/${order.orderId}`}
                        className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 text-xs font-bold text-white transition-all active:scale-95"
                      >
                        Xem chi tiết
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <CancelOrderModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSelectedOrder(null);
        }}
        onSuccess={(updatedOrder) => {
          setOrders(prev => prev.map(o => o.orderId === updatedOrder.orderId ? updatedOrder : o));
        }}
        orderId={selectedOrder?.orderId || 0}
        customerId={readCustomerId() || 0}
      />
    </div>
  );
}