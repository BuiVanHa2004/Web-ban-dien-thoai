"use client";

import Link from "next/link";
import React from "react";

import TrashView, { TrashItem } from "@/components/admins/trash";
import { customerAccountService, CustomerAccountDto } from "@/services/customerAccountService";

function mapDtoToItem(dto: CustomerAccountDto): TrashItem {
  return {
    id: String(dto.customerId),
    title: dto.fullName,
    subtitle: `${dto.username} • ${dto.email}`,
    imageUrl: dto.avatarUrl || undefined,
    deletedAt: dto.deletedAt || undefined,
  };
}

function Trash() {
  const [items, setItems] = React.useState<TrashItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      const trash = await customerAccountService.getTrash();
      setItems(trash.map(mapDtoToItem));
    } catch (e: any) {
      setError(e?.message || "Không thể tải thùng rác khách hàng.");
    }
  }

  React.useEffect(() => {
    refresh();
  }, []);

  async function restore(id: string) {
    try {
      await customerAccountService.restore(Number(id));
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể khôi phục.");
    }
  }

  async function deleteForever(id: string) {
    try {
      await customerAccountService.deleteForever(Number(id));
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể xóa vĩnh viễn.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Thùng rác khách hàng</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            Khôi phục hoặc xóa vĩnh viễn các khách hàng đã xóa mềm.
          </p>
        </div>
        <Link
          href="/accounts"
          className="inline-flex self-start items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 whitespace-nowrap"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Quay lại
        </Link>
      </div>

      <TrashView
        title="Thùng rác"
        description="Các khách hàng đã bị xóa mềm sẽ nằm ở đây."
        items={items}
        onRestore={restore}
        onDeleteForever={deleteForever}
        emptyText="Thùng rác đang trống."
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}

export { Trash };

export default Trash;