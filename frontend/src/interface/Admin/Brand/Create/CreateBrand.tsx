"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

import { brandService } from "@/services/brandService";
import { useAppNotification } from "@/providers/AppNotificationProvider";

export default function CreateBrand() {
  const router = useRouter();
  const { showToast } = useAppNotification();
  const [name, setName] = React.useState("");
  const [imageItems, setImageItems] = React.useState<{ file: File; preview: string }[]>([]);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [descriptionModalOpen, setDescriptionModalOpen] = React.useState(false);
  const descriptionModalRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [slug, setSlug] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [validationModal, setValidationModal] = React.useState<{ open: boolean; fields: string[] }>({ open: false, fields: [] });

  const canSubmit = React.useMemo(() => {
    const n = name.trim();
    const d = description.trim();
    return !!n && !!d && imageItems.length > 0 && !submitting;
  }, [name, description, imageItems.length, submitting]);

  React.useEffect(() => {
    console.log('imageItems changed:', imageItems);
  }, [imageItems]);

  React.useEffect(() => {
    if (!descriptionModalOpen) return;
    const t = window.setTimeout(() => {
      descriptionModalRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, [descriptionModalOpen]);

  React.useEffect(() => {
    if (!descriptionModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDescriptionModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [descriptionModalOpen]);

  function handleImageSelect(file: File) {
    const preview = URL.createObjectURL(file);
    setImageItems(prev => [...prev, { file, preview }]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function removeImage(index: number) {
    const item = imageItems[index];
    if (item.preview.startsWith("blob:")) {
      URL.revokeObjectURL(item.preview);
    }
    setImageItems(imageItems.filter((_, i) => i !== index));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const d = description.trim();
    const s = slug.trim();
    const missingFields: string[] = [];
    if (!n) missingFields.push("Tên thương hiệu");
    if (!s) missingFields.push("Slug (URL)");
    if (imageItems.length === 0) missingFields.push("Ảnh thương hiệu");
    if (!d) missingFields.push("Mô tả thương hiệu");

    if (missingFields.length > 0) {
      setValidationModal({ open: true, fields: missingFields });
      return;
    }

    setError(null);
    setSubmitting(true);

    window.setTimeout(async () => {
      try {
        // Upload all files first
        const uploaded = await Promise.all(
          imageItems.map(item => brandService.uploadBrandImage(item.file))
        );
        const uploadedUrls = uploaded.map(r => r.url);

        const payload = {
          brandName: n,
          slug: s,
          brandDescription: d || null,
          brandImages: uploadedUrls,
        };
        console.log('Submitting brand with payload:', payload);
        await brandService.create(payload);
        console.log('Brand created successfully');
        router.push("/brands");
      } catch (e: any) {
        console.error('Create brand error:', e);
        const errorMessage = e?.message || "Không thể tạo thương hiệu.";
        setError(errorMessage);
        showToast(errorMessage);
      } finally {
        setSubmitting(false);
      }
    }, 220);
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-5"
    >
      <div className="flex flex-col gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(232,121,249,0.55)]" />
            Thêm thương hiệu
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Thêm thương hiệu</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Tạo thương hiệu mới cho hệ thống.</p>
        </div>
      </div>

      <div className="fixed top-[120px] right-9 z-50 flex items-center gap-3">
        <Link
          href="/brands"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Quay lại
        </Link>
        <button
          type="submit"
          form="brand-form"
          disabled={submitting}
          className={
            "inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0 " +
            (submitting ? "opacity-70 pointer-events-none" : "")
          }
        >
          {submitting ? (
            <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8" />
              <path d="M7 3v4h8" />
            </svg>
          )}
          Lưu
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <form
          id="brand-form"
          onSubmit={onSubmit}
          className="lg:col-span-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur dark:hover:shadow-black/40"
        >
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/60">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Thông tin thương hiệu</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Vui lòng nhập đầy đủ thông tin.</div>
          </div>

          <div className="space-y-4 p-5">
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tên thương hiệu</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                placeholder="Nhập tên thương hiệu"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Slug (URL)</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                placeholder="Nhập slug thương hiệu"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ảnh thương hiệu</label>
              {imageItems.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-3">
                  {imageItems.map((item, idx) => (
                    <div key={idx} className="relative group">
                      <div className="h-24 w-24 overflow-hidden rounded-full ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                        <Image
                          src={item.preview}
                          alt={`Brand image ${idx + 1}`}
                          width={96}
                          height={96}
                          unoptimized
                          className="h-full w-full cursor-pointer rounded-full object-cover transition duration-300 group-hover:scale-110"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-1 -right-1 h-6 w-6 flex cursor-pointer items-center justify-center rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18" />
                          <path d="M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f) {
                    handleImageSelect(f);
                  }
                }}
                className="hidden"
              />

              <div
                role="button"
                tabIndex={0}
                onClick={() => imageInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    imageInputRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingFile(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingFile(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingFile(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingFile(false);
                  const f = e.dataTransfer.files?.[0] || null;
                  if (f && f.type.startsWith("image/")) {
                    handleImageSelect(f);
                  }
                }}
                className={
                  "group relative cursor-pointer overflow-hidden rounded-3xl border border-dashed p-4 transition " +
                  (isDraggingFile
                    ? "border-emerald-400 bg-emerald-50 shadow-sm dark:border-emerald-400/50 dark:bg-emerald-500/10"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10")
                }
              >
                <div className="flex items-start gap-3">
                  <div
                    className={
                      "mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 transition " +
                      (isDraggingFile
                        ? "bg-emerald-600 text-white ring-emerald-600/20"
                        : "bg-slate-900/90 text-white ring-slate-900/10 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10")
                    }
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3v10" />
                      <path d="M8 7l4-4 4 4" />
                      <path d="M20 21H4a2 2 0 0 1-2-2v-5" />
                      <path d="M22 14v5a2 2 0 0 1-2 2" />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Tải ảnh lên
                    </div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      Kéo-thả ảnh vào đây hoặc bấm để chọn
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Mô tả</label>
              <textarea
                value={description}
                readOnly
                onClick={() => setDescriptionModalOpen(true)}
                className="min-h-[120px] w-full resize-none rounded-2xl bg-slate-100 px-3 py-2 text-sm cursor-pointer text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                placeholder="Nhấn để phóng to và nhập mô tả..."
              />
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Nhấn vào ô mô tả để mở cửa sổ nhập lớn.
              </div>
            </div>

            <AnimatePresence>
              {descriptionModalOpen && (
                <div
                  className="fixed inset-0 z-[90] flex items-center justify-center p-4"
                  role="dialog"
                  aria-modal="true"
                >
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setDescriptionModalOpen(false)}
                    className="absolute inset-0 bg-black/55 backdrop-blur-sm" 
                  />

                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/60">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Nhập mô tả</div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Không gian lớn để nhập nội dung bao quát hơn.</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDescriptionModalOpen(false)}
                        className="inline-flex cursor-pointer h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      >
                        Đóng
                      </button>
                    </div>

                    <div className="p-5">
                      <textarea
                        ref={descriptionModalRef}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[420px] w-full resize-none rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                        placeholder="Mô tả thương hiệu..."
                      />
                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setDescriptionModalOpen(false)}
                          className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => setDescriptionModalOpen(false)}
                          className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </form>

        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/60">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Xem trước</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Card thương hiệu hiển thị ở danh sách.</div>
            </div>
            <div className="p-5 group">
              <div className="rounded-3xl bg-white/60 p-4 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-slate-950/45 dark:ring-white/10 dark:shadow-2xl dark:shadow-black/40">
                <div className="flex items-start gap-3">
                  <div className="h-[70px] w-[70px] shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                    <Image
                      alt="preview"
                      src={
                        imageItems.length > 0
                          ? imageItems[0].preview
                          : "https://dummyimage.com/200x200/e2e8f0/64748b&text=No+Image"
                      }
                      width={70}
                      height={70}
                      unoptimized
                      className="h-full w-full cursor-pointer rounded-full object-cover transition duration-300 group-hover:scale-110"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {name.trim() || "Tên thương hiệu"}
                    </div>
                    <div className="mt-1 line-clamp-2 max-w-[520px] text-sm text-slate-800 dark:text-slate-200">
                      {description.trim() || "Mô tả sẽ hiển thị ở đây."}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                Tip: Bạn có thể thêm nhiều ảnh cho thương hiệu.
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {validationModal.open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" 
              onClick={() => setValidationModal({ ...validationModal, open: false })} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Bạn điền chưa đủ thông tin</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Vui lòng hoàn thiện các mục sau:</p>
                <ul className="mt-3 space-y-1">
                  {validationModal.fields.map((f, i) => (
                    <li key={i} className="text-sm font-medium text-rose-600 dark:text-rose-400">• {f}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setValidationModal({ ...validationModal, open: false })}
                  className="mt-6 w-full cursor-pointer rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  Đã hiểu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}