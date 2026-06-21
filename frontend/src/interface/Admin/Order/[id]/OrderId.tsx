"use client";

import Link from "next/link";
import AdminActionBar from "@/components/admins/AdminActionBar";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  Info,
} from "lucide-react";

import { orderService, type OrderDto, type OrderStatus } from "@/services/orderService";
import { productService, type ProductDto, type ProductSpecDto } from "@/services/productService";
import { AdminCancelOrderModal } from "@/components/admins/AdminCancelOrderModal";
import {
  STATUS_OPTIONS,
  getRealPaymentStatus,
  statusLabel,
  statusBadgeClass,
  paymentLabel,
  paymentBadgeClass,
  paymentMethodBadgeClass,
  formatPaymentMethodLabel,
} from "@/services/orderAdminDisplay";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

function toNumberSafe(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
}

function normalizeColor(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "null") return null;
  return s;
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour12: false });
}

function parseIdFromPathname(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const maybeId = parts[parts.length - 1] || "";
  return maybeId;
}

type SpecField = "chip" | "screen" | "battery" | "cameraRear" | "cameraFront" | "operatingSystem" | "size" | "weight" | "material" | "refreshRate" | "fastCharge" | "waterResistance" | "chargingPort" | "sim" | "warranty" | "version";

function getSpecValue(product: ProductDto | undefined, field: SpecField): string | null {
  if (!product?.productSpecs || product.productSpecs.length === 0) return null;
  const spec = product.productSpecs[0];
  if (!spec) return null;
  const value = spec[field];
  if (value == null) return null;
  const s = String(value).trim();
  if (!s || s.toLowerCase() === "null") return null;
  return s;
}

function getSpecBoolean(product: ProductDto | undefined, field: "support5g" | "nfc"): boolean | null {
  if (!product?.productSpecs || product.productSpecs.length === 0) return null;
  const spec = product.productSpecs[0];
  if (!spec) return null;
  const value = spec[field];
  if (value === null || value === undefined) return null;
  return Boolean(value);
}

