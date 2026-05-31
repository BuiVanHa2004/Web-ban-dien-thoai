"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

import { orderService, type OrderDto } from "@/services/orderService";
import {
  STATUS_OPTIONS,
  STATUS_LABEL,
  PAYMENT_LABEL,
  getRealPaymentStatus,
  statusLabel,
  paymentLabel,
  paymentBadgeClass,
  paymentMethodBadgeClass,
  statusBadgeClass,
  formatPaymentMethodLabel,
} from "@/services/orderAdminDisplay";
import { Loader2 } from "lucide-react";
import { useAppNotification } from "@/providers/AppNotificationProvider";

type OrderRow = {
  id: string;
  code: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  items: Array<{ productName: string; quantity: number; color?: string; ramGb?: number; storageGb?: number }>;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  itemCount: number;
  total: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
};

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour12: false });
}

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

function toNumberSafe(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
}

function normalizeColor(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "null") return undefined;
  return s;
}

function mapDtoToRow(dto: OrderDto): OrderRow {
  const items = dto.items || [];
  const total = items.reduce((sum, it) => sum + toNumberSafe(it.productPrice) * toNumberSafe(it.quantity), 0);
  const itemCount = items.reduce((sum, it) => sum + toNumberSafe(it.quantity), 0);
  const paymentStatus = getRealPaymentStatus(dto);
  return {
    id: String(dto.orderId),
    code: String(dto.orderCode || dto.orderId || ""),
    customerName: dto.receiverName || dto.customerName || "-",
    phone: dto.receiverPhone || "-",
    email: dto.email || "-",
    address: dto.shippingAddress || "-",
    items:
      items.length > 0
        ? items.map((it) => ({
          productName: String(it.productName || "-"),
          quantity: toNumberSafe(it.quantity),
          ramGb: toNumberSafe(it.ramGb) || undefined,
          storageGb: toNumberSafe(it.storageGb) || undefined,
          color: normalizeColor(
            (it as any)?.productColor ??
            (it as any)?.product_color ??
            (it as any)?.productColorName ??
            (it as any)?.colorName ??
            (it as any)?.color ??
            (it as any)?.variantColor ??
            it.colorName
          ),
        }))
        : [
          {
            productName: String(dto.productName || "-"),
            quantity: itemCount,
            ramGb: undefined,
            storageGb: undefined,
            color: undefined,
          },
        ],
    status: String(dto.orderStatus || "PENDING_CONFIRM"),
    paymentStatus,
    paymentMethod: String(dto.paymentMethod || "COD"),
    itemCount,
    total,
    createdAt: dto.createdAt || undefined,
    updatedAt: dto.updatedAt || undefined,
    deletedAt: dto.deletedAt || undefined,
  };
}

function dateScore(iso?: string) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function compareNewestFirst(a: OrderRow, b: OrderRow) {
  const ta = dateScore(a.createdAt) || dateScore(a.updatedAt);
  const tb = dateScore(b.createdAt) || dateScore(b.updatedAt);
  if (tb !== ta) return tb - ta;
  return Number(b.id) - Number(a.id);
}

function orderItemsText(items: OrderRow["items"]) {
  if (!items || items.length === 0) return "-";
  const first = items[0];
  const name = first.productName || "-";
  const firstText = name;

  if (items.length > 1) {
    return `${firstText} + ${items.length - 1} sản phẩm`;
  }
  return firstText;
}

function orderQuantitiesText(items: OrderRow["items"]) {
  if (!items || items.length === 0) return "0";
  const total = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  return String(total);
}

