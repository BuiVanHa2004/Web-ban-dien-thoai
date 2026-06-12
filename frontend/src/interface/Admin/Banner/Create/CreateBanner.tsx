"use client";

import Link from "next/link";
import AdminActionBar from "@/components/admins/AdminActionBar";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { bannerService, BannerPosition } from "@/services/bannerService";
import { useAppNotification } from "@/providers/AppNotificationProvider";
import ValidationModal from "@/components/admins/ValidationModal";

type ImageItem = {
  id: string;
  file?: File;
  preview: string;
  title: string;
  subtitle: string;
  linkUrl: string;
};

export default function CreateBanner() {
  const router = useRouter();
  const { showToast } = useAppNotification();
  const [title, setTitle] = React.useState(""); // We can keep this as a name for the banner record if we want, or just remove. Let's remove it to match the schema.
  // Actually, the database 'banners' table doesn't have title anymore. 
  // Let's use a generic name for the banner group or just remove it.
  // I'll keep a 'name' field for internal management if the user wants, but the user didn't ask for it.
  // The user wants titles on IMAGES.

  const [position, setPosition] = React.useState<BannerPosition>("SLIDER");
  const [isActive, setIsActive] = React.useState(true);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  
  const [images, setImages] = React.useState<ImageItem[]>([]);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);
  
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [validationModal, setValidationModal] = React.useState<{ open: boolean; fields: string[] }>({ open: false, fields: [] });
  const [mounted, setMounted] = React.useState(false);
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const dropdownScopeRef = React.useRef<HTMLFormElement | null>(null);

  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!openDropdown) return;
      const el = dropdownScopeRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [openDropdown]);

  React.useEffect(() => {
    setMounted(true);
  }, []);


  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages: ImageItem[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      title: "",
      subtitle: "",
      linkUrl: ""
    }));

    setImages(prev => [...prev, ...newImages]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function removeImage(id: string) {
    setImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target && target.file) URL.revokeObjectURL(target.preview);
      return prev.filter(img => img.id !== id);
    });
  }

  function updateImageField(id: string, field: keyof ImageItem, value: string) {
    setImages(prev => prev.map(img => img.id === id ? { ...img, [field]: value } : img));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missingFields: string[] = [];
    if (images.length === 0) missingFields.push("Ảnh banner (ít nhất 1)");
    if (images.some(img => !img.title.trim())) missingFields.push("Tiêu đề cho từng ảnh banner");

    if (missingFields.length > 0) {
      setValidationModal({ open: true, fields: missingFields });
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Upload all files
      const uploaded = await Promise.all(
        images.map(async (img) => {
          if (img.file) {
            const res = await bannerService.uploadBannerImage(img.file);
            return { imageUrl: res.url, title: img.title, subtitle: img.subtitle, linkUrl: img.linkUrl };
          }
          return { imageUrl: img.preview, title: img.title, subtitle: img.subtitle, linkUrl: img.linkUrl };
        })
      );

      const payload = {
        position,
        isActive,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        bannerImages: uploaded.map((img, idx) => ({
          imageUrl: img.imageUrl,
          title: img.title.trim(),
          subtitle: img.subtitle.trim() || null,
          linkUrl: img.linkUrl || null,
          sortOrder: idx
        })),
      };

      console.log("[Create Banner Payload]", JSON.stringify(payload, null, 2));
      await bannerService.create(payload);
      showToast("Tạo banner thành công!", "success");
      router.push("/banners");
    } catch (e: any) {
      console.error("[Create Banner Error]", e);
      const msg = e?.message || "Không thể tạo banner.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return (
    <>
      <AdminActionBar backHref="/banners" formId="banner-form" submitting={submitting} />

      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-3 pr-28 sm:pr-0">
          <div>
            <div className="inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
              <span className="h-2 w-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
              Thêm banner
            </div>
            <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Thêm banner mới</h1>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Tạo banner quảng cáo đa vị trí cho hệ thống.</p>
          </div>
        </div>

        <div className="mx-auto grid w-full min-w-0 max-w-full grid-cols-1 gap-4 pt-14 sm:pt-6 lg:grid-cols-5 lg:gap-6">
          <form
            id="banner-form"
            onSubmit={onSubmit}
            ref={dropdownScopeRef}
            className="mx-auto w-full min-w-0 max-w-full overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur dark:hover:shadow-black/40 sm:rounded-[2rem] lg:col-span-3"
          >
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-slate-950/60 sm:px-6 sm:py-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cấu hình Banner</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Vui lòng cung cấp tiêu đề và ít nhất một hình ảnh.</div>
            </div>

            <div className="min-w-0 space-y-6 p-4 sm:p-6">
              {error && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}

              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 dark:bg-blue-500/5 dark:border-blue-500/20 mb-4">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  Lưu ý: Tiêu đề và phụ đề hiện được cấu hình cho từng ảnh riêng lẻ bên dưới.
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Vị trí hiển thị</label>
                  <div className="relative min-w-0 w-full">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(v => v === "position" ? null : "position")}
                      className="relative box-border flex h-11 w-full min-w-0 max-w-full cursor-pointer items-center justify-between gap-2 rounded-2xl bg-slate-100 px-3 text-left text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 sm:px-4"
                    >
                      <span className="truncate">
                        {position === "SLIDER" ? "Trang chủ - Slider chính" : 
                         position === "TOP" ? "Đầu trang (Top)" : 
                         position === "MIDDLE" ? "Giữa trang (Middle)" : "Cuối trang (Bottom)"}
                      </span>
                      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {openDropdown === "position" && (
                      <div className="absolute left-0 right-0 z-[9999] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-950">
                        <div className="max-h-56 overflow-auto p-1">
                          {[
                            { value: "SLIDER", label: "Trang chủ - Slider chính" },
                            { value: "TOP", label: "Đầu trang (Top)" },
                            { value: "MIDDLE", label: "Giữa trang (Middle)" },
                            { value: "BOTTOM", label: "Cuối trang (Bottom)" },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPosition(opt.value as BannerPosition);
                                setOpenDropdown(null);
                              }}
                              className={
                                "flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                                (position === opt.value ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" : "text-slate-700 dark:text-slate-200")
                              }
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Trạng thái</label>
                  <div className="box-border flex h-11 w-full min-w-0 max-w-full items-center gap-3 rounded-2xl bg-slate-100 px-3 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10 sm:px-4">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-5 w-5 shrink-0 cursor-pointer rounded-lg border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-white/20 dark:bg-white/5"
                    />
                    <span className="min-w-0 truncate text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {isActive ? "Đang hoạt động" : "Không hoạt động"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Ngày bắt đầu</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="box-border h-11 w-full min-w-0 max-w-full rounded-2xl bg-slate-100 px-3 text-xs text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25 sm:px-4 sm:text-sm"
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Ngày kết thúc</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="box-border h-11 w-full min-w-0 max-w-full rounded-2xl bg-slate-100 px-3 text-xs text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25 sm:px-4 sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Danh sách hình ảnh</label>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => imageInputRef.current?.click()}
                  onDragEnter={() => setIsDraggingFile(true)}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    const files = e.dataTransfer.files;
                    if (files) handleImageSelect({ target: { files } } as any);
                  }}
                  className={`group relative overflow-hidden rounded-3xl border border-dashed p-6 transition-all duration-300 cursor-pointer ${isDraggingFile
                    ? "border-cyan-400 bg-pink-500/5 ring-4 ring-cyan-500/10"
                    : "border-slate-200 hover:border-pink-400/50 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10"
                    }`}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg transition-transform group-hover:scale-110 dark:bg-white dark:text-slate-900 ${isDraggingFile ? 'scale-110' : ''}`}>
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 3v10" />
                        <path d="M8 7l4-4 4 4" />
                        <path d="M20 21H4a2 2 0 0 1-2-2v-5" />
                      </svg>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Tải ảnh banner</div>
                    <div className="mt-1 text-[10px] text-slate-500 font-medium">Định dạng JPG, PNG, WebP. Kích thước khuyên dùng 1920x600.</div>
                  </div>
                </div>

                <input ref={imageInputRef} type="file" multiple accept="image/*" onChange={handleImageSelect} className="hidden" />

                {images.length > 0 && (
                  <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
                    {images.map((img) => (
                      <div key={img.id} className="relative overflow-hidden rounded-[1.5rem] bg-slate-100 p-3 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10 group">
                        <div className="aspect-video relative overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 shadow-sm cursor-pointer">
                          <Image src={img.preview} alt="Preview" fill className="object-cover transition-transform duration-500 hover:scale-110" unoptimized />
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xl opacity-100 transition-opacity hover:scale-110 sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 dark:bg-black/20 ring-1 ring-slate-200 dark:ring-white/10">
                            <input
                              value={img.title}
                              onChange={(e) => updateImageField(img.id, "title", e.target.value)}
                              placeholder="Tiêu đề ảnh..."
                              className="w-full bg-transparent text-[11px] font-bold outline-none text-slate-900 dark:text-slate-100"
                            />
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 dark:bg-black/20 ring-1 ring-slate-200 dark:ring-white/10">
                            <input
                              value={img.subtitle}
                              onChange={(e) => updateImageField(img.id, "subtitle", e.target.value)}
                              placeholder="Phụ đề ảnh..."
                              className="w-full bg-transparent text-[11px] outline-none text-slate-600 dark:text-slate-300"
                            />
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 dark:bg-black/20 ring-1 ring-slate-200 dark:ring-white/10">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                            <input
                              value={img.linkUrl}
                              onChange={(e) => updateImageField(img.id, "linkUrl", e.target.value)}
                              placeholder="URL khi nhấn ảnh..."
                              className="w-full bg-transparent text-[11px] font-medium outline-none text-slate-800 dark:text-slate-200"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>

          <div className="mx-auto w-full min-w-0 max-w-full space-y-4 lg:col-span-2">
            <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur sm:rounded-[2rem]">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-900 dark:border-white/10 dark:bg-slate-950/60 dark:text-white sm:px-6">
                Xem trước hiển thị
              </div>
              <div className="p-4 sm:p-6">
                <div className="group relative aspect-video overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-xl dark:border-white/10 dark:bg-white/5 cursor-pointer">
                  {images.length > 0 ? (
                    <Image src={images[0].preview} alt="Preview" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                      <svg viewBox="0 0 24 24" className="h-10 w-10 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                      <span className="text-xs font-bold uppercase tracking-widest opacity-50">No Image Selected</span>
                    </div>
                  )}

                  <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/60 via-transparent to-transparent p-4 text-white opacity-100 transition-opacity duration-500 sm:p-6 sm:opacity-0 sm:group-hover:opacity-100">
                    <div className="text-lg font-bold truncate">{images[0]?.title || "Tiêu đề banner"}</div>
                    <div className="text-xs opacity-80 truncate">{images[0]?.subtitle || "Phụ đề banner"}</div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/5 p-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/10">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>Mẹo: Banner vị trí SLIDER hỗ trợ nhiều ảnh để tạo trình chiếu tự động trên trang chủ.</span>
                  </div>
                </div>
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

      <style jsx global>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}