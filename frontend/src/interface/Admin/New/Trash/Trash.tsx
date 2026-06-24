"use client";

import Link from "next/link";
import React from "react";

import TrashView, { TrashItem } from "@/components/admin/trash";

import { newsService } from "@/services/newsService";

export default function Trash() {
  const [items, setItems] = React.useState<TrashItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      const trashed = await newsService.getTrash();
      setItems(
        trashed.map<TrashItem>((n) => ({
          id: String(n.newsId),
          title: n.newsTitle,
          subtitle: n.newsDescribe || "",
          imageUrl: n.newsImages?.[0] || "",
          deletedAt: n.deletedAt || undefined,
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
      await newsService.restore(Number(id));
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể khôi phục.");
    }
  }

  async function onDeleteForever(id: string) {
    try {
      await newsService.deleteForever(Number(id));
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể xóa vĩnh viễn.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.55)]" />
            News Trash
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Thùng rác tin tức</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Khôi phục hoặc xóa vĩnh viễn các bài viết đã xóa.</p>
        </div>
        <Link
          href="/news"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Quay lại
        </Link>
      </div>

      <TrashView
        title="Danh sách tin tức đã xóa"
        description="Các bài viết tin tức đã bị xóa mềm sẽ nằm ở đây."
        items={items}
        onRestore={onRestore}
        onDeleteForever={onDeleteForever}
        emptyText="Thùng rác trống."
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