const MemoizedOrderRow = React.memo(({
  order,
  isViewed,
  isDeleting,
  isSelected,
  onToggleSelect,
  onView,
  onDelete,
}: {
  order: OrderRow;
  isViewed: boolean;
  isDeleting: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <tr
      className={
        "transition-all duration-300 ease-out " +
        (isDeleting
          ? "opacity-0 translate-x-2"
          : order.status === "PENDING_CONFIRM" && !isViewed
            ? "bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-900/10 dark:hover:bg-blue-900/20"
            : "bg-white hover:bg-slate-50 dark:bg-transparent dark:hover:bg-white/5")
      }
    >
      <td className="px-5 py-4 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(order.id)}
          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
      </td>
      <td className="px-5 py-4 text-center">
        <div className="font-semibold text-slate-900 dark:text-slate-100">{order.code}</div>
      </td>
      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">
        <div className="font-semibold text-slate-900 dark:text-slate-100">{order.customerName}</div>
      </td>
      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">
        <div className="whitespace-pre-line">{orderItemsText(order.items)}</div>
      </td>
      <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">
        <div className="whitespace-pre-line">{orderQuantitiesText(order.items)}</div>
      </td>
      <td className="px-5 py-4 text-center font-semibold text-slate-900 dark:text-slate-100">
        {order.total ? formatVnd(order.total) : "-"}
      </td>
      <td className="px-5 py-4 text-center">
        <span
          className={
            "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold " +
            statusBadgeClass(order.status)
          }
        >
          {statusLabel(order.status)}
        </span>
      </td>
      <td className="px-5 py-4 text-center">
        <span
          className={
            "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold " +
            paymentBadgeClass(order.paymentStatus)
          }
        >
          {paymentLabel(order.paymentStatus)}
        </span>
      </td>
      <td className="px-5 py-4 text-center">
        <span
          className={
            "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold " +
            paymentMethodBadgeClass(order.paymentMethod)
          }
        >
          {formatPaymentMethodLabel(order.paymentMethod)}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="flex flex-col items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onView(order.id)}
            className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:ring-cyan-400/15 dark:hover:shadow-black/30"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            </svg>
            Xem chi tiết
          </button>

          <button
            type="button"
            onClick={() => onDelete(order.id)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-rose-600/20 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-md active:translate-y-0 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-1 dark:ring-rose-400/20 dark:hover:bg-rose-500/20 dark:hover:ring-rose-400/30 dark:hover:shadow-black/30"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M6 6l1 16h10l1-16" />
            </svg>
            Xóa
          </button>
        </div>
      </td>
    </tr>
  );
});

MemoizedOrderRow.displayName = "MemoizedOrderRow";

export default function OrderPage() {
  const { showToast, confirm } = useAppNotification();
  const router = useRouter();
  const bottomScrollRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<HTMLTableElement>(null);
  const [query, setQuery] = React.useState("");
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [viewedIds, setViewedIds] = React.useState<Set<string>>(new Set());

  // Filter States
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [paymentStatusFilter, setPaymentStatusFilter] = React.useState<string>("");
  const [paymentMethodFilter, setPaymentMethodFilter] = React.useState<string>("");
  const [openDropdown, setOpenDropdown] = React.useState<null | "status" | "paymentStatus" | "paymentMethod">(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const filterContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    refresh();
    const saved = localStorage.getItem("admin_viewed_orders");
    if (saved) {
      try {
        setViewedIds(new Set(JSON.parse(saved)));
      } catch { }
    }
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [activeData, trashData] = await Promise.all([
        orderService.getAll(),
        orderService.getTrash(),
      ]);
      const active = activeData || [];
      const trash = trashData || [];
      setOrders([...active, ...trash].map(mapDtoToRow));
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu đơn hàng.");
    } finally {
      setLoading(false);
    }
  }

  const activeOrders = React.useMemo(
    () => [...orders.filter((o) => !o.deletedAt)].sort(compareNewestFirst),
    [orders]
  );

  const trashCount = React.useMemo(() => orders.filter((o) => !!o.deletedAt).length, [orders]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = [...activeOrders];

    if (q) {
      result = result.filter((o) => {
        return (
          o.code.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.phone.toLowerCase().includes(q) ||
          o.email.toLowerCase().includes(q) ||
          o.address.toLowerCase().includes(q) ||
          o.items.some((it) => it.productName.toLowerCase().includes(q))
        );
      });
    }

    if (statusFilter) {
      result = result.filter((o) => o.status === statusFilter);
    }

    if (paymentStatusFilter) {
      result = result.filter((o) => o.paymentStatus === paymentStatusFilter);
    }

    if (paymentMethodFilter) {
      result = result.filter((o) => o.paymentMethod === paymentMethodFilter);
    }

    return result.sort(compareNewestFirst);
  }, [activeOrders, query, statusFilter, paymentStatusFilter, paymentMethodFilter]);

  async function softDelete(id: string) {
    const ok = await confirm({
      title: "Xóa đơn hàng",
      message: "Bạn có chắc chắn muốn xóa đơn hàng này?",
      type: "danger",
      confirmText: "XÓA",
    });
    if (!ok) return;
    setDeletingId(id);
    window.setTimeout(async () => {
      try {
        await orderService.softDelete(Number(id));
        await refresh();
      } finally {
        setDeletingId(null);
      }
    }, 180);
  }

  function markAsViewed(id: string) {
    const next = new Set(viewedIds);
    next.add(id);
    setViewedIds(next);
    localStorage.setItem("admin_viewed_orders", JSON.stringify(Array.from(next)));
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(o => o.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: "Xóa hàng loạt",
      message: `Bạn có chắc muốn xóa ${selectedIds.size} đơn hàng đã chọn?`,
      type: "danger",
      confirmText: "XÓA",
    });
    if (!ok) return;

    setIsBulkDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => orderService.softDelete(Number(id))));
      setSelectedIds(new Set());
      await refresh();
      showToast("Đã xóa các đơn hàng đã chọn.", "success");
    } catch (err: any) {
      showToast("Lỗi khi xóa hàng loạt: " + err.message, "error");
    } finally {
      setIsBulkDeleting(false);
    }
  };



  // Click outside filters to close
  React.useEffect(() => {
    if (!openDropdown) return;
    const onMouseDown = (e: MouseEvent) => {
      const scope = filterContainerRef.current;
      if (!scope) return;
      if (e.target instanceof Node && scope.contains(e.target)) return;
      setOpenDropdown(null);
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [openDropdown]);



  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Đơn hàng
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Quản lý đơn hàng</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            Bảng quản lý đơn hàng, xem chi tiết, cập nhật trạng thái và xóa mềm.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={refresh}
            disabled={loading}
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/70 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10"
          >
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200/70 transition-all duration-500 ease-out dark:bg-white/5 dark:ring-white/10 ${loading ? "animate-spin" : ""}`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </span>
            Làm mới
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition-all duration-500 hover:-translate-y-0.5 hover:bg-rose-500 active:translate-y-0 disabled:opacity-50"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15">
                {isBulkDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                )}
              </span>
              Xóa {selectedIds.size} mục
            </button>
          )}

          <Link
            href="/orders/trash"
            className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-600/20 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-md active:translate-y-0 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-400/20 dark:hover:bg-emerald-500/20 dark:hover:ring-emerald-400/30 dark:hover:shadow-black/30"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/15 transition-all duration-500 ease-out dark:bg-emerald-500/20 dark:ring-emerald-400/20">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M6 6l1 16h10l1-16" />
              </svg>
            </span>
            Thùng rác
            <span className="ml-1 inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white ring-1 ring-white/15 transition-all duration-500 ease-out dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-400/20">
              {trashCount}
            </span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-slate-950/45 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/60 text-slate-800 ring-1 ring-slate-200/70 backdrop-blur-xl dark:bg-white/5 dark:text-slate-100 dark:ring-white/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h18v18H3z" />
              <path d="M7 15h3" />
              <path d="M7 11h10" />
              <path d="M7 7h10" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Danh sách đơn hàng</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">Tổng: {activeOrders.length} đơn</div>
          </div>
        </div>

        <div className="w-full md:max-w-md">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-400/40 via-sky-400/20 to-fuchsia-500/35 p-px shadow-[0_16px_60px_-40px_rgba(34,211,238,0.55)] transition-all duration-700 ease-out focus-within:shadow-[0_18px_70px_-40px_rgba(168,85,247,0.55)]">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-950 drop-shadow-sm dark:text-slate-100">
                <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 21l-4.3-4.3" />
                  <path d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                </svg>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="h-11 w-full rounded-2xl bg-white/60 pl-11 pr-3 text-sm text-slate-900 ring-1 ring-white/10 outline-none backdrop-blur-xl transition-all duration-700 ease-out focus:bg-white/75 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:bg-white/10 dark:focus:ring-cyan-400/25"
              />
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div ref={filterContainerRef} className="relative z-20 flex flex-wrap gap-4 rounded-3xl border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45">

        {/* Status Filter */}
        <div className="flex flex-col gap-1.5 min-w-[180px] relative">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Trạng thái đơn</label>
          <button
            type="button"
            onClick={() => setOpenDropdown(v => v === "status" ? null : "status")}
            className="flex h-10 w-full items-center justify-between gap-3 rounded-xl bg-white px-3 text-left text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
          >
            <span className="truncate">{statusFilter ? STATUS_LABEL[statusFilter] : "Tất cả"}</span>
            <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform duration-300 ${openDropdown === "status" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {openDropdown === "status" && (
            <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-popover dark:border-white/10 dark:bg-slate-950">
              <div className="max-h-56 overflow-auto p-1">
                <button
                  type="button"
                  onClick={() => { setStatusFilter(""); setOpenDropdown(null); }}
                  className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  Tất cả
                </button>
                {STATUS_OPTIONS.map(({ value: val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => { setStatusFilter(val); setOpenDropdown(null); }}
                    className={`flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 ${statusFilter === val ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" : "text-slate-700 dark:text-slate-200"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Status Filter */}
        <div className="flex flex-col gap-1.5 min-w-[180px] relative">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Thanh toán</label>
          <button
            type="button"
            onClick={() => setOpenDropdown(v => v === "paymentStatus" ? null : "paymentStatus")}
            className="flex h-10 w-full items-center justify-between gap-3 rounded-xl bg-white px-3 text-left text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
          >
            <span className="truncate">{paymentStatusFilter ? PAYMENT_LABEL[paymentStatusFilter] : "Tất cả"}</span>
            <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform duration-300 ${openDropdown === "paymentStatus" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {openDropdown === "paymentStatus" && (
            <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-popover dark:border-white/10 dark:bg-slate-950">
              <div className="max-h-56 overflow-auto p-1">
                <button
                  type="button"
                  onClick={() => { setPaymentStatusFilter(""); setOpenDropdown(null); }}
                  className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  Tất cả
                </button>
                {Object.entries(PAYMENT_LABEL).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => { setPaymentStatusFilter(val); setOpenDropdown(null); }}
                    className={`flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 ${paymentStatusFilter === val ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" : "text-slate-700 dark:text-slate-200"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Method Filter */}
        <div className="flex flex-col gap-1.5 min-w-[180px] relative">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Loại thanh toán</label>
          <button
            type="button"
            onClick={() => setOpenDropdown(v => v === "paymentMethod" ? null : "paymentMethod")}
            className="flex h-10 w-full items-center justify-between gap-3 rounded-xl bg-white px-3 text-left text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
          >
            <span className="truncate">{paymentMethodFilter ? formatPaymentMethodLabel(paymentMethodFilter) : "Tất cả"}</span>
            <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform duration-300 ${openDropdown === "paymentMethod" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {openDropdown === "paymentMethod" && (
            <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-popover dark:border-white/10 dark:bg-slate-950">
              <div className="max-h-56 overflow-auto p-1">
                <button
                  type="button"
                  onClick={() => { setPaymentMethodFilter(""); setOpenDropdown(null); }}
                  className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => { setPaymentMethodFilter("COD"); setOpenDropdown(null); }}
                  className={`flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 ${paymentMethodFilter === "COD" ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" : "text-slate-700 dark:text-slate-200"}`}
                >
                  COD
                </button>
                <button
                  type="button"
                  onClick={() => { setPaymentMethodFilter("BANK_TRANSFER"); setOpenDropdown(null); }}
                  className={`flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 ${paymentMethodFilter === "BANK_TRANSFER" ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" : "text-slate-700 dark:text-slate-200"}`}
                >
                  Banking
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setStatusFilter("");
            setPaymentStatusFilter("");
            setPaymentMethodFilter("");
            setQuery("");
          }}
          className="mt-auto h-10 px-4 text-xs font-bold uppercase tracking-widest text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-all shadow-sm shadow-rose-200 dark:shadow-none"
        >
          Xóa lọc
        </button>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-500 ease-out hover:shadow-md dark:border-white/10 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5">
        <div ref={bottomScrollRef} className="overflow-x-scroll">
          <table ref={tableRef} className="min-w-full border-collapse text-center text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="px-5 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-5 py-3 text-center">Mã đơn hàng</th>
                <th className="px-5 py-3 text-center">Khách hàng</th>
                <th className="px-5 py-3 text-center">Sản phẩm</th>
                <th className="px-5 py-3 text-center">Số lượng</th>
                <th className="px-5 py-3 text-center">Tổng tiền</th>
                <th className="px-5 py-3 text-center">Trạng thái đơn hàng</th>
                <th className="px-5 py-3 text-center">Trạng thái thanh toán</th>
                <th className="px-5 py-3 text-center">Loại thanh toán</th>
                <th className="px-5 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-400 dark:text-slate-300" colSpan={10}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-400 dark:text-slate-300" colSpan={10}>
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <MemoizedOrderRow
                    key={o.id}
                    order={o}
                    isViewed={viewedIds.has(o.id)}
                    isDeleting={deletingId === o.id}
                    isSelected={selectedIds.has(o.id)}
                    onToggleSelect={toggleSelectOne}
                    onView={(id) => {
                      markAsViewed(id);
                      router.push(`/orders/${encodeURIComponent(id)}`);
                    }}
                    onDelete={softDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}