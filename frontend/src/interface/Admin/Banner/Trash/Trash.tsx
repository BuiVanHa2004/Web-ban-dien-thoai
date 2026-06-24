"use client";

import Link from "next/link";
import React from "react";
import { ChevronLeft, RotateCcw, ShieldAlert } from "lucide-react";

import TrashView, { TrashItem } from "@/components/admin/trash";
import { bannerService } from "@/services/bannerService";
import { useAppNotification } from "@/providers/AppNotificationProvider";

export default function Trash() {
  const { confirm } = useAppNotification();
  const [items, setItems] = React.useState<TrashItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const trashed = await bannerService.getTrash();
      setItems(
        trashed.map<TrashItem>((b) => {
          const firstImage = b.bannerImages?.[0];
          return {
            id: String(b.bannerId),
            title: firstImage?.title || `Banner #${b.bannerId}`,
            subtitle: firstImage?.subtitle || b.position || "Không có phụ đề",
            imageUrl: firstImage?.imageUrl || "",
            deletedAt: b.deletedAt || undefined,
          };
        })
      );
    } catch (e: any) {
      setError(e?.message || "Không thể tải thùng rác.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  async function onRestore(id: string) {
    try {
      await bannerService.restore(Number(id));
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể khôi phục.");
    }
  }

  async function onDeleteForever(id: string) {
    const ok = await confirm({
      title: "Xóa vĩnh viễn",
      message: "Xóa vĩnh viễn banner này? Hành động này không thể hoàn tác.",
      type: "danger",
      confirmText: "XÓA",
    });
    if (!ok) return;
    try {
      await bannerService.deleteForever(Number(id));
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể xóa vĩnh viễn.");
    }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-600 ring-1 ring-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400">
            <ShieldAlert className="h-3.5 w-3.5" />
            Lưu trữ tạm thời
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Thùng rác Banner</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Khôi phục banner hoặc xóa vĩnh viễn khỏi hệ thống.
          </p>
        </div>

        <Link
          href="/banners"
          className="group flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 transition-colors group-hover:bg-slate-200 dark:bg-white/5 dark:group-hover:bg-white/10">
            <ChevronLeft className="h-5 w-5" />
          </div>
          Quay lại danh sách
        </Link>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
          <span>{error}</span>
          <button onClick={refresh} className="flex items-center gap-1 hover:underline">
            <RotateCcw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      )}

      <div className="rounded-[2.5rem] border border-slate-200 bg-white/50 p-2 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50">
        <TrashView
          title="Banner đã xóa"
          description="Các banner này sẽ không hiển thị trên website cho đến khi được khôi phục."
          items={items}
          searchInSubtitle={true}
          onRestore={onRestore}
          onDeleteForever={onDeleteForever}
          emptyText={loading ? "Đang tải..." : "Thùng rác hiện đang trống."}
          hideImage={true}
        />
      </div>
    </div>
  );
}
