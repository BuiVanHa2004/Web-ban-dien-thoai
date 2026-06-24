"use client";

import Link from "next/link";
import React from "react";

import TrashView, { TrashItem } from "@/components/admin/trash";

import { categoryService } from "@/services/categoryService";

export default function Trash() {
  const [items, setItems] = React.useState<TrashItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      const trashed = await categoryService.getTrash();
      setItems(
        trashed.map<TrashItem>((c) => ({
          id: String(c.categoryId),
          title: c.categoryName,
          subtitle: c.categoryDescription || "",
          imageUrl: (c.categoryImages && c.categoryImages.length > 0) ? c.categoryImages[0] : "",
          deletedAt: c.deletedAt || undefined,
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
      await categoryService.restore(Number(id));
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể khôi phục.");
    }
  }

  async function onDeleteForever(id: string) {
    try {
      await categoryService.deleteForever(Number(id));
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể xóa vĩnh viễn.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Thùng rác danh mục</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            Khôi phục hoặc xóa vĩnh viễn các danh mục đã xóa mềm.
          </p>
        </div>
        <Link
          href="/categories"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Quay lại
        </Link>
      </div>

      <TrashView
        title="Thùng rác"
        description="Các danh mục đã bị xóa mềm sẽ nằm ở đây."
        items={items}
        searchInSubtitle={false}
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
