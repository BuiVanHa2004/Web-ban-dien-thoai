"use client";

import Link from "next/link";
import React from "react";

import TrashView, { TrashItem } from "@/components/admins/trash";

import { orderService } from "@/services/orderService";
import { adminBankTransactionService } from "@/services/adminBankTransactionService";
import { useAppNotification } from "@/providers/AppNotificationProvider";

function paymentStatusForCod(orderStatus?: string | null) {
  return String(orderStatus || "") === "DELIVERED" ? "PAID" : "UNPAID";
}

export default function Trash() {
  const { confirm } = useAppNotification();
  const [items, setItems] = React.useState<TrashItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      const [orderTrash, txTrash] = await Promise.all([
        orderService.getTrash(),
        adminBankTransactionService.getAll(undefined, true)
      ]);

      const orderItems = orderTrash.map<TrashItem>((o) => ({
        id: `order_${o.orderId}`,
        title: `Đơn hàng: ${o.orderCode || o.orderId}`,
        subtitle: [o.customerName, `Thanh toán: ${paymentStatusForCod(o.orderStatus)}`]
          .filter(Boolean)
          .join(" - "),
        imageUrl: "",
        deletedAt: o.deletedAt || undefined,
      }));

      const txItems = txTrash.map<TrashItem>((tx) => ({
        id: `tx_${tx.transactionId}`,
        title: `Giao dịch: ${tx.transactionCode || `#${tx.transactionId}`}`,
        subtitle: `Số tiền: ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(tx.amount || 0))} - Nội dung: ${tx.transferContent || "-"}`,
        imageUrl: "",
        deletedAt: tx.deletedAt || undefined,
      }));

      setItems([...orderItems, ...txItems]);
    } catch (e: any) {
      setError(e?.message || "Không thể tải thùng rác.");
    }
  }

  React.useEffect(() => {
    refresh();
    document.title = "Thùng rác thanh toán | Admin Dashboard";
  }, []);

  async function onRestore(fullId: string) {
    try {
      if (fullId.startsWith("order_")) {
        const id = fullId.replace("order_", "");
        await orderService.restore(Number(id));
      } else if (fullId.startsWith("tx_")) {
        const id = fullId.replace("tx_", "");
        await adminBankTransactionService.restore(Number(id));
      }
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể khôi phục.");
    }
  }

  async function onDeleteForever(fullId: string) {
    const ok = await confirm({
      title: "Xóa vĩnh viễn",
      message: "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa vĩnh viễn?",
      type: "danger",
      confirmText: "XÓA",
    });
    if (!ok) return;
    try {
      if (fullId.startsWith("order_")) {
        const id = fullId.replace("order_", "");
        await orderService.deleteForever(Number(id));
      } else if (fullId.startsWith("tx_")) {
        const id = fullId.replace("tx_", "");
        await adminBankTransactionService.hardDelete(Number(id));
      }
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể xóa vĩnh viễn.");
    }
  }

  async function onDeleteAll() {
    if (!items.length) return;
    const ok = await confirm({
      title: "Xóa toàn bộ thùng rác",
      message:
        "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa vĩnh viễn tất cả mục trong thùng rác?",
      type: "danger",
      confirmText: "XÓA TẤT CẢ",
    });
    if (!ok) return;
    try {
      await Promise.all(
        items.map(async (item) => {
          if (item.id.startsWith("order_")) {
            const id = item.id.replace("order_", "");
            await orderService.deleteForever(Number(id));
          } else if (item.id.startsWith("tx_")) {
            const id = item.id.replace("tx_", "");
            await adminBankTransactionService.hardDelete(Number(id));
          }
        })
      );
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể xóa tất cả.");
    }
  }

  return (
    <main className="space-y-5" id="payment-trash-root">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <section>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Thùng rác thanh toán</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            Khôi phục hoặc xóa vĩnh viễn các mục thanh toán và giao dịch ngân hàng đã xóa mềm.
          </p>
        </section>
        <div className="flex items-center gap-3">
          <button
            onClick={onDeleteAll}
            disabled={items.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-500 active:translate-y-0 disabled:opacity-50 dark:bg-rose-500/15 dark:text-rose-200 dark:border dark:border-rose-400/20"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Xóa tất cả
          </button>
          <Link
            id="btn-back-to-payments"
            href="/payments"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            aria-label="Quay lại trang quản lý thanh toán"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Quay lại
          </Link>
        </div>
      </div>

      <TrashView
        title="Thùng rác"
        description="Các đơn hàng và giao dịch đã bị xóa mềm sẽ nằm ở đây."
        items={items}
        onRestore={onRestore}
        onDeleteForever={onDeleteForever}
        emptyText="Thùng rác đang trống."
        hideImage
        hideDeleteAll
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}
    </main>
  );
}
