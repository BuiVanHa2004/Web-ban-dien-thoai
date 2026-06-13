"use client";

import Link from "next/link";
import AdminActionBar from "@/components/admins/AdminActionBar";
import { usePathname } from "next/navigation";
import React from "react";
import { createPortal } from "react-dom";

import { contactService, type ContactDto } from "@/services/contactService";
import { useAppNotification } from "@/providers/AppNotificationProvider";
import { resolveImageUrl } from "@/common/resolveImageUrl";

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
      <AdminActionBar backHref="/contacts" />
      <div className="flex flex-col gap-4 pt-10 sm:pt-0 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Chi tiết liên hệ
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Chi tiết liên hệ</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Xem đầy đủ thông tin liên hệ từ khách hàng.</p>
        </div>
      </div>

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
              <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5 overflow-hidden">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Họ và tên</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white truncate">{data.currentFullName || String(data.fullName || "-")}</div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5 overflow-hidden">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white break-all">{data.currentEmail || String(data.email || "-")}</div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5 overflow-hidden">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Số điện thoại</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{data.currentPhone || String(data.phone || "-")}</div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5 overflow-hidden">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Thời gian gửi</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(data.createdAt)}</div>
              </div>
            </div>





            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">Nội dung liên hệ</div>
              {thread.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">Chưa có liên hệ.</div>
              ) : (
                <div className="space-y-4">
                  {thread.map((c) => (
                    <div
                      key={c.contactId}
                      className={`rounded-2xl border bg-slate-50 p-4 dark:bg-white/5 ${c.contactId === id ? "border-cyan-500/30 dark:border-cyan-500/30" : "border-slate-200 dark:border-white/10"}`}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate">{c.currentFullName || c.fullName}</span>
                        {c.createdAt && <span className="text-[11px] text-slate-400 shrink-0">{formatDate(c.createdAt)}</span>}
                      </div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{c.subject}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{c.message}</div>

                      {c.imageUrls.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {c.imageUrls.map((u, i) => {
                            const resolved = resolveImageUrl(u);
                            return (
                              <a key={`${c.contactId}-${i}`} href={resolved} target="_blank" rel="noreferrer"
                                className="block w-16 overflow-hidden rounded-xl border border-black/5 dark:border-white/10"
                                style={{ aspectRatio: "9/16" }}>
                                <img src={resolved} alt="" className="w-full h-full object-cover" />
                              </a>
                            );
                          })}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => openCreateModal(c.contactId)}
                        className="mt-3 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Phản hồi
                      </button>

                      {c.replies.length > 0 && (
                        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 dark:border-white/10">
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Phản hồi từ Shop</div>
                          {c.replies.map((r) => (
                            <div key={r.replyId} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-500/10 dark:bg-emerald-500/5">
                              <div className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-line mb-2">{r.replyContent}</div>
                              {r.createdAt && <div className="text-[11px] text-slate-400 mb-2">{formatDate(r.createdAt)}</div>}
                              {r.imageUrls.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {r.imageUrls.map((u, i) => {
                                    const resolved = resolveImageUrl(u);
                                    return (
                                      <a key={`${r.replyId}-${i}`} href={resolved} target="_blank" rel="noreferrer"
                                        className="block w-14 overflow-hidden rounded-xl border border-black/5 dark:border-white/10"
                                        style={{ aspectRatio: "9/16" }}>
                                        <img src={resolved} alt="" className="w-full h-full object-cover" />
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <button type="button" onClick={() => openEditModal(r)}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-amber-950 transition hover:bg-amber-400 dark:bg-amber-500/15 dark:text-amber-200">
                                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16.5 3.5l4 4L7 21H3v-4z"/></svg>
                                  Sửa
                                </button>
                                <button type="button" onClick={() => void deleteReply(r.replyId)}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-rose-500 dark:bg-rose-500/15 dark:text-rose-200">
                                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 16h10l1-16"/></svg>
                                  Xóa
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {replyModalOpen && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" onClick={closeReplyModal}>
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(15,23,42,0.75)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl"
            style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
              <div>
                <div className="text-sm font-semibold text-white/90">{editingReplyId ? "Chỉnh sửa phản hồi" : "Phản hồi khách hàng"}</div>
                <div className="mt-0.5 text-xs text-white/55">{editingReplyId ? "Cập nhật nội dung và quản lý ảnh đính kèm." : "Nhập nội dung phản hồi và đính kèm ảnh minh họa."}</div>
              </div>
              <button type="button" onClick={closeReplyModal}
                className="inline-flex cursor-pointer h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:-translate-y-0.5 hover:text-white active:translate-y-0"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              <textarea
                ref={replyModalRef}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[200px] w-full resize-none rounded-2xl px-4 py-3 text-sm text-white/90 outline-none transition placeholder:text-white/30"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                placeholder="Nhập nội dung phản hồi..."
              />

              {/* Image preview */}
              {(existingUrls.length > 0 || replyItems.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {existingUrls.map((u, idx) => (
                    <div key={`ex-${idx}`} className="relative h-16 w-16 overflow-hidden rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                      <img src={resolveImageUrl(u)} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setExistingUrls(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                  {replyItems.map((it, idx) => (
                    <div key={`new-${idx}`} className="relative h-16 w-16 overflow-hidden rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                      <img src={it.url} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeReplyFile(idx)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
              <label className="inline-flex cursor-pointer h-9 w-full items-center justify-center gap-2 rounded-2xl px-3 text-xs font-semibold text-white/75 transition hover:text-white sm:w-auto"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>
                Thêm ảnh {(replyItems.length + existingUrls.length) > 0 && <span className="ml-1 opacity-60">({replyItems.length + existingUrls.length})</span>}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPickReplyFiles(e.target.files)} />
              </label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeReplyModal}
                  className="inline-flex cursor-pointer h-11 flex-1 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white/75 transition hover:-translate-y-0.5 hover:text-white active:translate-y-0 sm:flex-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  Hủy
                </button>
                <button type="button" onClick={() => void submitReply()} disabled={submitting}
                  className="inline-flex cursor-pointer h-11 flex-1 items-center justify-center whitespace-nowrap rounded-2xl px-5 text-sm font-semibold text-emerald-950 transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-60 sm:flex-none"
                  style={{ background: "rgba(52,211,153,0.85)", border: "1px solid rgba(52,211,153,0.3)", boxShadow: "0 4px 20px rgba(52,211,153,0.25)" }}>
                  {submitting ? <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-emerald-950/30 border-t-emerald-950" /> : "Lưu phản hồi"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
