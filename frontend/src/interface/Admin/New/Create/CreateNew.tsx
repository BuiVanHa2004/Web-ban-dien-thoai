"use client";

import Link from "next/link";
import AdminActionBar from "@/components/admins/AdminActionBar";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModalPortal from "@/components/admins/ModalPortal";
import ValidationModal from "@/components/admins/ValidationModal";

import { newsService } from "@/services/newsService";

export default function CreateNew() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [imageItems, setImageItems] = React.useState<{ file: File; preview: string }[]>([]);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [descriptionModalOpen, setDescriptionModalOpen] = React.useState(false);
  const descriptionModalRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState("");
  const [validationModal, setValidationModal] = React.useState<{ open: boolean; fields: string[] }>({ open: false, fields: [] });

  const canSubmit = React.useMemo(() => {
    const t = title.trim();
    const d = description.trim();
    return !!t && !!d && imageItems.length > 0 && !submitting;
  }, [title, description, imageItems.length, submitting]);

  function showToast(message: string) {
    setToastMessage(message);
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 4000);
  }

  function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newItems: { file: File; preview: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const preview = URL.createObjectURL(file);
      newItems.push({ file, preview });
    }
    setImageItems((prev) => [...prev, ...newItems]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function removeImage(index: number) {
    const item = imageItems[index];
    if (item.preview.startsWith("blob:")) {
      URL.revokeObjectURL(item.preview);
    }
    setImageItems(imageItems.filter((_, i) => i !== index));
  }

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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const d = description.trim();
    const s = slug.trim();
    const missingFields: string[] = [];
    if (!t) missingFields.push("Tiêu đề tin tức");
    if (!s) missingFields.push("Slug (URL)");
    if (imageItems.length === 0) missingFields.push("Ảnh tin tức");
    if (!d) missingFields.push("Mô tả tin tức");

    if (missingFields.length > 0) {
      setValidationModal({ open: true, fields: missingFields });
      return;
    }

    setError(null);
    setSubmitting(true);

    window.setTimeout(async () => {
      try {
        // Upload all files
        const uploaded = await Promise.all(
          imageItems.map(item => newsService.uploadNewsImage(item.file))
        );
        const uploadedUrls = uploaded.map(r => r.url);

        await newsService.create({
          newsTitle: t,
          slug: s,
          newsDescribe: d || null,
          newsImages: uploadedUrls,
        });
        router.push("/news");
      } catch (e: any) {
        const errorMessage = e?.message || "Không thể tạo tin tức.";
        setError(errorMessage);
        showToast(errorMessage);
      } finally {
        setSubmitting(false);
      }
    }, 220);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(232,121,249,0.55)]" />
            Thêm tin tức
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Thêm tin tức</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Tạo bài viết tin tức mới.</p>
        </div>
      </div>

      <AdminActionBar backHref="/news" formId="news-form" submitting={submitting} />

      <div className="grid gap-4 lg:grid-cols-5">
        <form
          id="news-form"
          onSubmit={onSubmit}
          className="lg:col-span-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur dark:hover:shadow-black/40"
        >
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/60">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Thông tin tin tức</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Vui lòng nhập đầy đủ thông tin.</div>
          </div>

          <div className="space-y-4 p-5">
            {error ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tiêu đề</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                placeholder="Nhập tiêu đề tin tức"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Slug (URL)</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                placeholder="Nhập slug tin tức"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ảnh tin tức</label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  handleFileSelect(e.target.files);
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
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
                    if (imageFiles.length > 0) {
                      handleFileSelect(files);
                    }
                  }
                }}
                className={
                  "group relative overflow-hidden rounded-3xl border border-dashed p-4 cursor-pointer transition " +
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
                      Kéo-thả hoặc bấm để chọn nhiều ảnh
                    </div>
                  </div>
                </div>
              </div>

              {imageItems.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-3">
                  {imageItems.map((item, idx) => (
                    <div key={idx} className="relative group">
                      <div className="h-24 w-24 overflow-hidden rounded-full ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                        <Image
                          src={item.preview}
                          alt={`News image ${idx + 1}`}
                          width={96}
                          height={96}
                          unoptimized
                          className="h-full w-full rounded-full object-cover cursor-pointer transition duration-300 group-hover:scale-110"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Thông tin</label>
              <textarea
                value={description}
                readOnly
                onClick={() => setDescriptionModalOpen(true)}
                className="min-h-[160px] w-full resize-none rounded-2xl bg-slate-100 px-3 py-2 text-sm cursor-pointer text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                placeholder="Nhấn để phóng to và nhập thông tin..."
              />

              <ModalPortal isOpen={descriptionModalOpen} onClose={() => setDescriptionModalOpen(false)} glass>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-4xl overflow-hidden rounded-3xl"
                  style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
                    <div>
                      <div className="text-sm font-semibold text-white/90">Nhập mô tả</div>
                      <div className="mt-1 text-xs text-white/55">Không gian lớn để nhập nội dung bao quát hơn.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDescriptionModalOpen(false)}
                      className="inline-flex cursor-pointer h-10 w-10 items-center justify-center rounded-2xl text-white/70 transition hover:-translate-y-0.5 hover:text-white active:translate-y-0"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                      aria-label="Đóng"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-5">
                    <textarea
                      ref={descriptionModalRef}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[420px] w-full resize-none rounded-2xl px-4 py-3 text-sm text-white/90 outline-none transition placeholder:text-white/30"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                      placeholder="Mô tả tin tức..."
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
                    <button
                      type="button"
                      onClick={() => setDescriptionModalOpen(false)}
                      className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white/75 transition-all hover:-translate-y-0.5 hover:text-white active:translate-y-0"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescriptionModalOpen(false)}
                      className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl px-6 text-sm font-semibold text-amber-950 transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                      style={{ background: "rgba(52,211,153,0.85)", border: "1px solid rgba(52,211,153,0.3)", boxShadow: "0 4px 20px rgba(52,211,153,0.25)" }}
                    >
                      Lưu
                    </button>
                  </div>
                </motion.div>
              </ModalPortal>
            </div>
          </div>
        </form>

        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur dark:hover:shadow-black/40">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/60">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Xem trước</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Card tin tức hiển thị ở danh sách.</div>
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
                      className="h-full w-full rounded-full object-cover cursor-pointer transition duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {title.trim() || "Tiêu đề tin tức"}
                    </div>
                    <div className="mt-1 line-clamp-2 max-w-[520px] text-sm text-slate-800 dark:text-slate-200">
                      {description.trim() || "Mô tả sẽ hiển thị ở đây."}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                Tip: Bạn có thể thêm nhiều ảnh cho tin tức.
              </div>
            </div>
          </div>
        </div>
      </div>

      <ValidationModal
        open={validationModal.open}
        fields={validationModal.fields}
        onClose={() => setValidationModal({ open: false, fields: [] })}
      />
    </div>
  );
}