"use client";

import Link from "next/link";
import AdminActionBar from "@/components/admins/AdminActionBar";
import { usePathname } from "next/navigation";
import React from "react";

import { contactService, type ContactDto } from "@/services/contactService";
import { useAppNotification } from "@/providers/AppNotificationProvider";

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

function resolveImageUrl(input?: string | null | unknown): string {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw)) return raw;
  if (/^(data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_URL}${raw}`;
  return `${API_URL}/${raw}`;
}

function parseIdFromPathname(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const maybeId = parts[parts.length - 1] || "";
  const n = Number(maybeId);
  return Number.isFinite(n) ? n : null;
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour12: false });
}

export default function ContactId() {
  const { confirm } = useAppNotification();
  const pathname = usePathname();
  const id = React.useMemo(() => parseIdFromPathname(pathname), [pathname]);

  const [data, setData] = React.useState<ContactDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [replyContent, setReplyContent] = React.useState("");
  const [replyItems, setReplyItems] = React.useState<Array<{ file: File; url: string }>>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [replyModalOpen, setReplyModalOpen] = React.useState(false);
  const [editingReplyId, setEditingReplyId] = React.useState<number | null>(null);
  const [existingUrls, setExistingUrls] = React.useState<string[]>([]);
  const [currentReplyContactId, setCurrentReplyContactId] = React.useState<number | null>(null);
  const replyModalRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [thread, setThread] = React.useState<
    Array<{
      contactId: number;
      fullName: string;
      currentFullName?: string;
      currentEmail?: string;
      currentPhone?: string;
      subject: string;
      message: string;
      createdAt?: string | null;
      imageUrls: string[];
      replies: Array<{ replyId: number; replyContent: string; createdAt?: string | null; imageUrls: string[] }>;
    }>
  >([]);

  const load = React.useCallback(async () => {
    if (id == null) {
      setError("Id không hợp lệ");
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await contactService.getDetailAdmin(id);
      setData(res);

      const email = String(res?.email || "").trim();
      if (!email) {
        setThread([]);
        return;
      }

      const contacts = await contactService.getContactsByEmail(email);
      const mapped = (contacts || [])
        .map((c: any) => ({
          contactId: Number(c?.contactId),
          fullName: String(c?.fullName || "-").trim() || "-",
          currentFullName: c?.currentFullName || undefined,
          currentEmail: c?.currentEmail || undefined,
          currentPhone: c?.currentPhone || undefined,
          subject: String(c?.subject || "-").trim() || "-",
          message: String(c?.message || "").trim(),
          createdAt: c?.createdAt ?? null,
          imageUrls: Array.isArray(c?.imageUrls) ? c.imageUrls.map(String) : [],
        }))
        .filter((x) => Number.isFinite(x.contactId));

      mapped.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      const replyPairs = await Promise.all(
        mapped.map(async (c) => {
          try {
            const rs = await contactService.getRepliesByContactId(c.contactId);
            const replies = (rs || []).map((r: any) => ({
              replyId: Number(r?.replyId),
              replyContent: String(r?.replyContent ?? ""),
              createdAt: r?.createdAt ?? null,
              imageUrls: Array.isArray(r?.imageUrls) ? r.imageUrls.map(String) : [],
            }));
            return { contactId: c.contactId, replies };
          } catch {
            return { contactId: c.contactId, replies: [] };
          }
        })
      );

      const byId = new Map<number, Array<{ replyId: number; replyContent: string; createdAt?: string | null; imageUrls: string[] }>>(
        replyPairs.map((x) => [x.contactId, x.replies])
      );

      setThread(mapped.map((c) => ({ ...c, replies: byId.get(c.contactId) || [] })));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Có lỗi xảy ra.";
      setError(msg);
      setData(null);
      setThread([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    return () => {
      for (const it of replyItems) URL.revokeObjectURL(it.url);
    };
  }, [replyItems]);

  React.useEffect(() => {
    if (!replyModalOpen) return;
    const t = window.setTimeout(() => {
      replyModalRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, [replyModalOpen]);

  React.useEffect(() => {
    if (!replyModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReplyModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [replyModalOpen]);

  function onPickReplyFiles(next: FileList | null) {
    if (!next || next.length === 0) return;
    const incoming = Array.from(next);

    setReplyItems((prev) => {
      const merged = [...prev];
      for (const f of incoming) {
        const exists = merged.some(
          (x) => x.file.name === f.name && x.file.size === f.size && x.file.lastModified === f.lastModified
        );
        if (!exists) merged.push({ file: f, url: URL.createObjectURL(f) });
      }
      return merged;
    });
  }

  function removeReplyFile(index: number) {
    setReplyItems((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function openEditModal(r: any) {
    setEditingReplyId(r.replyId);
    setReplyContent(r.replyContent);
    setExistingUrls(Array.isArray(r.imageUrls) ? r.imageUrls : []);
    setReplyItems([]);
    setReplyModalOpen(true);
  }

  function openCreateModal(contactId: number) {
    setEditingReplyId(null);
    setCurrentReplyContactId(contactId);
    setReplyContent("");
    setExistingUrls([]);
    setReplyItems([]);
    setReplyModalOpen(true);
  }

  function closeReplyModal() {
    setReplyModalOpen(false);
    setEditingReplyId(null);
    setCurrentReplyContactId(null);
    setReplyContent("");
    setExistingUrls([]);
    for (const it of replyItems) URL.revokeObjectURL(it.url);
    setReplyItems([]);
  }

  async function submitReply() {
    const targetId = editingReplyId != null ? null : currentReplyContactId;
    if (editingReplyId == null && targetId == null) return;
    const content = replyContent.trim();
    if (!content) {
      setError("Vui lòng nhập nội dung phản hồi.");
      return;
    }

    let adminId: number | null = null;
    try {
      const raw = localStorage.getItem("user");
      const u = raw ? (JSON.parse(raw) as any) : null;
      const n = Number(u?.id);
      adminId = Number.isFinite(n) ? n : null;
    } catch {
      adminId = null;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (editingReplyId != null) {
        await contactService.updateReplyAdmin({
          replyId: editingReplyId,
          replyContent: content,
          images: replyItems.map((x) => x.file),
          existingImageUrls: existingUrls,
        });
      } else if (targetId != null) {
        await contactService.createReplyAdmin({
          contactId: targetId,
          adminId,
          replyContent: content,
          images: replyItems.map((x) => x.file),
        });
      }
      setReplyContent("");
      for (const it of replyItems) URL.revokeObjectURL(it.url);
      setReplyItems([]);
      setReplyModalOpen(false);
      setEditingReplyId(null);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Không thể gửi phản hồi.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteReply(replyId: number) {
    const ok = await confirm({
      title: "Xóa phản hồi",
      message: "Xóa phản hồi này?",
      type: "danger",
      confirmText: "XÓA",
    });
    if (!ok) return;
    try {
      await contactService.deleteReplyAdmin(replyId);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Không thể xóa phản hồi.";
      setError(msg);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Chi tiết liên hệ
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Chi tiết liên hệ</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Xem đầy đủ thông tin liên hệ từ khách hàng.</p>
        </div>
      </div>
      <AdminActionBar backHref="/contacts" />

      <div className="rounded-3xl border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out hover:shadow-md dark:border-white/10 dark:bg-slate-950/45 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 p-5 sm:p-7">
        {loading ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">Đang tải...</div>
        ) : error ? (
          <div className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</div>
        ) : !data ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">Không có dữ liệu.</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Họ và tên</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{data.currentFullName || String(data.fullName || "-")}</div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{data.currentEmail || String(data.email || "-")}</div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Số điện thoại</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{data.currentPhone || String(data.phone || "-")}</div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Thời gian gửi</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(data.createdAt)}</div>
              </div>
            </div>





            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Nội dung</div>
              <div className="mt-2 rounded-2xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Toàn bộ liên hệ</div>
                {thread.length === 0 ? (
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">Chưa có liên hệ.</div>
                ) : (
                  <div className="mt-3 max-h-[520px] overflow-y-auto rounded-2xl border border-black/5 bg-white/40 p-3 dark:border-white/10 dark:bg-slate-950/20">
                    <div className="space-y-3">
                      {thread.map((c) => (
                        <div
                          key={c.contactId}
                          className={
                            "rounded-2xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5 " +
                            (c.contactId === id ? "ring-2 ring-cyan-500/20" : "")
                          }
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[13px] font-bold text-blue-600 dark:text-blue-400">{c.currentFullName || c.fullName}</div>
                              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{c.subject}</div>
                              <div className="mt-1 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">{c.message}</div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openCreateModal(c.contactId)}
                                  className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm ring-1 ring-emerald-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-md active:translate-y-0 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20 dark:hover:bg-emerald-500/20"
                                >
                                  Phản hồi
                                </button>

                            </div>
                          </div>

                          {c.createdAt ? (
                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDate(c.createdAt)}</div>
                          ) : null}

                          {c.imageUrls.length > 0 && (
                            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                              {c.imageUrls.map((u, i) => {
                                const resolved = resolveImageUrl(u);
                                return (
                                  <a
                                    key={`${c.contactId}-${i}`}
                                    href={resolved}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-slate-900 overflow-hidden"
                                    style={{ aspectRatio: "9/16" }}
                                  >
                                    <img
                                      src={resolved}
                                      alt=""
                                      className="w-full h-full object-cover cursor-pointer transition-[filter] duration-300 hover:brightness-110"
                                    />
                                  </a>
                                );
                              })}
                            </div>
                          )}

                          {c.replies.length > 0 && (
                            <div className="mt-4 rounded-2xl border border-black/5 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                              <div className="text-sm font-bold text-blue-700 dark:text-blue-400">Phản hồi từ Shop</div>
                              <div className="mt-3 space-y-3">
                                {c.replies.map((r) => (
                                  <div
                                    key={r.replyId}
                                    className="rounded-2xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-line">
                                        {r.replyContent}
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => openEditModal(r)}
                                            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-amber-500 px-3 py-2 text-xs font-semibold text-amber-950 shadow-sm ring-1 ring-amber-500/20 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-amber-400 hover:shadow-md active:translate-y-0 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-1 dark:ring-amber-400/20 dark:hover:bg-amber-500/20 dark:hover:ring-amber-400/30 dark:hover:shadow-black/30"
                                            title="Sửa phản hồi"
                                          >
                                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                              <path d="M16.5 3.5l4 4L7 21H3v-4z" />
                                            </svg>
                                            Sửa
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => void deleteReply(r.replyId)}
                                            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-rose-600/20 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-md active:translate-y-0 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-1 dark:ring-rose-400/20 dark:hover:bg-rose-500/20 dark:hover:ring-rose-400/30 dark:hover:shadow-black/30"
                                            title="Xóa phản hồi"
                                          >
                                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                              <path d="M3 6h18" />
                                              <path d="M8 6V4h8v2" />
                                              <path d="M6 6l1 16h10l1-16" />
                                            </svg>
                                            Xóa
                                          </button>
                                      </div>
                                    </div>
                                    {r.createdAt ? (
                                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDate(r.createdAt)}</div>
                                    ) : null}
                                    {r.imageUrls.length > 0 && (
                                      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                                        {r.imageUrls.map((u, i) => {
                                          const resolved = resolveImageUrl(u);
                                          return (
                                            <a
                                              key={`${r.replyId}-${i}`}
                                              href={resolved}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="block rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-slate-900 overflow-hidden"
                                              style={{ aspectRatio: "9/16" }}
                                            >
                                              <img
                                                src={resolved}
                                                alt=""
                                                className="w-full h-full object-cover cursor-pointer transition-[filter] duration-300 hover:brightness-110"
                                              />
                                            </a>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {replyModalOpen && (
        <div
          className="fixed inset-0 z-[99999]"
          role="dialog"
          aria-modal="true"
          onClick={closeReplyModal}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fade-in-up" />

          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              className="flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 dark:border-white/10 dark:bg-slate-950 animate-auth-page max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 px-6 py-4 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/60">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {editingReplyId ? "Chỉnh sửa phản hồi" : "Phản hồi khách hàng"}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {editingReplyId ? "Cập nhật nội dung và quản lý ảnh đính kèm." : "Nhập nội dung phản hồi và đính kèm ảnh minh họa."}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeReplyModal}
                  className="inline-flex cursor-pointer h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <textarea
                  ref={replyModalRef}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[220px] w-full resize-none rounded-2xl bg-slate-50 px-5 py-4 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition-all focus:bg-white focus:ring-cyan-500/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:bg-white/[0.07]"
                  placeholder="Nhập nội dung phản hồi chi tiết tại đây..."
                />

                <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <path d="M17 8l-5-5-5 5" />
                        <path d="M12 3v12" />
                      </svg>
                      Thêm ảnh
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => onPickReplyFiles(e.target.files)}
                      />
                    </label>
                    <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-white/5 dark:text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                      {replyItems.length + existingUrls.length > 0 ? `Đã chọn ${replyItems.length + existingUrls.length} ảnh` : "Chưa chọn ảnh"}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeReplyModal}
                      className="inline-flex cursor-pointer h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitReply()}
                      disabled={submitting}
                      className={
                        "inline-flex cursor-pointer h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-lg active:translate-y-0 " +
                        (submitting ? "opacity-70 pointer-events-none" : "")
                      }
                    >
                      {submitting ? (
                        <span className="inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Lưu phản hồi
                    </button>
                  </div>
                </div>

                {(replyItems.length > 0 || existingUrls.length > 0) && (
                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {/* Render existing images */}
                    {existingUrls.map((u, idx) => (
                      <div
                        key={`existing-${idx}`}
                        className="relative overflow-hidden rounded-2xl border border-black/5 bg-white text-left dark:border-white/10 dark:bg-slate-900"
                      >
                        <button
                          type="button"
                          onClick={() => setExistingUrls((prev) => prev.filter((_, i) => i !== idx))}
                          aria-label="Bỏ ảnh"
                          className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-all duration-300 hover:bg-black/70 hover:scale-110 active:scale-95"
                          title="Bỏ ảnh"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18" />
                            <path d="M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="relative w-full overflow-hidden" style={{ paddingBottom: "100%" }}>
                          <img
                            src={resolveImageUrl(u)}
                            alt=""
                            className="absolute inset-0 h-full w-full cursor-pointer object-cover transition-transform duration-300 hover:scale-110"
                          />
                        </div>
                      </div>
                    ))}

                    {/* Render new images */}
                    {replyItems.map((it, idx) => (
                      <div
                        key={`${it.file.name}-${it.file.lastModified}`}
                        className="relative overflow-hidden rounded-2xl border border-black/5 bg-white text-left dark:border-white/10 dark:bg-slate-900"
                      >
                        <button
                          type="button"
                          onClick={() => removeReplyFile(idx)}
                          aria-label="Bỏ ảnh"
                          className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-all duration-300 hover:bg-black/70 hover:scale-110 active:scale-95"
                          title="Bỏ ảnh"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18" />
                            <path d="M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="relative w-full overflow-hidden" style={{ paddingBottom: "100%" }}>
                          <img
                            src={it.url}
                            alt={it.file.name}
                            className="absolute inset-0 h-full w-full cursor-pointer object-cover transition-transform duration-300 hover:scale-110"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
