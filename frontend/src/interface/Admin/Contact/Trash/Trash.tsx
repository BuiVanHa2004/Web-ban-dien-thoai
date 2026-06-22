"use client";

import Link from "next/link";
import React from "react";

import TrashView, { type TrashItem } from "@/components/admin/trash";
import { contactService } from "@/services/contactService";

type ContactTrashDto = {
  contactId: number;
  fullName?: string | null;
  subject?: string | null;
  message?: string | null;
  imageUrls?: string[] | null;
  deletedAt?: string | null;
};

function mapToTrashItem(c: ContactTrashDto): TrashItem {
  const title = String(c.fullName || "-");
  const subtitle = `${String(c.subject || "-")} - ${String(c.message || "")}`.trim();
  const imageUrl = Array.isArray(c.imageUrls) && c.imageUrls.length > 0 ? String(c.imageUrls[0]) : "";
  return {
    id: String(c.contactId),
    title,
    subtitle,
    imageUrl,
    deletedAt: c.deletedAt || undefined,
  };
}

export default function Trash() {
  const [items, setItems] = React.useState<TrashItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      const trashed = await contactService.getTrashAdmin();
      setItems((trashed || []).map((x) => mapToTrashItem(x as any)));
    } catch (e: any) {
      setError(e?.message || "Không thể tải thùng rác.");
    }
  }

  React.useEffect(() => {
    void refresh();
  }, []);

  async function onRestore(id: string) {
    try {
      await contactService.restoreAdmin(Number(id));
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể khôi phục.");
    }
  }

  async function onDeleteForever(id: string) {
    try {
      await contactService.deleteForeverAdmin(Number(id));
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể xóa vĩnh viễn.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Thùng rác liên hệ</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Khôi phục hoặc xóa vĩnh viễn các liên hệ đã xóa mềm.</p>
        </div>
        <Link
          href="/contacts"
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
        description="Các liên hệ đã bị xóa mềm sẽ nằm ở đây."
        items={items}
        searchInSubtitle={true}
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
