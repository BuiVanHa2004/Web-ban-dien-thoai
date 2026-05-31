import type { OrderStatus } from "@/services/orderService";

/** Đồng bộ với dropdown cập nhật trạng thái ở chi tiết đơn (`OrderId.tsx`). */
export const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "PENDING_CONFIRM", label: "Chờ xác nhận đơn" },
  { value: "PENDING_PAYMENT_CONFIRMATION", label: "Chờ xác nhận thanh toán" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "PENDING_PICKUP", label: "Chờ lấy hàng" },
  { value: "SHIPPING", label: "Đang giao hàng" },
  { value: "DELIVERED", label: "Đã giao hàng" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, o.label])
) as Record<string, string>;

export const PAYMENT_LABEL: Record<string, string> = {
  PAID: "Đã thanh toán",
  WAITING_CONFIRM: "Chờ xác nhận",
  UNPAID: "Chưa thanh toán",
  FAILED: "Thất bại",
  PENDING: "Đang xử lý",
  REFUNDED: "Đã hoàn tiền",
  PARTIAL_PAID: "Thanh toán một phần",
  REOPENED: "Đã mở lại",
};

export function getRealPaymentStatus(order: {
  paymentStatus?: string | null;
  orderStatus?: string | null;
}) {
  if (order?.paymentStatus && order.paymentStatus !== "UNPAID") {
    return String(order.paymentStatus);
  }
  return String(order?.orderStatus || "") === "DELIVERED" ? "PAID" : "UNPAID";
}

export function paymentLabel(status?: string | null) {
  const s = String(status || "UNPAID");
  return PAYMENT_LABEL[s] || s || "-";
}

export function paymentBadgeClass(status?: string | null) {
  const s = String(status || "UNPAID");
  switch (s) {
    case "PAID":
      return "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-200 dark:ring-emerald-400/20";
    case "WAITING_CONFIRM":
      return "bg-purple-500/15 text-purple-700 ring-1 ring-purple-500/25 dark:text-purple-200 dark:ring-purple-400/20";
    case "FAILED":
      return "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/25 dark:text-rose-200 dark:ring-rose-400/20";
    case "REFUNDED":
      return "bg-blue-500/15 text-blue-700 ring-1 ring-blue-500/25 dark:text-blue-200 dark:ring-blue-400/20";
    case "PARTIAL_PAID":
      return "bg-cyan-500/15 text-cyan-800 ring-1 ring-cyan-500/25 dark:text-cyan-200 dark:ring-cyan-400/20";
    case "PENDING":
      return "bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-200 dark:ring-amber-400/20";
    case "UNPAID":
    default:
      return "bg-slate-500/15 text-slate-700 ring-1 ring-slate-500/25 dark:text-slate-200 dark:ring-white/10";
  }
}

export function paymentMethodBadgeClass(method?: string | null) {
  const m = String(method || "COD").toUpperCase();
  if (m === "BANK_TRANSFER" || m === "BANKING") {
    return "bg-blue-100 text-blue-700 ring-1 ring-blue-500/25 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-400/20";
  }
  return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20";
}

export function formatPaymentMethodLabel(method?: string | null) {
  const m = String(method || "COD").toUpperCase();
  if (m === "BANK_TRANSFER" || m === "BANKING") return "Chuyển khoản ngân hàng (Banking)";
  if (m === "COD") return "Thanh toán khi nhận hàng (COD)";
  return String(method || "COD");
}

export function statusLabel(status?: string | null) {
  const s = String(status || "PENDING_CONFIRM");
  return STATUS_LABEL[s] || s || "-";
}

/** Màu badge trạng thái đơn — giữ đúng logic `OrderId.tsx` (các trạng thái khác rơi vào nhánh vàng). */
export function statusBadgeClass(status?: string | null) {
  const s = String(status || "PENDING_CONFIRM");
  switch (s) {
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20";
    case "CANCELLED":
      return "bg-rose-100 text-rose-700 ring-1 ring-rose-500/25 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/20";
    case "PENDING_PICKUP":
      return "bg-blue-100 text-blue-700 ring-1 ring-blue-500/25 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-400/20";
    case "SHIPPING":
      return "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-500/25 dark:bg-cyan-500/15 dark:text-cyan-200 dark:ring-cyan-400/20";
    case "CONFIRMED":
      return "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-500/25 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-400/20";
    case "PENDING_CONFIRM":
    default:
      return "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-500/25 dark:bg-yellow-500/15 dark:text-yellow-200 dark:ring-yellow-400/20";
  }
}
