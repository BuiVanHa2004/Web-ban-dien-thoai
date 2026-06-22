"use client";

import Link from "next/link";
import React from "react";

import TrashView, { TrashItem } from "@/components/admin/trash";

import { adminManualPaymentService } from "@/services/adminManualPaymentService";

export default function Trash() {
  const [items, setItems] = React.useState<TrashItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      const trashed = await adminManualPaymentService.getTrashedAttempts();
      setItems(
        trashed.map<TrashItem>((attempt) => ({
          id: String(attempt.attemptId),
          title: attempt.archivedOrderCode || `Bill #${attempt.attemptId}`,
          subtitle: `Số tiền: ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(attempt.amount)} - Trạng thái: ${attempt.status}`,
          imageUrl: attempt.transferImageUrl || "",
          deletedAt: attempt.deletedAt || undefined,
        }))
      );
    } catch (e: any) {
      setError(e?.message || "Không thể tải thùng rác.");
    }
  }

  React.useEffect(() => {
    refresh();
  }, []);

  async function onRestore(id: string) {
    try {
      await adminManualPaymentService.restoreAttempt(Number(id));
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể khôi phục.");
    }
  }

  async function onDeleteForever(id: string) {
    try {
      await adminManualPaymentService.deleteAttemptForever(Number(id));
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể xóa vĩnh viễn.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Thùng rác bill thanh toán
          </h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            Khôi phục hoặc xóa vĩnh viễn các bill đã xóa mềm. Bill sẽ được lưu vào kho khi xóa vĩnh viễn.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/payments/warehouse"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-amber-600 px-3 py-2 sm:px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-amber-500 active:translate-y-0 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-1 dark:ring-amber-400/20 dark:hover:bg-amber-500/20 whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.29 7 12 12 20.71 7" />
              <line x1="12" y1="22" x2="12" y2="12" />
            </svg>
            Kho lưu trữ
          </Link>
          <Link
            href="/payments"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
        description="Các bill thanh toán đã bị xóa mềm sẽ nằm ở đây."
        items={items}
        onRestore={onRestore}
        onDeleteForever={onDeleteForever}
        emptyText="Thùng rác đang trống."
        hideImage={true}
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
