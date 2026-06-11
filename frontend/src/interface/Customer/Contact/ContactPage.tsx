"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Image as ImageIcon,
  Phone,
  Mail,
  Clock,
  ChevronRight,
  Trash2,
  Edit3,
  RefreshCcw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  X,
  Plus,
  ArrowRight
} from "lucide-react";
import type { User } from "@/common/types/auth";
import { customerAccountService } from "@/services/customerAccountService";
import { contactService } from "@/services/contactService";
import SocialQrContact from "@/components/customers/SocialQrContact";
import { useAppNotification } from "@/providers/AppNotificationProvider";

const API_URL = (process.env.NEXT_PUBLIC_URL || "http://localhost:8080").replace(/\/$/, "");

function resolveImageUrl(url?: string | null): string | undefined {
  if (!url || url === "") return undefined;
  if (url.startsWith("http")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_URL}${path}`;
}

type SubmitStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

type ContactHistoryItem = {
  contactId: number;
  subject: string | null;
  message: string | null;
  createdAt: string | null;
  imageUrls: string[];
  replies: Array<{ replyId: number; replyContent: string; imageUrls: string[] }>;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function ContactPage() {
  const { showToast, confirm } = useAppNotification();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<Array<{ file: File; url: string }>>([]);
  const [status, setStatus] = useState<SubmitStatus>({ state: "idle" });
  const [prefilled, setPrefilled] = useState(false);
  const [history, setHistory] = useState<ContactHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previews = useMemo(() => items, [items]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      window.dispatchEvent(new Event("show-auth-popup"));
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadCustomerInfo = async () => {
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        if (!raw) return;

        const u = JSON.parse(raw) as User;
        const isCustomer = String(u?.userType || "").toLowerCase() === "customer";
        if (!isCustomer) return;

        if (mounted) {
          setFullName((v) => (v.trim() ? v : String(u?.name || "")));
          setEmail((v) => (v.trim() ? v : String(u?.email || "")));
          // @ts-ignore
          setPhone((v) => (v.trim() ? v : String(u?.phone || "")));
          setPrefilled(true);
        }

        const customerId = Number(u?.id);
        if (!Number.isFinite(customerId) || customerId <= 0) return;

        const dto = await customerAccountService.getById(customerId);
        if (!mounted) return;

        setFullName((v) => (v.trim() ? v : dto?.fullName || ""));
        setEmail((v) => (v.trim() ? v : dto?.email || ""));
        setPhone((v) => (v.trim() ? v : dto?.phone || ""));
        setPrefilled(true);
        // load contact history once we have an email (so navigating to this page shows history)
        try {
          const finalEmail = dto?.email || (u?.email as string) || "";
          if (mounted) await loadHistoryByEmail(String(finalEmail));
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    };

    void loadCustomerInfo();
    return () => {
      mounted = false;
    };
  }, []);

  async function loadHistoryByEmail(nextEmail: string) {
    const key = (nextEmail || "").trim();
    let customerId: number | null = null;
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const u = raw ? JSON.parse(raw) : null;
      if (String(u?.userType).toLowerCase() === "customer") {
        customerId = Number(u?.id);
      }
    } catch {
      customerId = null;
    }

    if (!key && !customerId) return;

    setHistoryLoading(true);
    try {
      const url = new URL(`${API_URL}/api/contacts`);
      if (key) url.searchParams.append("email", key);
      if (customerId) url.searchParams.append("customer_id", String(customerId));

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Không thể tải lịch sử liên hệ.");
      const data = (await res.json()) as any[];

      const mapped: ContactHistoryItem[] = Array.isArray(data)
        ? data.map((x) => ({
          contactId: Number(x?.contactId),
          subject: x?.subject ?? null,
          message: x?.message ?? null,
          createdAt: x?.createdAt ?? null,
          imageUrls: Array.isArray(x?.imageUrls) ? x.imageUrls.map(String) : [],
          replies: [],
        }))
        : [];

      const base = mapped.filter((x) => Number.isFinite(x.contactId));
      base.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
      setHistory(base);

      await Promise.all(
        base.map(async (h) => {
          try {
            const rs = await contactService.getRepliesByContactId(h.contactId);
            const replies = (rs || []).map((r: any) => ({
              replyId: Number(r?.replyId),
              replyContent: String(r?.replyContent ?? ""),
              imageUrls: Array.isArray(r?.imageUrls) ? r.imageUrls.map(String) : [],
            }));
            setHistory((prev) => prev.map((it) => (it.contactId === h.contactId ? { ...it, replies } : it)));
          } catch {
            // ignore
          }
        })
      );
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    // Ensure history loads when navigating to this page from anywhere:
    // - try email from state (if already set)
    // - otherwise read cached user from localStorage and load by that email immediately
    if (email && email.trim()) {
      void loadHistoryByEmail(email);
      return;
    }

    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      if (raw) {
        const u = JSON.parse(raw) as User;
        const candidate = String(u?.email || "").trim();
        if (candidate) {
          setEmail((v) => (v.trim() ? v : candidate));
          void loadHistoryByEmail(candidate);
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  useEffect(() => {
    return () => {
      for (const p of items) URL.revokeObjectURL(p.url);
    };
  }, [items]);

  function onPickFiles(next: FileList | null) {
    if (!next || next.length === 0) return;
    const incoming = Array.from(next);
    setItems((prev) => {
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

  function removeFile(index: number) {
    setItems((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleEdit(h: ContactHistoryItem) {
    setEditingId(h.contactId);
    setSubject(h.subject || "");
    setMessage(h.message || "");
    setExistingUrls(h.imageUrls);
    for (const it of items) URL.revokeObjectURL(it.url);
    setItems([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    const ok = await confirm({
      title: "Xóa liên hệ",
      message: "Bạn có chắc chắn muốn xóa liên hệ này? Thao tác này không thể hoàn tác.",
      type: "danger",
      confirmText: "XÓA",
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API_URL}/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xóa thất bại.");
      setHistory((prev) => prev.filter((x) => x.contactId !== id));
      showToast("Đã xóa liên hệ.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Có lỗi xảy ra.", "error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      window.dispatchEvent(new Event("show-auth-popup"));
      return;
    }
    setStatus({ state: "idle" });

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) { setStatus({ state: "error", message: "Vui lòng nhập họ và tên." }); return; }
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) { setStatus({ state: "error", message: "Vui lòng nhập email hợp lệ." }); return; }
    if (!trimmedSubject) { setStatus({ state: "error", message: "Vui lòng nhập chủ đề." }); return; }
    if (!trimmedMessage) { setStatus({ state: "error", message: "Vui lòng nhập nội dung liên hệ." }); return; }

    setStatus({ state: "submitting" });
    const form = new FormData();
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const u = raw ? JSON.parse(raw) : null;
      if (String(u?.userType).toLowerCase() === "customer" && u?.id) {
        form.append("customer_id", String(u.id));
      }
    } catch { }

    form.append("full_name", trimmedName);
    form.append("email", trimmedEmail);
    form.append("phone", phone.trim());
    form.append("subject", trimmedSubject);
    form.append("message", trimmedMessage);
    for (const it of items) form.append("images", it.file);
    if (editingId && existingUrls.length > 0) {
      existingUrls.forEach((u) => form.append("existingImageUrls", u));
    }

    try {
      const res = await fetch(editingId ? `${API_URL}/api/contacts/${editingId}` : `${API_URL}/api/contacts`, {
        method: editingId ? "PATCH" : "POST",
        body: form,
      });

      if (!res.ok) {
        let msg = "Gửi liên hệ thất bại. Vui lòng thử lại.";
        try {
          const data = (await res.json()) as any;
          msg = data?.message || data?.error || msg;
        } catch { }
        throw new Error(msg);
      }

      setStatus({
        state: "success",
        message: editingId ? "Đã cập nhật liên hệ." : "Đã gửi liên hệ. Chúng tôi sẽ phản hồi sớm nhất.",
      });
      setSubject("");
      setMessage("");
      setEditingId(null);
      setExistingUrls([]);
      for (const it of items) URL.revokeObjectURL(it.url);
      setItems([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      void loadHistoryByEmail(trimmedEmail);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gửi liên hệ thất bại. Vui lòng thử lại.";
      setStatus({ state: "error", message: msg });
    }
  }

  return (
    <div className="w-full space-y-4 py-2 sm:space-y-6 sm:py-4 lg:space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-fuchsia-700 px-3 py-4 shadow-2xl sm:rounded-[2rem] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="relative z-10 flex min-w-0 flex-col gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold leading-tight text-white sm:text-3xl lg:text-4xl">
              Hỗ trợ khách hàng
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-indigo-100 opacity-90 sm:text-sm lg:text-base">
              Chúng tôi luôn sẵn sàng lắng nghe và giải quyết mọi thắc mắc của bạn.
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-xl bg-white/10 p-2.5 backdrop-blur-md border border-white/10 sm:gap-3 sm:rounded-2xl sm:p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400 text-cyan-900 sm:h-9 sm:w-9 sm:rounded-xl">
                <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold text-indigo-200 sm:text-[10px]">Hotline tư vấn</div>
                <div className="text-xs font-black text-white sm:text-sm">0978 603 382</div>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-xl bg-white/10 p-2.5 backdrop-blur-md border border-white/10 sm:gap-3 sm:rounded-2xl sm:p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-400 text-purple-900 sm:h-9 sm:w-9 sm:rounded-xl">
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="text-[9px] font-bold text-indigo-200 sm:text-[10px]">Email hỗ trợ</div>
                <div className="truncate text-xs font-black text-white sm:text-sm">buivanha22032004@gmail.com</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 overflow-hidden sm:gap-4 lg:grid-cols-12 lg:gap-6">
        {/* CONTACT FORM */}
        <div className="min-w-0 lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-xl customer-card-surface border border-zinc-500/50 bg-zinc-800/55 p-3 sm:rounded-2xl sm:p-4 lg:p-6"
          >
            <div className="mb-4 flex min-w-0 items-center gap-2 sm:mb-6 sm:gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 sm:h-10 sm:w-10">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
                  {editingId ? "Cập nhật yêu cầu" : "Gửi yêu cầu hỗ trợ"}
                </h2>
                <p className="truncate text-[10px] font-medium text-slate-400 sm:text-xs">Thời gian phản hồi dự kiến: 2-4h</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Họ và tên</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    readOnly={prefilled}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none ring-purple-600/10 transition focus:border-purple-600 focus:bg-white focus:ring-4 dark:border-slate-700 dark:bg-slate-800"
                    placeholder="Nhập họ và tên..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={prefilled}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none ring-purple-600/10 transition focus:border-purple-600 focus:bg-white focus:ring-4 dark:border-slate-700 dark:bg-slate-800"
                    placeholder="example@gmail.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Số điện thoại</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    readOnly={prefilled}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none ring-purple-600/10 transition focus:border-purple-600 focus:bg-white focus:ring-4 dark:border-slate-700 dark:bg-slate-800"
                    placeholder="09xxx"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Chủ đề</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none ring-purple-600/10 transition focus:border-purple-600 focus:bg-white focus:ring-4 dark:border-slate-700 dark:bg-slate-800"
                    placeholder="Tư vấn bảo hành, kỹ thuật..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Nội dung chi tiết</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-[2rem] border border-slate-200 bg-slate-50/50 px-4 py-4 text-sm font-semibold outline-none ring-purple-600/10 transition focus:border-purple-600 focus:bg-white focus:ring-4 dark:border-slate-700 dark:bg-slate-800"
                  placeholder="Hãy mô tả chi tiết vấn đề bạn đang gặp phải..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Đính kèm hình ảnh</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-10 items-center gap-2 rounded-xl bg-purple-50 px-4 text-xs font-bold text-purple-600 transition hover:bg-purple-100 active:scale-95 dark:bg-purple-500/10"
                  >
                    <Plus className="h-4 w-4" /> Thêm ảnh
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPickFiles(e.target.files)} />
                </div>

                <AnimatePresence>
                  {((editingId && existingUrls.length > 0) || items.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-3 overflow-hidden py-2"
                    >
                      {existingUrls.map((u, idx) => (
                        <div key={`existing-${idx}`} className="relative group">
                          <div className="relative aspect-[9/16] w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                            <img src={resolveImageUrl(u)} className="h-full w-full object-contain transition group-hover:scale-110" alt="" />
                          </div>
                          <button
                            type="button"
                            onClick={() => setExistingUrls((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {previews.map((p, idx) => (
                        <div key={`new-${idx}`} className="relative group">
                          <div className="relative aspect-[9/16] w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                            <img src={p.url} className="h-full w-full object-contain transition group-hover:scale-110" alt="" />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {status.state === "error" && (
                <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-600 border border-rose-100 dark:bg-rose-500/10">
                  <AlertCircle className="h-4 w-4" /> {status.message}
                </div>
              )}
              {status.state === "success" && (
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4" /> {status.message}
                </div>
              )}

              <div className="flex flex-col-reverse gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSubject(""); setMessage(""); setEditingId(null); setExistingUrls([]);
                    for (const it of items) URL.revokeObjectURL(it.url);
                    setItems([]); setStatus({ state: "idle" });
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900"
                >
                  Đặt lại form
                </button>
                <button
                  type="submit"
                  disabled={status.state === "submitting"}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 text-sm font-black text-white shadow-xl shadow-purple-500/20 transition hover:opacity-95 active:scale-95 disabled:opacity-50"
                >
                  {status.state === "submitting" ? (
                    <RefreshCcw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {editingId ? "Cập nhật yêu cầu" : "Gửi liên hệ ngay"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* SIDEBAR: INFO & TIPS */}
        <div className="min-w-0 space-y-3 sm:space-y-4 lg:col-span-5 lg:flex lg:flex-col">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-xl customer-card-surface border border-zinc-500/50 bg-zinc-800/55 p-3 sm:rounded-2xl sm:p-4 lg:p-6"
          >
            <h3 className="flex min-w-0 items-center gap-2 text-base font-black text-slate-900 dark:text-white sm:text-lg">
              <Clock className="h-4 w-4 shrink-0 text-indigo-600 sm:h-5 sm:w-5" />
              <span className="truncate">Thời gian hoạt động</span>
            </h3>
            <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
              <div className="flex min-w-0 items-center justify-between gap-2 text-xs sm:text-sm">
                <span className="shrink-0 font-bold text-slate-500">Thứ 2 - Thứ 6</span>
                <span className="whitespace-nowrap rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-900 dark:bg-slate-800 dark:text-white sm:px-3 sm:text-xs">08:00 - 18:00</span>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-2 text-xs sm:text-sm">
                <span className="shrink-0 font-bold text-slate-500">Thứ 7</span>
                <span className="whitespace-nowrap rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-900 dark:bg-slate-800 dark:text-white sm:px-3 sm:text-xs">08:00 - 12:00</span>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-2 text-xs sm:text-sm">
                <span className="shrink-0 font-bold text-slate-500">Chủ nhật</span>
                <span className="whitespace-nowrap rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500 dark:bg-rose-950/30 sm:px-3 sm:text-xs">Nghỉ lễ</span>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl bg-purple-50/50 p-3 dark:bg-purple-900/20 border border-purple-100/50 sm:mt-5 sm:rounded-2xl sm:p-4">
              <div className="flex min-w-0 items-center gap-2 text-xs font-black text-purple-700 dark:text-purple-300 sm:text-sm">
                <HelpCircle className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                <span>Gợi ý gửi tin</span>
              </div>
              <ul className="mt-2 space-y-1.5 text-[10px] font-bold leading-relaxed text-slate-600 dark:text-slate-400 sm:mt-3 sm:space-y-2 sm:text-xs">
                <li className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-purple-500">•</span>
                  <span className="break-words">Cung cấp mã đơn hàng nếu cần tra cứu bảo hành.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-purple-500">•</span>
                  <span className="break-words">Mô tả rõ ràng lỗi phát sinh để được hỗ trợ nhanh nhất.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-purple-500">•</span>
                  <span className="break-words">Đính kèm hình ảnh thực tế của sản phẩm gặp vấn đề.</span>
                </li>
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="overflow-hidden rounded-xl customer-card-surface border border-zinc-500/50 bg-zinc-800/55 p-3 sm:rounded-2xl sm:p-4 lg:flex-1 lg:p-6"
          >
            <SocialQrContact title="Liên hệ qua Zalo / TikTok / Facebook" />
          </motion.div>
        </div>

        {/* HISTORY SECTION */}
        <div className="min-w-0 lg:col-span-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="overflow-hidden rounded-xl customer-card-surface border border-zinc-500/50 bg-zinc-800/55 p-3 sm:rounded-2xl sm:p-4 lg:p-6"
          >
            <div className="mb-4 flex min-w-0 items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800 sm:mb-6 sm:gap-3 sm:pb-4">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 sm:h-12 sm:w-12">
                  <RefreshCcw className={`h-4 w-4 sm:h-6 sm:w-6 ${historyLoading ? "animate-spin" : ""}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-slate-900 dark:text-white sm:text-lg lg:text-xl">Lịch sử liên hệ</h3>
                  <p className="truncate text-[10px] font-bold text-slate-400 sm:text-xs">Xem lại các yêu cầu bạn đã gửi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void loadHistoryByEmail(email)}
                className="flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-2 text-[10px] font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 sm:h-10 sm:gap-1.5 sm:rounded-2xl sm:px-4 sm:text-xs"
              >
                Làm mới
              </button>
            </div>

            {historyLoading && history.length === 0 ? (
              <div className="grid gap-4 sm:gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-50 dark:bg-slate-800/50 sm:h-40 sm:rounded-2xl" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center sm:py-24">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-4xl shadow-inner dark:bg-slate-800 sm:h-24 sm:w-24 sm:text-5xl">✉️</div>
                <h4 className="mt-4 text-base font-black text-slate-900 dark:text-white sm:mt-6 sm:text-lg">Chưa có liên hệ nào</h4>
                <p className="mt-1 text-xs font-bold text-slate-400 sm:mt-2 sm:text-sm">Mọi yêu cầu hỗ trợ của bạn sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-1 sm:gap-4 lg:gap-6">
                {history.map((h, idx) => (
                  <motion.div
                    key={h.contactId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group relative min-w-0 overflow-hidden rounded-xl customer-card-surface border border-zinc-500/50 bg-zinc-800/55 p-3 transition-all hover:border-zinc-500/40 sm:rounded-2xl sm:p-4 lg:p-5"
                  >
                    <div className="flex min-w-0 flex-col gap-3">
                      <div className="min-w-0 flex-1 space-y-2 sm:space-y-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="flex min-w-0 items-center gap-1 text-[10px] font-bold text-slate-400 sm:gap-1.5 sm:text-xs">
                            <Clock className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                            <span className="truncate">{formatDate(h.createdAt)}</span>
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors sm:text-base lg:text-lg">
                          {h.subject || "(Không có chủ đề)"}
                        </h4>
                        <p className="text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line sm:text-sm">{h.message}</p>

                        {h.imageUrls.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2 sm:gap-3">
                            {h.imageUrls.map((u, i) => (
                              <div key={i} className="relative aspect-[9/16] w-14 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 sm:w-16 sm:rounded-xl">
                                <img src={resolveImageUrl(u)} className="h-full w-full object-contain transition group-hover:scale-110" alt="" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(h)}
                          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 text-[10px] font-black text-amber-600 transition hover:bg-amber-100 dark:bg-amber-900/20 shadow-sm sm:h-9 sm:flex-none sm:gap-2 sm:px-4 sm:text-xs"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(h.contactId)}
                          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-3 text-[10px] font-black text-rose-600 transition hover:bg-rose-100 dark:bg-rose-900/20 shadow-sm sm:h-9 sm:flex-none sm:gap-2 sm:px-4 sm:text-xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Xóa
                        </button>
                      </div>
                    </div>

                    {/* REPLIES TIMELINE */}
                    {h.replies.length > 0 && (
                      <div className="mt-4 space-y-3 overflow-hidden rounded-xl bg-indigo-50/50 p-3 dark:bg-indigo-900/10 border border-indigo-100/50 sm:mt-5 sm:space-y-4 sm:rounded-2xl sm:p-4">
                        <div className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 sm:gap-3 sm:text-[11px]">
                          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600 animate-pulse sm:h-2 sm:w-2" />
                          <span>Phản hồi từ Shop</span>
                        </div>
                        {h.replies.map((r) => (
                          <div key={r.replyId} className="space-y-3">
                            <p className="text-xs font-bold leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-line bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl sm:text-sm sm:p-4">
                              {r.replyContent}
                            </p>
                            {r.imageUrls.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {r.imageUrls.map((u, i) => (
                                  <div key={i} className="relative aspect-[9/16] w-14 overflow-hidden rounded-lg border border-white bg-white/50 shadow-sm sm:w-20 sm:rounded-xl">
                                    <img src={resolveImageUrl(u)} className="h-full w-full object-contain transition group-hover:scale-110" alt="" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
