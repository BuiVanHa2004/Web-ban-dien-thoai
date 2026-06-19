"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Star,
  Trash2,
  Edit3,
  Camera,
  CheckCircle2,
  Truck,
  Box,
  ChevronLeft,
  XCircle,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { CancelOrderModal } from "@/components/customers/CancelOrderModal";

import {
  evaluateService,
  type CustomerEvaluateDto,
} from "@/services/evaluateService";
import { orderService, type OrderDto } from "@/services/orderService";
import { bankTransferService } from "@/services/bankTransferService";
import { productService, type ProductDto } from "@/services/productService";
import { cartService } from "@/services/cartService";
import { useAppNotification } from "@/providers/AppNotificationProvider";
import { resolveImageUrl } from "@/common/resolveImageUrl";

type UserType = {
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
    const user = JSON.parse(raw) as Partial<UserType>;
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

const STATUS_STEPS = [
  { id: "PENDING_CONFIRM", label: "Chờ xác nhận", icon: Clock },
  { id: "PENDING_PAYMENT_CONFIRMATION", label: "Chờ thanh toán", icon: CreditCard },
  { id: "CONFIRMED", label: "Đã xác nhận", icon: CheckCircle2 },
  { id: "PENDING_PICKUP", label: "Chờ lấy hàng", icon: Package },
  { id: "SHIPPING", label: "Đang giao hàng", icon: Truck },
  { id: "DELIVERED", label: "Đã giao hàng", icon: CheckCircle2 },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING_CONFIRM: { label: "Chờ xác nhận", color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
  PENDING_PAYMENT_CONFIRMATION: { label: "Chờ xác nhận thanh toán", color: "text-cyan-600", bg: "bg-cyan-50", icon: CreditCard },
  CONFIRMED: { label: "Đã xác nhận", color: "text-purple-600", bg: "bg-purple-50", icon: CheckCircle2 },
  PENDING_PICKUP: { label: "Chờ lấy hàng", color: "text-purple-600", bg: "bg-purple-50", icon: Package },
  SHIPPING: { label: "Đang giao hàng", color: "text-indigo-600", bg: "bg-indigo-50", icon: Truck },
  DELIVERED: { label: "Đã giao hàng", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
  CANCELLED: { label: "Đã hủy", color: "text-rose-600", bg: "bg-rose-50", icon: Box },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  UNPAID: { label: "Chưa thanh toán", color: "text-rose-600", bg: "bg-rose-50" },
  PENDING: { label: "Chờ thanh toán", color: "text-amber-600", bg: "bg-amber-50" },
  WAITING_CONFIRM: { label: "Chờ xác nhận chuyển khoản", color: "text-indigo-600", bg: "bg-indigo-50" },
  PAID: { label: "Đã thanh toán", color: "text-emerald-600", bg: "bg-emerald-50" },
};

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

function toNumberSafe(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
}

function getRealPaymentStatus(order: any) {
  if (order?.paymentStatus === "PENDING" && order?.paymentMethod === "BANK_TRANSFER" && order?.waitingConfirm) {
    return "WAITING_CONFIRM";
  }
  if (order?.paymentStatus && order.paymentStatus !== "UNPAID") {
    return String(order.paymentStatus);
  }
  return String(order?.orderStatus || "") === "DELIVERED" ? "PAID" : "UNPAID";
}

function normalizeText(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "null") return null;
  return s;
}

type SpecField = "chip" | "screen" | "battery" | "cameraRear" | "cameraFront" | "operatingSystem" | "size" | "weight" | "material" | "refreshRate" | "fastCharge" | "waterResistance" | "chargingPort" | "sim" | "warranty" | "version";

function getSpecValue(product: ProductDto | undefined, field: SpecField): string | null {
  if (!product?.productSpecs || product.productSpecs.length === 0) return null;
  const spec = product.productSpecs[0];
  if (!spec) return null;
  const value = spec[field];
  return normalizeText(value);
}

type ReviewDraft = {
  rating: string;
  content: string;
  images?: File[];
  existingImageUrls?: string[];
};

export default function OrderId() {
  const { showToast, confirm } = useAppNotification();
  const params = useParams();
  const id = Number(params?.id);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<OrderDto | null>(null);
  const [productMap, setProductMap] = React.useState<Record<number, ProductDto>>({});
  const [productByNameMap, setProductByNameMap] = React.useState<Record<string, ProductDto>>({});
  const [reviewMap, setReviewMap] = React.useState<Record<number, CustomerEvaluateDto>>({});
  const [reviewDraftMap, setReviewDraftMap] = React.useState<Record<number, ReviewDraft>>({});
  const [reviewLoadingMap, setReviewLoadingMap] = React.useState<Record<number, boolean>>({});
  const [editingReviewItemIds, setEditingReviewItemIds] = React.useState<Record<number, boolean>>({});
  const [waitingConfirm, setWaitingConfirm] = React.useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);

  React.useEffect(() => {
    const customerId = readCustomerId();
    if (!customerId) {
      setLoading(false);
      setError("Vui lòng đăng nhập để xem chi tiết đơn hàng.");
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await orderService.getById(id);
        if (data.customerId != null && Number(data.customerId) !== customerId) {
          setOrder(null);
          setError("Bạn không có quyền xem đơn hàng này.");
          return;
        }
        setOrder(data);
        console.log("📦 [Customer OrderId] Order loaded:", {
          orderId: data.orderId,
          orderStatus: data.orderStatus,
          paymentStatus: data.paymentStatus,
          paymentNote: data.paymentNote,
          paymentNoteAuthor: data.paymentNoteAuthor,
          paymentNoteDate: data.paymentNoteDate
        });
        if (String(data.paymentMethod || "") === "BANK_TRANSFER") {
          try {
            const st = await bankTransferService.getStatus(data.orderId);
            setWaitingConfirm(st.latestAttempt?.status === "WAITING_CONFIRM");
          } catch {
            setWaitingConfirm(false);
          }
        } else {
          setWaitingConfirm(false);
        }
        const uniqueProductIds = Array.from(
          new Set(
            (data.items || [])
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
            (data.items || [])
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
        setError(e?.message || "Không thể tải chi tiết đơn hàng.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const canCancel = React.useMemo(() => {
    const s = String(order?.orderStatus || "");
    return ["PENDING_CONFIRM", "PENDING_PAYMENT_CONFIRMATION", "CONFIRMED", "PENDING_PICKUP"].includes(s);
  }, [order?.orderStatus]);

  const total = React.useMemo(() => {
    if (!order?.items) return 0;
    return order.items.reduce((sum, it) => {
      return sum + toNumberSafe(it.productPrice) * toNumberSafe(it.quantity);
    }, 0);
  }, [order]);

  const steps = React.useMemo(() => {
    return STATUS_STEPS.filter(s => {
      if (s.id === "PENDING_PAYMENT_CONFIRMATION") {
        return order?.paymentMethod === "BANK_TRANSFER";
      }
      return true;
    });
  }, [order?.paymentMethod]);

  const currentStatusIdx = React.useMemo(() => {
    if (!order) return -1;
    return steps.findIndex(s => s.id === order.orderStatus);
  }, [steps, order?.orderStatus]);

  const shouldShowContinuePayment = React.useMemo(() => {
    if (!order || order.paymentMethod !== "BANK_TRANSFER") return false;
    const cancelled = order.orderStatus === "CANCELLED";
    if (cancelled) return false; // Don't show for cancelled orders
    if (waitingConfirm) return false; // Already uploaded, waiting for confirmation
    
    const paymentStatus = getRealPaymentStatus({ ...order, waitingConfirm });
    // Show "Continue Payment" if unpaid OR if payment was rejected (has paymentNote from admin)
    return paymentStatus !== "PAID" || (order.paymentNote && order.paymentNoteAuthor);
  }, [order, waitingConfirm]);

  const canReview = String(order?.orderStatus || "") === "DELIVERED";

  async function handleReorder() {
    if (!order?.items) return;
    const customerId = readCustomerId();
    if (!customerId) {
      showToast("Vui lòng đăng nhập", "error");
      return;
    }
    try {
      let successCount = 0;
      let failedItems: string[] = [];
      for (const item of order.items) {
        try {
          await cartService.addItem({
            productId: Number(item.productId),
            productColorId: null, // Backend will derive from variant
            productVariantId: item.variantId || null,
            quantity: item.quantity || 1
          });
          successCount++;
        } catch (e: any) {
          failedItems.push(item.productName || "N/A");
        }
      }
      if (successCount > 0) {
        showToast(`Đã thêm ${successCount} sản phẩm vào giỏ hàng`, "success");
        if (failedItems.length > 0) {
          showToast(`Không thể thêm: ${failedItems.join(", ")}`, "error");
        }
      } else {
        showToast("Không thể thêm sản phẩm vào giỏ hàng", "error");
      }
    } catch (e: any) {
      showToast(e?.message || "Có lỗi khi thêm vào giỏ", "error");
    }
  }

  React.useEffect(() => {
    const customerId = readCustomerId();
    if (!order?.orderId || !customerId || !canReview) return;
    const fetchReviews = async () => {
      try {
        const reviews = await evaluateService.getByOrderIdForCustomer(order.orderId, customerId);
        const nextMap: Record<number, CustomerEvaluateDto> = {};
        const serverDrafts: Record<number, ReviewDraft> = {};
        reviews.forEach((rv) => {
          const itemId = Number(rv.orderItemId);
          if (!Number.isFinite(itemId) || itemId <= 0) return;
          nextMap[itemId] = rv;
          serverDrafts[itemId] = {
            rating: String(rv.rating),
            content: String(rv.content || ""),
            existingImageUrls: (rv.images || []).map((img) => img.imageUrl).filter(Boolean),
          };
        });
        setReviewMap(nextMap);
        setReviewDraftMap(serverDrafts);
      } catch { }
    };
    fetchReviews();
  }, [order?.orderId, canReview]);

  function setDraft(orderItemId: number, patch: Partial<ReviewDraft>) {
    setReviewDraftMap((prev) => ({
      ...prev,
      [orderItemId]: { ...(prev[orderItemId] || { rating: "0", content: "" }), ...patch }
    }));
  }

  async function saveReview(orderItemId: number) {
    const customerId = readCustomerId();
    if (!customerId) return;
    const draft = reviewDraftMap[orderItemId] || { rating: "0", content: "" };
    const rating = Number(draft.rating);
    if (!rating || rating < 1 || rating > 5) {
      showToast("Vui lòng chọn số sao", "error");
      return;
    }
    const orderItem = order?.items?.find((it) => Number(it.orderItemId) === orderItemId);
    if (!orderItem?.productId) return;
    setReviewLoadingMap((prev) => ({ ...prev, [orderItemId]: true }));
    try {
      const saved = await evaluateService.upsertByOrderItemForCustomer(orderItemId, {
        customerId,
        productId: Number(orderItem.productId),
        rating,
        content: draft.content,
        images: draft.images || [],
        existingImageUrls: draft.existingImageUrls || [],
      });
      setReviewMap((prev) => ({ ...prev, [orderItemId]: saved }));
      setEditingReviewItemIds((prev) => ({ ...prev, [orderItemId]: false }));
    } catch (e: any) {
      showToast(e?.message || "Lỗi lưu đánh giá", "error");
    } finally {
      setReviewLoadingMap((prev) => ({ ...prev, [orderItemId]: false }));
    }
  }

  async function deleteReview(orderItemId: number) {
    const customerId = readCustomerId();
    if (!customerId) return;
    const ok = await confirm({
      title: "Xóa đánh giá",
      message: "Bạn có chắc muốn xóa đánh giá này?",
      type: "danger",
      confirmText: "XÓA",
    });
    if (!ok) return;
    setReviewLoadingMap((prev) => ({ ...prev, [orderItemId]: true }));
    try {
      await evaluateService.deleteByOrderItemForCustomer(orderItemId, customerId);
      setReviewMap((prev) => {
        const next = { ...prev };
        delete next[orderItemId];
        return next;
      });
      setDraft(orderItemId, { rating: "0", content: "", images: [], existingImageUrls: [] });
    } catch (e: any) {
      showToast(e?.message || "Lỗi xóa đánh giá", "error");
    } finally {
      setReviewLoadingMap((prev) => ({ ...prev, [orderItemId]: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertCircle className="h-16 w-16 text-rose-500" />
        <h2 className="text-xl font-bold">{error || "Không tìm thấy đơn hàng"}</h2>
        <Link href="/order" className="rounded-xl bg-purple-600 px-6 py-2 text-sm font-bold text-white">Quay lại</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 py-4 animate-page sm:space-y-8 sm:py-6">
      {/* Fixed back button via portal */}
      {typeof window !== "undefined" && createPortal(
        <div className="fixed left-3 top-[3.5rem] z-[190] sm:left-4 sm:top-[4.25rem]">
          <Link href="/order" className="group flex items-center gap-2 rounded-full border border-zinc-600 bg-zinc-900/90 py-1.5 pl-2 pr-4 text-sm font-bold text-slate-400 backdrop-blur-md transition-colors hover:border-purple-600 hover:text-purple-400">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 transition-all group-hover:bg-purple-600 group-hover:text-white">
              <ChevronLeft className="h-3.5 w-3.5" />
            </div>
            Quay lại
          </Link>
        </div>,
        document.body
      )}

      {/* Order code row */}
      <div className="flex items-center gap-3 pt-8 sm:pt-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Mã đơn hàng</span>
        <span className="rounded-lg bg-purple-50 px-3 py-1 text-sm font-black text-purple-600 dark:bg-purple-500/10">
          #{order.orderCode || order.orderId}
        </span>
      </div>

      {/* PROGRESS STEPPER */}
      {!isCancelled && (
        <div className="rounded-2xl customer-card-surface border border-zinc-500/70 bg-zinc-800/55 p-4 backdrop-blur-md sm:rounded-[2.5rem] sm:p-6 lg:p-8">
          <div className="overflow-x-auto pb-3">
            <div className="flex min-w-[440px] items-center pb-1 sm:min-w-0">
              {steps.map((step, idx) => {
                const isPast = idx < currentStatusIdx;
                const isCurrent = idx === currentStatusIdx;

                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <div className={`
                        flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-500
                        ${isPast ? "bg-emerald-500 text-white" : isCurrent ? "bg-purple-600 text-white" : "bg-zinc-700 text-zinc-400"}
                      `}>
                        {isPast ? <CheckCircle2 className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                      </div>
                      <span className={`text-center text-[11px] font-bold leading-tight px-1 min-w-[70px] ${isCurrent ? "text-purple-400" : "text-slate-500"}`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="relative h-1 flex-1 min-w-[20px] -mx-0">
                        <div className={`absolute inset-0 rounded-full transition-all duration-500 ${idx < currentStatusIdx ? "bg-zinc-600" : "bg-purple-600/40"}`} />
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000 rounded-full shadow-sm shadow-emerald-500/30"
                          style={{ width: idx < currentStatusIdx ? "100%" : "0%" }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isCancelled && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 flex flex-col gap-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-rose-700 backdrop-blur-xl sm:mb-10 sm:flex-row sm:items-center sm:gap-6 sm:rounded-[2.5rem] sm:p-8 dark:border-rose-900/20 dark:bg-rose-500/5 dark:text-rose-400"
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/20">
            <XCircle className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black tracking-tight">Đơn hàng đã bị hủy</h3>
            <div className="mt-2 space-y-2">
              <p className="text-sm font-medium opacity-70">
                Lý do: <span className="font-bold">
                  {(() => {
                    if (!order.cancelReasonName || order.cancelReasonName === "N/A") {
                      if (order.createdAt) {
                        const createdTime = new Date(order.createdAt).getTime();
                        const cancelledTime = order.cancelledAt ? new Date(order.cancelledAt).getTime() : Date.now();
                        const diffMinutes = (cancelledTime - createdTime) / (1000 * 60);
                        if (diffMinutes >= 30) {
                          return "Chưa thanh toán";
                        }
                      }
                      return "N/A";
                    }
                    return order.cancelReasonName;
                  })()}
                </span>
              </p>
              {order.cancelNote && (
                <p className="text-sm italic opacity-60">"{order.cancelNote}"</p>
              )}
              <p className="text-xs font-medium opacity-50 italic mt-2">
                Hủy bởi: {order.cancelledBy === "CUSTOMER" ? "Bạn" : (order.cancelledBy || "Hệ thống")} • {formatDate(order.cancelledAt)}
              </p>
            </div>
            <button
              onClick={handleReorder}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white hover:bg-purple-700 transition-all active:scale-95 shadow-lg shadow-purple-500/20"
            >
              <Package className="h-4 w-4" />
              Mua lại
            </button>
          </div>
        </motion.div>
      )}

      {/* Payment Approval Note - Show when payment approved (PAID + has paymentNote) */}
      {!isCancelled && order?.paymentStatus === "PAID" && order?.paymentNote && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 backdrop-blur-xl sm:mb-10 sm:rounded-[2.5rem] sm:p-6 lg:p-8 dark:border-emerald-900/20 dark:bg-emerald-500/5"
        >
          <div className="mb-4 flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
            <h3 className="text-lg font-black tracking-tight sm:text-xl">Thanh toán đã được xác nhận</h3>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 dark:text-emerald-500">Người xử lý</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {order.paymentNoteAuthor || "Admin"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 dark:text-emerald-500">Thời gian</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatDate(order.paymentNoteDate) || "-"}
                </div>
              </div>
            </div>
            {order.paymentNote && (
              <div className="rounded-xl bg-white/50 p-4 dark:bg-black/20">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 dark:text-emerald-500 mb-2">Ghi chú</div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {order.paymentNote}
                </p>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Đơn hàng của bạn đang được xử lý
            </div>
          </div>
        </motion.div>
      )}

      {/* Payment Rejection Warning - Show when payment rejected (CONFIRMED + UNPAID + has paymentNote) */}
      {!isCancelled && order?.orderStatus === "CONFIRMED" && order?.paymentStatus === "UNPAID" && order?.paymentNote && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 rounded-2xl border border-amber-100 bg-amber-50/50 p-4 backdrop-blur-xl sm:mb-10 sm:rounded-[2.5rem] sm:p-6 lg:p-8 dark:border-amber-900/20 dark:bg-amber-500/5"
        >
          <div className="mb-4 flex items-center gap-3 text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-6 w-6" />
            <h3 className="text-lg font-black tracking-tight sm:text-xl">Minh chứng thanh toán bị từ chối</h3>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 dark:text-amber-500">Người xử lý</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {order.paymentNoteAuthor || "Admin"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 dark:text-amber-500">Thời gian</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatDate(order.paymentNoteDate) || "-"}
                </div>
              </div>
            </div>
            {order.paymentNote && (
              <div className="rounded-xl bg-white/50 p-4 dark:bg-black/20">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 dark:text-amber-500 mb-2">Lý do từ chối</div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {order.paymentNote}
                </p>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              Vui lòng thanh toán lại để tiếp tục đơn hàng
            </div>
          </div>
        </motion.div>
      )}

      {/* TOP DASHBOARD: Customer, Address, Payment */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
        {/* Card: Customer Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="group overflow-hidden rounded-2xl customer-card-surface border border-zinc-500/70 bg-zinc-800/55 p-4 ring-1 ring-zinc-500/35 shadow-2xl shadow-black/20 backdrop-blur-md sm:rounded-[2.5rem] sm:p-6 lg:p-8"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 transition-all group-hover:bg-purple-600 group-hover:text-white sm:h-14 sm:w-14 dark:bg-purple-500/10">
              <User className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Khách hàng</h4>
              <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{order.customerName || "N/A"}</p>
            </div>
          </div>
          <div className="mt-8 space-y-4 border-t border-slate-50 pt-8 dark:border-slate-800">
            <div className="flex items-center gap-4 text-sm font-bold text-slate-600 dark:text-slate-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-white/5">
                <Phone className="h-4 w-4" />
              </div>
              {order.receiverPhone || "N/A"}
            </div>
            <div className="flex items-center gap-4 text-sm font-bold text-slate-600 dark:text-slate-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-white/5">
                <Mail className="h-4 w-4" />
              </div>
              <span className="truncate">{order.email || "N/A"}</span>
            </div>
          </div>
        </motion.div>

        {/* Card: Shipping Address */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`group overflow-hidden rounded-2xl p-4 customer-card-surface sm:rounded-[2.5rem] sm:p-6 lg:p-8 border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 shadow-2xl shadow-black/20 backdrop-blur-md`}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition-all group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-500/10">
              <MapPin className="h-7 w-7" />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Giao hàng đến</h4>
              <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">Địa chỉ nhận</p>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-50 pt-8 dark:border-slate-800">
            <p className="text-sm font-bold leading-relaxed text-slate-700 dark:text-slate-300">
              {order.shippingAddress || "Chưa cung cấp địa chỉ"}
            </p>
            <div className="mt-6 flex items-center gap-2">
              <div className="flex h-7 items-center gap-2 rounded-full bg-emerald-50 px-3 text-[10px] font-black uppercase text-emerald-600 dark:bg-emerald-500/10">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Địa chỉ đã xác thực
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card: Payment Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`relative overflow-hidden rounded-2xl p-4 customer-card-surface sm:rounded-[2.5rem] sm:p-6 lg:p-8 border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 shadow-2xl shadow-black/20 backdrop-blur-md`}
        >
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-purple-500/5 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Thanh toán</h4>
              <span className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest ${(PAYMENT_CONFIG[getRealPaymentStatus({ ...order, waitingConfirm })]?.color || "text-slate-400").replace('text-', 'bg-').replace('-600', '-500/10 text-')}`}>
                {PAYMENT_CONFIG[getRealPaymentStatus({ ...order, waitingConfirm })]?.label || "N/A"}
              </span>
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Tổng giá trị đơn hàng</span>
                <p className="mt-1 text-2xl font-black tracking-tight text-purple-600 sm:text-3xl lg:text-4xl">{formatVnd(total)}</p>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Trạng thái</p>
                    <p className={`mt-1 text-xs font-black ${STATUS_CONFIG[order.orderStatus || ""]?.color}`}>
                      {STATUS_CONFIG[order.orderStatus || ""]?.label}
                    </p>
                  </div>
                </div>
              </div>

              {canCancel && (
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-rose-50 py-4 text-xs font-black text-rose-600 transition-all hover:bg-rose-600 hover:text-white shadow-lg shadow-rose-500/10 active:scale-95 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Hủy đơn hàng ngay
                </button>
              )}

              {shouldShowContinuePayment && (
                <Link
                  href={`/payment?orderId=${order.orderId}`}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-50 py-4 text-xs font-black text-cyan-600 transition-all hover:bg-cyan-600 hover:text-white shadow-lg shadow-cyan-500/10 active:scale-95"
                >
                  <CreditCard className="h-4 w-4" />
                  Tiếp tục thanh toán
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Admin Payment Approval Note - Show when payment is approved (PAID + has paymentNote) */}
      {!isCancelled && order?.paymentStatus === "PAID" && (order?.paymentNote || order?.paymentNoteAuthor) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 backdrop-blur-xl dark:border-emerald-900/20 dark:bg-emerald-500/5"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                Thanh toán đã được xác nhận
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 dark:text-emerald-500">
                    Xác nhận bởi
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {order.paymentNoteAuthor || "Admin"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 dark:text-emerald-500">
                    Thời gian
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatDate(order.paymentNoteDate) || "-"}
                  </div>
                </div>
              </div>
              {order.paymentNote && (
                <div className="rounded-xl bg-white/50 p-4 dark:bg-black/20">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 dark:text-emerald-500 mb-2">
                    Ghi chú
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {order.paymentNote}
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ELITE PRODUCTS LIST */}
      <div className="space-y-12">
        <div className="flex items-center justify-between px-6">
          <h3 className="flex flex-wrap items-center gap-3 text-xl font-black tracking-tight text-slate-900 sm:gap-5 sm:text-2xl lg:text-4xl dark:text-white">
            <Box className="h-12 w-12 text-purple-600" />
            Sản phẩm đã đặt
          </h3>
          <div className="hidden sm:block">
            <span className="rounded-full bg-slate-100 px-6 py-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:bg-white/5">
              Tổng cộng {order.items?.length || 0} sản phẩm
            </span>
          </div>
        </div>

        <div className="grid gap-4">
          {(order.items || []).map((it, idx) => {
            const orderItemId = Number(it.orderItemId);
            const review = reviewMap[orderItemId];
            const draft = reviewDraftMap[orderItemId];
            const isEditing = editingReviewItemIds[orderItemId];
            const isReviewLoading = reviewLoadingMap[orderItemId];

            const nameKey = normalizeText(it.productName);
            let product = productMap[Number(it.productId)] || (nameKey ? productByNameMap[nameKey] : undefined);
            const specs = [
              { label: "Màu", value: it.colorName },
              { label: "RAM", value: normalizeText((it as any)?.productRam ?? (it as any)?.ram) || (it.ramGb ? `${it.ramGb}GB` : null) },
              { label: "Bộ nhớ", value: normalizeText((it as any)?.productMemory ?? (it as any)?.storage) || (it.storageGb ? `${it.storageGb}GB` : null) },
              { label: "Chip", value: normalizeText((it as any)?.productChip ?? (it as any)?.chip) || getSpecValue(product, "chip") },
            ].filter((s): s is { label: string; value: string } => !!s.value);

            return (
              <motion.div
                key={it.orderItemId || idx}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="group relative overflow-hidden rounded-[1.5rem] customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 shadow-xl shadow-black/20"
              >
                <div className="flex flex-col p-4 md:flex-row md:gap-6">
                  {/* Ultra-Compact Image Section */}
                  <div className="relative aspect-[9/16] w-full shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 md:w-32 dark:border-slate-800 dark:bg-slate-950">
                    {(() => {
                      const orderColorName = normalizeText(it.colorName);
                      let matchedImage: string | null = null;
                      if (orderColorName && product?.productColors) {
                        const matched = product.productColors.find(c => normalizeText(c.colorName)?.toLowerCase() === orderColorName.toLowerCase());
                        if (matched?.images?.[0]) matchedImage = matched.images[0];
                      }
                      const src = resolveImageUrl(matchedImage || it.imageUrl || product?.productMainImage || (product?.productImages?.[0]?.imageUrl));
                      return src ? (
                        <img src={src} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" alt={it.productName || "Product Image"} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-200">
                          <Package className="h-8 w-8 opacity-10" />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Ultra-Compact Content Section */}
                  <div className="mt-4 flex-1 md:mt-0">
                    <div className="flex flex-col justify-between h-full">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-lg font-black text-slate-900 transition-colors group-hover:text-purple-600 dark:text-white leading-tight">
                              {it.productName}
                            </h4>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {specs.map((s, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-white/5">
                                  <span className="uppercase text-slate-400">{s.label}:</span>
                                  <span className="text-slate-900 dark:text-white">{s.value}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-emerald-600">{formatVnd(toNumberSafe(it.productPrice))}</p>
                            <p className="text-[9px] font-bold uppercase text-slate-400">Số lượng: {it.quantity}</p>
                          </div>
                        </div>

                        {/* Ultra-Compact Feedback System */}
                        {canReview && (
                          <div className="rounded-xl border border-purple-50/50 bg-purple-50/10 p-3 dark:border-purple-900/10 dark:bg-purple-900/5">
                            {!isEditing && review ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                                    ))}
                                  </div>
                                  <div className="flex gap-3">
                                    <button onClick={() => setEditingReviewItemIds(prev => ({ ...prev, [orderItemId]: true }))} className="p-1 text-slate-400 hover:text-purple-600 transition-colors"><Edit3 className="h-5 w-5" /></button>
                                    <button onClick={() => deleteReview(orderItemId)} className="p-1 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="h-5 w-5" /></button>
                                  </div>
                                </div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 italic">"{review?.content || "N/A"}"</p>

                                {/* Ảnh đính kèm đánh giá */}
                                {review.images && review.images.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {review.images.map((img, i) => (
                                      <div key={i} className="w-16 overflow-hidden rounded-lg" style={{ aspectRatio: "9/16" }}>
                                        <img
                                          src={resolveImageUrl(img.imageUrl)}
                                          className="h-full w-full object-cover ring-1 ring-slate-200"
                                          alt={`review-img-${i}`}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {review.adminReply && (
                                  <div className="mt-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 dark:border-emerald-400/30 dark:bg-emerald-500/15">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600 text-[9px] font-black text-white shadow-sm">S</span>
                                      <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300">Phản hồi từ Shop</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 leading-relaxed dark:text-slate-200">{review.adminReply}</p>
                                  </div>
                                )}
                              </div>
                            ) : isEditing || !review ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <button key={s} onClick={() => setDraft(orderItemId, { rating: String(s) })}>
                                        <Star className={`h-5 w-5 ${s <= Number(draft?.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                                      </button>
                                    ))}
                                  </div>
                                  <label className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-purple-600">
                                    <Camera className="h-3 w-3" /> <span>Thêm ảnh</span>
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={e => {
                                      const files = Array.from((e.target as HTMLInputElement).files || []);
                                      if (files.length === 0) return;
                                      setDraft(orderItemId, {
                                        images: [
                                          ...(reviewDraftMap[orderItemId]?.images || []),
                                          ...files,
                                        ]
                                      });
                                      // reset input để có thể chọn lại cùng file
                                      (e.target as HTMLInputElement).value = "";
                                    }} />
                                  </label>
                                </div>
                                <textarea
                                  className="w-full rounded-lg border-none bg-white p-3 text-sm placeholder:text-slate-300 focus:ring-2 focus:ring-purple-500/10 dark:bg-slate-800 shadow-inner"
                                  placeholder="Đánh giá sản phẩm..."
                                  value={draft?.content || ""}
                                  onChange={e => setDraft(orderItemId, { content: (e.target as HTMLTextAreaElement).value })}
                                />

                                {/* Preview ảnh đã chọn */}
                                {((draft?.images?.length || 0) > 0 || (draft?.existingImageUrls?.length || 0) > 0) && (
                                  <div className="flex flex-wrap gap-2">
                                    {/* Ảnh cũ từ server */}
                                    {(draft?.existingImageUrls || []).map((url, i) => (
                                      <div key={`existing-${i}`} className="relative group/img w-16" style={{ aspectRatio: "9/16" }}>
                                        <img
                                          src={resolveImageUrl(url)}
                                          className="h-full w-full rounded-lg object-cover ring-1 ring-slate-200"
                                          alt={`review-existing-${i}`}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next = (draft?.existingImageUrls || []).filter((_, idx) => idx !== i);
                                            setDraft(orderItemId, { existingImageUrls: next });
                                          }}
                                          className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 group-hover/img:opacity-100 transition-opacity text-[10px]"
                                        >×</button>
                                      </div>
                                    ))}
                                    {/* Ảnh mới chọn */}
                                    {(draft?.images || []).map((file, i) => {
                                      const previewUrl = URL.createObjectURL(file);
                                      return (
                                        <div key={`new-${i}`} className="relative group/img w-16" style={{ aspectRatio: "9/16" }}>
                                          <img
                                            src={previewUrl}
                                            className="h-full w-full rounded-lg object-cover ring-1 ring-purple-200"
                                            alt={`review-new-${i}`}
                                            onLoad={() => URL.revokeObjectURL(previewUrl)}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const next = (draft?.images || []).filter((_, idx) => idx !== i);
                                              setDraft(orderItemId, { images: next });
                                            }}
                                            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 group-hover/img:opacity-100 transition-opacity text-[10px]"
                                          >×</button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className="flex justify-end gap-2">
                                  {isEditing && <button onClick={() => setEditingReviewItemIds(prev => ({ ...prev, [orderItemId]: false }))} className="text-[10px] font-bold text-slate-400 uppercase">Hủy</button>}
                                  <button onClick={() => saveReview(orderItemId)} className="rounded-lg bg-purple-600 px-4 py-1.5 text-[10px] font-black text-white shadow-md">Gửi</button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <CancelOrderModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onSuccess={(updatedOrder) => {
          setOrder(updatedOrder);
          setWaitingConfirm(false);
        }}
        orderId={id}
        customerId={readCustomerId() || 0}
      />
    </div>
  );
}