export default function OrderId() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const idStr = React.useMemo(() => parseIdFromPathname(pathname), [pathname]);
  const id = Number(idStr);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [order, setOrder] = React.useState<OrderDto | null>(null);
  const [status, setStatus] = React.useState<OrderStatus>("PENDING_CONFIRM");
  const [openStatusDropdown, setOpenStatusDropdown] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<NonNullable<OrderDto["items"]>[number] | null>(null);
  const [productMap, setProductMap] = React.useState<Record<number, ProductDto>>({});
  const [isAdminCancelOpen, setIsAdminCancelOpen] = React.useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = React.useState(false);
  const [refundStatus, setRefundStatus] = React.useState<"REFUND_PENDING" | "REFUNDED" | "PARTIAL_REFUNDED">("REFUND_PENDING");
  const [refundNote, setRefundNote] = React.useState("");
  const [refundSaving, setRefundSaving] = React.useState(false);
  const [openRefundDropdown, setOpenRefundDropdown] = React.useState(false);
  const [userRole, setUserRole] = React.useState<string | null>(null);

  const items = React.useMemo(() => order?.items || [], [order]);

  const total = React.useMemo(() => {
    return items.reduce((sum, it) => sum + toNumberSafe(it.productPrice) * toNumberSafe(it.quantity), 0);
  }, [items]);

  const totalQuantity = React.useMemo(() => {
    return items.reduce((sum, it) => sum + toNumberSafe(it.quantity), 0);
  }, [items]);

  React.useEffect(() => {
    // Get user role from localStorage
    if (typeof window !== "undefined") {
      const userRaw = localStorage.getItem("user");
      if (userRaw) {
        try {
          const user = JSON.parse(userRaw);
          setUserRole(user.role?.toUpperCase() || null);
        } catch {
          // ignore
        }
      }
    }
  }, []);

  React.useEffect(() => {
    if (!Number.isFinite(id) || Number.isNaN(id)) {
      setError("ID đơn hàng không hợp lệ.");
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getById(id);
      setOrder(data);
      console.log("📦 [Admin OrderId] Order loaded:", {
        orderId: data.orderId,
        orderStatus: data.orderStatus,
        paymentStatus: data.paymentStatus,
        adminNote: data.adminNote,
        adminNoteAuthor: data.adminNoteAuthor,
        adminNoteDate: data.adminNoteDate
      });
      const s = String(data.orderStatus || "PENDING_CONFIRM") as OrderStatus;
      setStatus(s);

      // Preload all products from order items (load individually to avoid batch errors)
      const productIds = (data.items || [])
        .map((it) => toNumberSafe((it as any)?.productId))
        .filter((pid) => pid > 0);
      const uniqueIds = [...new Set(productIds)];
      if (uniqueIds.length > 0) {
        const results = await Promise.allSettled(
          uniqueIds.map((pid) => productService.getById(pid).catch(() => undefined))
        );
        const productRecord: Record<number, ProductDto> = {};
        results.forEach((result, idx) => {
          if (result.status === "fulfilled" && result.value) {
            const p = result.value;
            if (p.productId) productRecord[p.productId] = p;
          }
        });
        setProductMap(productRecord);
      }
    } catch (e: any) {
      setError(e?.message || "Không thể tải chi tiết đơn hàng.");
    } finally {
      setLoading(false);
    }
  }

  async function saveStatus() {
    if (!Number.isFinite(id) || Number.isNaN(id)) return;
    
    if (status === "CANCELLED") {
      setIsAdminCancelOpen(true);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await orderService.updateStatus(id, { status });
      await load();
    } catch (e: any) {
      setError(e?.message || "Không thể cập nhật trạng thái.");
    } finally {
      setSaving(false);
    }
  }

  async function saveRefundStatus() {
    if (!Number.isFinite(id) || Number.isNaN(id)) return;
    
    if (!refundNote.trim()) {
      setError("Vui lòng nhập lý do hoàn tiền.");
      return;
    }

    setRefundSaving(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      
      const response = await fetch(`${API_URL}/api/admin/orders/${id}/payment-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          paymentStatus: refundStatus,
          note: refundNote,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Không thể cập nhật trạng thái thanh toán.");
      }

      await load();
      setIsRefundModalOpen(false);
      setRefundNote("");
    } catch (e: any) {
      setError(e?.message || "Không thể cập nhật trạng thái thanh toán.");
    } finally {
      setRefundSaving(false);
    }
  }

  React.useEffect(() => {
    if (!openRefundDropdown) return;
    function onWindowClick() {
      setOpenRefundDropdown(false);
    }
    window.addEventListener("click", onWindowClick);
    return () => window.removeEventListener("click", onWindowClick);
  }, [openRefundDropdown]);

  React.useEffect(() => {
    if (!openStatusDropdown) return;
    function onWindowClick() {
      setOpenStatusDropdown(false);
    }
    window.addEventListener("click", onWindowClick);
    return () => window.removeEventListener("click", onWindowClick);
  }, [openStatusDropdown]);

  // Load product when modal opens if not in cache
  React.useEffect(() => {
    if (!selectedItem) return;
    const rawProductId = (selectedItem as any)?.productId;
    if (rawProductId == null) return;
    const productId = Number(rawProductId);
    if (!Number.isFinite(productId) || Number.isNaN(productId) || productId <= 0) return;

    let cancelled = false;
    setProductMap((prev) => {
      if (prev[productId]) return prev; // Already loaded

      // Load product asynchronously
      productService
        .getById(productId)
        .then((p) => {
          if (cancelled) return;
          setProductMap((current) => ({ ...current, [productId]: p }));
        })
        .catch(() => {
          // Silent fail - modal still works with order item data
        });

      return prev;
    });

    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Chi tiết đơn hàng
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Chi tiết đơn hàng</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Xem thông tin và cập nhật trạng thái đơn hàng.</p>
        </div>

        {order && order.orderStatus !== "DELIVERED" && order.orderStatus !== "CANCELLED" && (
          <button
            onClick={() => setIsAdminCancelOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-50 px-6 py-2.5 text-sm font-bold text-rose-600 shadow-sm ring-1 ring-rose-200 transition-all hover:bg-rose-600 hover:text-white hover:ring-rose-600 active:scale-95 dark:bg-rose-500/10 dark:ring-rose-500/20 dark:hover:bg-rose-500 dark:hover:text-white"
          >
            <XCircle className="h-4 w-4" />
            Hủy đơn hàng
          </button>
        )}
      </div>
      <AdminActionBar backHref="/orders" />

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

      {order ? (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Mã đơn hàng</div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {String(order.orderCode || order.orderId)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Tên người nhận</div>
                <div className="mt-1 text-sm text-slate-800 dark:text-slate-200">{order.receiverName || order.customerName || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Số điện thoại</div>
                <div className="mt-1 text-sm text-slate-800 dark:text-slate-200">{order.receiverPhone || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Email</div>
                <div className="mt-1 text-sm text-slate-800 dark:text-slate-200">{order.email || "-"}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Địa chỉ giao hàng</div>
                <div className="mt-1 text-sm text-slate-800 dark:text-slate-200">{order.shippingAddress || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Trạng thái đơn hàng
                </div>
                <div className="mt-1">
                  <span
                    className={
                      "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold " +
                      statusBadgeClass(order.orderStatus)
                    }
                  >
                    {statusLabel(order.orderStatus)}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Trạng thái thanh toán
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={
                      "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold " +
                      paymentBadgeClass(getRealPaymentStatus(order))
                    }
                  >
                    {paymentLabel(getRealPaymentStatus(order))}
                  </span>
                  {/* Show refund button only for ADMIN (not STAFF) */}
                  {userRole === "ADMIN" && order.paymentStatus === "PAID" && order.orderStatus !== "CANCELLED" && order.orderStatus !== "DELIVERED" && (
                    <button
                      onClick={() => setIsRefundModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-200 transition-all hover:bg-blue-600 hover:text-white hover:ring-blue-600 active:scale-95 dark:bg-blue-500/10 dark:ring-blue-500/20 dark:hover:bg-blue-500"
                      title="Cập nhật trạng thái hoàn tiền"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Hoàn tiền
                    </button>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Loại thanh toán
                </div>
                <div className="mt-1">
                  <span
                    className={
                      "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold " +
                      paymentMethodBadgeClass(order.paymentMethod)
                    }
                  >
                    {formatPaymentMethodLabel(order.paymentMethod)}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Tổng số lượng sản phẩm
                </div>
                <div className="mt-1 text-sm text-slate-800 dark:text-slate-200">{totalQuantity}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Ngày tạo</div>
                <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{formatDate(order.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Ngày cập nhật</div>
                <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{formatDate(order.updatedAt)}</div>
              </div>
            </div>
          </div>

          {/* Admin Payment Note - Show for approved payments */}
          {order.orderStatus !== "CANCELLED" && order.paymentStatus === "PAID" && order.adminNoteAuthor && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm backdrop-blur dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <div className="mb-4 flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                Ghi chú xác nhận thanh toán
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 dark:text-emerald-500">Xác nhận bởi</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {order.adminNoteAuthor || "Admin"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 dark:text-emerald-500">Thời gian</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatDate(order.adminNoteDate) || "-"}
                  </div>
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 dark:text-emerald-500">Trạng thái</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    Đã xác nhận thanh toán
                  </div>
                </div>
                <div className="md:col-span-2 lg:col-span-4 space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 dark:text-emerald-500">Ghi chú</div>
                  <div className="rounded-2xl bg-white/50 p-3 text-sm text-slate-700 dark:bg-black/20 dark:text-slate-300">
                    {order.adminNote || "(Không có ghi chú)"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Refund Status Info - Show for refund pending/refunded orders */}
          {order.orderStatus !== "CANCELLED" && (order.paymentStatus === "REFUND_PENDING" || order.paymentStatus === "REFUNDED" || order.paymentStatus === "PARTIAL_REFUNDED") && order.adminNoteAuthor && (
            <div className="rounded-3xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm backdrop-blur dark:border-blue-500/20 dark:bg-blue-500/5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-400">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Thông tin hoàn tiền
                </div>
                {/* Show update button only for ADMIN and when status is REFUND_PENDING or PARTIAL_REFUNDED */}
                {userRole === "ADMIN" && (order.paymentStatus === "REFUND_PENDING" || order.paymentStatus === "PARTIAL_REFUNDED") && (
                  <button
                    onClick={() => setIsRefundModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-600 ring-1 ring-blue-200 transition-all hover:bg-blue-600 hover:text-white hover:ring-blue-600 active:scale-95 dark:bg-blue-500/10 dark:ring-blue-500/20 dark:hover:bg-blue-500"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Cập nhật
                  </button>
                )}
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-400 dark:text-blue-500">Người xử lý</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {order.adminNoteAuthor || "Admin"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-400 dark:text-blue-500">Thời gian</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatDate(order.adminNoteDate) || "-"}
                  </div>
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-400 dark:text-blue-500">Trạng thái hiện tại</div>
                  <div className="text-sm font-bold">
                    <span
                      className={
                        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold " +
                        paymentBadgeClass(order.paymentStatus)
                      }
                    >
                      {paymentLabel(order.paymentStatus)}
                    </span>
                  </div>
                </div>
                <div className="md:col-span-2 lg:col-span-4 space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-400 dark:text-blue-500">Ghi chú hoàn tiền</div>
                  <div className="rounded-2xl bg-white/50 p-3 text-sm text-slate-700 dark:bg-black/20 dark:text-slate-300">
                    {order.adminNote || "(Không có ghi chú)"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Payment Rejection Note - Show for rejected payments (not cancelled) */}
          {order.orderStatus !== "CANCELLED" && order.paymentStatus === "UNPAID" && order.orderStatus === "CONFIRMED" && order.adminNoteAuthor && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm backdrop-blur dark:border-amber-500/20 dark:bg-amber-500/5">
              <div className="mb-4 flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
                Ghi chú từ chối thanh toán
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 dark:text-amber-500">Từ chối bởi</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {order.adminNoteAuthor || "Admin"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 dark:text-amber-500">Thời gian</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatDate(order.adminNoteDate) || "-"}
                  </div>
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 dark:text-amber-500">Trạng thái</div>
                  <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    Minh chứng bị từ chối
                  </div>
                </div>
                <div className="md:col-span-2 lg:col-span-4 space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 dark:text-amber-500">Lý do từ chối</div>
                  <div className="rounded-2xl bg-white/50 p-3 text-sm text-slate-700 dark:bg-black/20 dark:text-slate-300">
                    {order.adminNote || "(Không có lý do)"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {order.orderStatus === "CANCELLED" && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm backdrop-blur dark:border-rose-500/20 dark:bg-rose-500/5">
              {(() => {
                const isCustomer = order.cancelledBy === "CUSTOMER";
                const isAdmin = order.cancelledBy === "ADMIN";
                const isSystem = order.cancelledBy === "SYSTEM";

                let title = "Thông tin hủy đơn hàng";
                let reasonLabel = "Lý do hủy đơn";
                let reasonValue = order.cancelReasonName || "N/A";
                
                // Check if order was cancelled after 30 minutes without payment
                if (!order.cancelReasonName || order.cancelReasonName === "N/A") {
                  if (order.createdAt) {
                    const createdTime = new Date(order.createdAt).getTime();
                    const cancelledTime = order.cancelledAt ? new Date(order.cancelledAt).getTime() : Date.now();
                    const diffMinutes = (cancelledTime - createdTime) / (1000 * 60);
                    if (diffMinutes >= 30) {
                      reasonValue = "Chưa thanh toán";
                    }
                  }
                }
                
                let noteValue = order.cancelNote;
                let actorLabel = "Người thực hiện";

                if (isSystem) {
                  title = "Thông tin hủy đơn hàng (Tự động)";
                } else if (isAdmin) {
                  title = "Thông tin Quản trị viên hủy đơn";
                } else if (isCustomer) {
                  title = "Thông tin Khách hàng hủy đơn";
                }

                return (
                  <>
                    <div className="mb-4 flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400">
                      <AlertCircle className="h-5 w-5" />
                      {title}
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-wider text-rose-400 dark:text-rose-500">{reasonLabel}</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {reasonValue}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-wider text-rose-400 dark:text-rose-500">{actorLabel}</div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {order.cancelledByName ? (
                            <span className="flex flex-col">
                              <span>{order.cancelledByName}</span>
                              <span className="text-[9px] font-black text-rose-400">({order.cancelledBy || "ADMIN"})</span>
                            </span>
                          ) : (
                            isCustomer ? "Khách hàng" : isSystem ? "Hệ thống" : (order.cancelledBy || "Hệ thống")
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-wider text-rose-400 dark:text-rose-500">Thời gian</div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {formatDate(order.cancelledAt)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-wider text-rose-400 dark:text-rose-500">Trạng thái hiện tại</div>
                        <div className="text-sm font-bold text-rose-600">
                          Đã hủy đơn
                        </div>
                      </div>
                      <div className="md:col-span-2 lg:col-span-4 space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-wider text-rose-400 dark:text-rose-500">Ghi chú chi tiết</div>
                        <div className="rounded-2xl bg-white/50 p-3 text-sm italic text-slate-700 dark:bg-black/20 dark:text-slate-300">
                          {noteValue || "Không có ghi chú bổ sung"}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur">
            <div className="flex flex-col gap-1 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/60">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sản phẩm trong đơn</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">Tổng tiền: {formatVnd(total)}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="px-5 py-3">Sản phẩm</th>
                    <th className="px-5 py-3">Màu</th>
                    <th className="px-5 py-3">RAM</th>
                    <th className="px-5 py-3">Bộ nhớ</th>
                    <th className="px-5 py-3">Đơn giá</th>
                    <th className="px-5 py-3 text-center">SL</th>
                    <th className="px-5 py-3">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {items.length === 0 ? (
                    <tr>
                      <td className="px-5 py-10 text-center text-slate-600 dark:text-slate-300" colSpan={7}>
                        Không có sản phẩm.
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => {
                      const price = toNumberSafe(it.productPrice);
                      const qty = toNumberSafe(it.quantity);
                      const color = normalizeColor((it as any)?.productColor ?? (it as any)?.product_color ?? it.colorName);
                      const ram = (it as any)?.ramGb != null ? `${String((it as any).ramGb)} GB` : "-";
                      const storage = (it as any)?.storageGb != null ? `${String((it as any).storageGb)} GB` : "-";
                      return (
                        <tr
                          key={String(it.orderItemId ?? idx)}
                          onClick={() => setSelectedItem(it)}
                          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{it.productName || "-"}</div>
                          </td>
                          <td className="px-5 py-4 text-slate-800 dark:text-slate-200">{color || "-"}</td>
                          <td className="px-5 py-4 text-slate-800 dark:text-slate-200">{ram}</td>
                          <td className="px-5 py-4 text-slate-800 dark:text-slate-200">{storage}</td>
                          <td className="px-5 py-4 text-slate-800 dark:text-slate-200">{formatVnd(price)}</td>
                          <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">{qty}</td>
                          <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">{formatVnd(price * qty)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cập nhật trạng thái</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Chọn trạng thái mới và bấm lưu.</div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenStatusDropdown((v) => !v);
                    }}
                    className="flex h-11 min-w-[230px] cursor-pointer items-center justify-between gap-3 rounded-2xl bg-slate-100 px-3 text-left text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                  >
                    <span className="truncate">{statusLabel(status)}</span>
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {openStatusDropdown ? (
                    <div
                      className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg animate-popover dark:border-white/10 dark:bg-slate-950"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="max-h-56 overflow-auto p-1">
                        {STATUS_OPTIONS.filter(opt => {
                          if (opt.value === "PENDING_PAYMENT_CONFIRMATION") {
                            return order?.paymentMethod === "BANK_TRANSFER" || order?.paymentMethod === "BANKING";
                          }
                          return true;
                        }).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setStatus(opt.value);
                              setOpenStatusDropdown(false);
                            }}
                            className={
                              "flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                              (status === opt.value
                                ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100"
                                : "text-slate-700 dark:text-slate-200")
                            }
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={saveStatus}
                  disabled={saving}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-500 active:translate-y-0 disabled:opacity-70 dark:bg-emerald-500/15 dark:text-emerald-100 dark:ring-emerald-400/30 dark:hover:bg-emerald-500/25"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <path d="M17 21v-8H7v8" />
                    <path d="M7 3v5h8" />
                  </svg>
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10"
                >
                  Làm mới
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedItem && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedItem(null)}
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
                className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] max-h-[calc(100vh-2rem)]"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  boxShadow: "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div
                  className="flex items-start justify-between gap-3 px-6 py-5 shrink-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}
                >
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">Thông tin sản phẩm</div>
                    <h3 className="mt-1 text-lg font-bold text-white/95">
                      {selectedItem.productName || "-"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="inline-flex cursor-pointer h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white/70 transition hover:-translate-y-0.5 hover:bg-rose-500 hover:text-white active:translate-y-0"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                  {(() => {
                    const rawProductId = (selectedItem as any)?.productId;
                    const productId = rawProductId != null ? Number(rawProductId) : null;
                    const product = productId != null && Number.isFinite(productId) && !Number.isNaN(productId) && productId > 0 ? productMap[productId] : undefined;

                    const versionFromSpec = getSpecValue(product, "version");
                    const chipFromSpec = getSpecValue(product, "chip");
                    const screenFromSpec = getSpecValue(product, "screen");
                    const batteryFromSpec = getSpecValue(product, "battery");
                    const cameraRearFromSpec = getSpecValue(product, "cameraRear");
                    const cameraFrontFromSpec = getSpecValue(product, "cameraFront");
                    const osFromSpec = getSpecValue(product, "operatingSystem");
                    const sizeFromSpec = getSpecValue(product, "size");
                    const weightFromSpec = getSpecValue(product, "weight");
                    const materialFromSpec = getSpecValue(product, "material");
                    const refreshRateFromSpec = getSpecValue(product, "refreshRate");
                    const fastChargeFromSpec = getSpecValue(product, "fastCharge");
                    const waterResistanceFromSpec = getSpecValue(product, "waterResistance");
                    const chargingPortFromSpec = getSpecValue(product, "chargingPort");
                    const simFromSpec = getSpecValue(product, "sim");
                    const warrantyFromSpec = getSpecValue(product, "warranty");
                    const support5g = getSpecBoolean(product, "support5g");
                    const nfc = getSpecBoolean(product, "nfc");

                    const ram = (selectedItem as any)?.ramGb != null ? `${String((selectedItem as any).ramGb)} GB` : "-";
                    const storage = (selectedItem as any)?.storageGb != null ? `${String((selectedItem as any).storageGb)} GB` : "-";
                    const color = normalizeColor((selectedItem as any)?.productColor ?? (selectedItem as any)?.product_color ?? (selectedItem as any)?.colorName) || "-";

                    const allSpecs = [
                      ...(versionFromSpec ? [{ label: "Phiên bản", value: versionFromSpec }] : []),
                      { label: "Màu sắc", value: color },
                      { label: "RAM", value: ram },
                      { label: "Bộ nhớ", value: storage },
                      ...(chipFromSpec ? [{ label: "Chip", value: chipFromSpec }] : []),
                      ...(screenFromSpec ? [{ label: "Màn hình", value: screenFromSpec }] : []),
                      ...(cameraRearFromSpec ? [{ label: "Camera sau", value: cameraRearFromSpec }] : []),
                      ...(cameraFrontFromSpec ? [{ label: "Camera trước", value: cameraFrontFromSpec }] : []),
                      ...(batteryFromSpec ? [{ label: "Pin", value: batteryFromSpec }] : []),
                      ...(osFromSpec ? [{ label: "Hệ điều hành", value: osFromSpec }] : []),
                      ...(refreshRateFromSpec ? [{ label: "Tần số quét", value: refreshRateFromSpec }] : []),
                      ...(fastChargeFromSpec ? [{ label: "Sạc nhanh", value: fastChargeFromSpec }] : []),
                      ...(sizeFromSpec ? [{ label: "Kích thước", value: sizeFromSpec }] : []),
                      ...(weightFromSpec ? [{ label: "Trọng lượng", value: weightFromSpec }] : []),
                      ...(materialFromSpec ? [{ label: "Chất liệu", value: materialFromSpec }] : []),
                      ...(waterResistanceFromSpec ? [{ label: "Chống nước", value: waterResistanceFromSpec }] : []),
                      ...(chargingPortFromSpec ? [{ label: "Cổng sạc", value: chargingPortFromSpec }] : []),
                      ...(simFromSpec ? [{ label: "SIM", value: simFromSpec }] : []),
                      ...(support5g !== null ? [{ label: "5G", value: support5g ? "Có" : "Không" }] : []),
                      ...(nfc !== null ? [{ label: "NFC", value: nfc ? "Có" : "Không" }] : []),
                      ...(warrantyFromSpec ? [{ label: "Bảo hành", value: warrantyFromSpec }] : []),
                    ];

                    const mid = Math.ceil(allSpecs.length / 2);
                    const leftSpecs = allSpecs.slice(0, mid);
                    const rightSpecs = allSpecs.slice(mid);

                    return (
                      <div className="flex flex-col gap-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {/* Basic Info Box */}
                          <div
                            className="rounded-[1.5rem] p-5"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                          >
                            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50">
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Thông tin cơ bản
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="grid grid-cols-[140px_1fr] gap-2">
                                <span className="text-white/50">Danh mục:</span>
                                <span className="text-white/90">{product?.categoryName || "-"}</span>
                              </div>
                              <div className="grid grid-cols-[140px_1fr] gap-2">
                                <span className="text-white/50">Thương hiệu:</span>
                                <span className="text-white/90">{product?.brandName || "-"}</span>
                              </div>
                              <div className="mt-3 flex items-center gap-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                                <span className="text-xs text-white/40 line-through">{formatVnd(toNumberSafe((selectedItem as any)?.originalPrice))}</span>
                                <span className="text-base font-medium text-emerald-400">{formatVnd(toNumberSafe(selectedItem.productPrice))}</span>
                              </div>
                            </div>
                          </div>

                          {/* Order Details Box */}
                          <div
                            className="rounded-[1.5rem] p-5"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                          >
                            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50">
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                              </svg>
                              Chi tiết đặt hàng
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="grid grid-cols-[140px_1fr] gap-2">
                                <span className="text-white/50">Phân loại:</span>
                                <span className="text-white/90">{color}, {ram}, {storage}</span>
                              </div>
                              <div className="grid grid-cols-[140px_1fr] gap-2">
                                <span className="text-white/50">Số lượng:</span>
                                <span className="text-white/90">{toNumberSafe(selectedItem.quantity)}</span>
                              </div>
                              <div className="mt-3 grid grid-cols-[140px_1fr] gap-2 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                                <span className="text-xs font-bold uppercase tracking-wider text-white/40">Thành tiền</span>
                                <span className="text-base font-medium text-emerald-400">
                                  {formatVnd(toNumberSafe(selectedItem.productPrice) * toNumberSafe(selectedItem.quantity))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Technical Specs */}
                        {allSpecs.length > 0 && (
                          <div
                            className="rounded-[1.5rem] p-5"
                            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                          >
                            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50">
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Thông số kỹ thuật
                            </div>
                            <div className="grid grid-cols-1 gap-x-10 gap-y-2 text-sm md:grid-cols-2">
                              <div className="space-y-2">
                                {leftSpecs.map((spec, idx) => (
                                  <div key={idx} className="grid grid-cols-[160px_1fr] gap-2 pb-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                    <span className="text-white/50">{spec.label}:</span>
                                    <span className="text-white/90">{spec.value}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="space-y-2">
                                {rightSpecs.map((spec, idx) => (
                                  <div key={idx} className="grid grid-cols-[160px_1fr] gap-2 pb-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                    <span className="text-white/50">{spec.label}:</span>
                                    <span className="text-white/90">{spec.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Footer */}
                <div
                  className="flex items-center justify-end px-6 py-4 shrink-0"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white/80 transition-all hover:-translate-y-0.5 hover:text-white active:translate-y-0"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <AdminCancelOrderModal
        isOpen={isAdminCancelOpen}
        onClose={() => setIsAdminCancelOpen(false)}
        onSuccess={(updatedOrder) => {
          setOrder(updatedOrder);
          if (updatedOrder.orderStatus) {
            setStatus(updatedOrder.orderStatus);
          }
        }}
        orderId={id}
      />

      {/* Refund Status Modal */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isRefundModalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (!refundSaving) {
                    setIsRefundModalOpen(false);
                    setError(null);
                  }
                }}
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
                className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-[2rem]"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  boxShadow: "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div
                  className="flex items-start justify-between gap-3 px-6 py-5 shrink-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}
                >
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">Cập nhật hoàn tiền</div>
                    <h3 className="mt-1 text-lg font-bold text-white/95">
                      Cập nhật trạng thái hoàn tiền
                    </h3>
                    <p className="mt-1 text-sm text-white/70">
                      Đơn hàng: {order?.orderCode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!refundSaving) {
                        setIsRefundModalOpen(false);
                        setError(null);
                      }
                    }}
                    disabled={refundSaving}
                    className="inline-flex cursor-pointer h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white/70 transition hover:-translate-y-0.5 hover:bg-rose-500 hover:text-white active:translate-y-0 disabled:opacity-50"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {error && (
                    <div
                      className="rounded-2xl p-4 text-sm text-rose-200"
                      style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.2)" }}
                    >
                      {error}
                    </div>
                  )}

                  {/* Current payment status */}
                  <div
                    className="rounded-[1.5rem] p-4"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider text-white/50">
                      Trạng thái thanh toán hiện tại
                    </div>
                    <div className="mt-2">
                      <span
                        className={
                          "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold " +
                          paymentBadgeClass(order ? getRealPaymentStatus(order) : undefined)
                        }
                      >
                        {paymentLabel(order ? getRealPaymentStatus(order) : undefined)}
                      </span>
                    </div>
                  </div>

                  {/* Refund status selector */}
                  <div>
                    <label className="block text-sm font-semibold text-white/90">
                      Trạng thái hoàn tiền <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!refundSaving) {
                            setOpenRefundDropdown((v) => !v);
                          }
                        }}
                        disabled={refundSaving}
                        className="flex h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 text-left text-sm text-white/90 outline-none transition focus:ring-2 focus:ring-cyan-400/30 disabled:opacity-50"
                        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                      >
                        <span className="truncate">
                          {refundStatus === "REFUND_PENDING" && "Đang chờ hoàn tiền"}
                          {refundStatus === "REFUNDED" && "Đã hoàn tiền"}
                          {refundStatus === "PARTIAL_REFUNDED" && "Hoàn tiền một phần"}
                        </span>
                        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-white/50" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>

                      {openRefundDropdown && (
                        <div
                          className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-2xl shadow-lg animate-popover"
                          style={{ background: "rgba(30,41,59,0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="max-h-56 overflow-auto p-1">
                            <button
                              type="button"
                              onClick={() => {
                                setRefundStatus("REFUND_PENDING");
                                setOpenRefundDropdown(false);
                              }}
                              className={
                                "flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-white/10 " +
                                (refundStatus === "REFUND_PENDING"
                                  ? "bg-white/10 text-white"
                                  : "text-white/80")
                              }
                            >
                              Đang chờ hoàn tiền
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRefundStatus("REFUNDED");
                                setOpenRefundDropdown(false);
                              }}
                              className={
                                "flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-white/10 " +
                                (refundStatus === "REFUNDED"
                                  ? "bg-white/10 text-white"
                                  : "text-white/80")
                              }
                            >
                              Đã hoàn tiền
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRefundStatus("PARTIAL_REFUNDED");
                                setOpenRefundDropdown(false);
                              }}
                              className={
                                "flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-white/10 " +
                                (refundStatus === "PARTIAL_REFUNDED"
                                  ? "bg-white/10 text-white"
                                  : "text-white/80")
                              }
                            >
                              Hoàn tiền một phần
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Refund note */}
                  <div>
                    <label className="block text-sm font-semibold text-white/90">
                      Ghi chú hoàn tiền <span className="text-rose-400">*</span>
                    </label>
                    <p className="mt-1 text-xs text-white/60">
                      Nhập lý do hoàn tiền, số tiền hoàn, phương thức hoàn tiền...
                    </p>
                    <textarea
                      value={refundNote}
                      onChange={(e) => setRefundNote(e.target.value)}
                      disabled={refundSaving}
                      placeholder="Ví dụ: Hoàn tiền do sản phẩm lỗi. Số tiền: 10.000.000đ. Phương thức: Chuyển khoản ngân hàng..."
                      rows={4}
                      className="mt-2 block w-full rounded-2xl px-4 py-3 text-sm text-white/90 placeholder-white/40 outline-none transition focus:ring-2 focus:ring-cyan-400/30 disabled:opacity-50"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="flex items-center justify-end gap-3 px-6 py-4 shrink-0"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!refundSaving) {
                        setIsRefundModalOpen(false);
                        setError(null);
                        setRefundNote("");
                      }
                    }}
                    disabled={refundSaving}
                    className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white/80 transition-all hover:-translate-y-0.5 hover:text-white active:translate-y-0 disabled:opacity-50"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={saveRefundStatus}
                    disabled={refundSaving || !refundNote.trim()}
                    className="inline-flex cursor-pointer h-11 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                    style={{ 
                      background: refundSaving || !refundNote.trim() 
                        ? "rgba(34,211,238,0.2)" 
                        : "linear-gradient(135deg, rgba(34,211,238,0.3) 0%, rgba(6,182,212,0.3) 100%)",
                      border: "1px solid rgba(34,211,238,0.3)",
                      boxShadow: "0 0 20px rgba(34,211,238,0.15)"
                    }}
                  >
                    {refundSaving ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        Lưu thay đổi
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}