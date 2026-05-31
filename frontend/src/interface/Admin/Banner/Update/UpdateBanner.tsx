"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { bannerService, BannerPosition, BannerDto } from "@/services/bannerService";
import { useAppNotification } from "@/providers/AppNotificationProvider";

type ImageItem = {
  id: string;
  file?: File;
  preview: string;
  title: string;
  subtitle: string;
  linkUrl: string;
  bannerImageId?: number;
};

export default function UpdateBanner() {
  const router = useRouter();
  const { showToast } = useAppNotification();
  const searchParams = useSearchParams();
  const idStr = searchParams.get("id") || "";
  const bannerId = Number(idStr);

  const [loading, setLoading] = React.useState(true);
  const [title, setTitle] = React.useState(""); // Kept for logic compatibility but removed from UI
  // removed subtitle state

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

  React.useEffect(() => {
    (async () => {
      if (!idStr || Number.isNaN(bannerId)) {
        setError("Thiếu ID banner.");
        setLoading(false);
        return;
      }
      try {
        const dto = await bannerService.getById(bannerId);
        // title and subtitle are no longer on dto directly in the new schema, 
        // but we can use the first image's title as a label if needed.
        setTitle(""); 

        setPosition(dto.position || "SLIDER");
        setIsActive(dto.isActive);
        
        if (dto.startDate) {
          const d = new Date(dto.startDate);
          setStartDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        }
        if (dto.endDate) {
          const d = new Date(dto.endDate);
          setEndDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        }

        if (dto.bannerImages) {
          setImages(dto.bannerImages.map(img => ({
            id: String(img.bannerImageId || Math.random()),
            bannerImageId: img.bannerImageId,
            preview: img.imageUrl,
            title: img.title || "",
            subtitle: img.subtitle || "",
            linkUrl: img.linkUrl || ""
          })));
        }
      } catch (e: any) {
        setError(e?.message || "Không thể tải thông tin banner.");
      } finally {
        setLoading(false);
      }
    })();
  }, [idStr, bannerId]);

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
      // Upload new files
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

      await bannerService.update(bannerId, payload);
      router.push("/banners");
    } catch (e: any) {
      console.error("[Update Banner Error]", e);
      const msg = e?.message || "Không thể cập nhật banner.";
      setError(msg);
      showToast(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const formDisabled = loading || !!error;

  if (!mounted) return null;

  return (
    <>
      <div className="fixed top-[99px] right-9 z-[100] flex items-center gap-3">
        <Link
          href="/banners"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Quay lại
        </Link>
        <button
          type="submit"
          form="banner-form"
          disabled={submitting || formDisabled}
          className={
            "inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0 " +
            (submitting || formDisabled ? "opacity-70 pointer-events-none" : "")
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

      <div className="space-y-5">
        <div className="flex flex-col gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
              <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
              Cập nhật Banner
            </div>
            <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Sửa thông tin banner</h1>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">ID: #{bannerId} - Cập nhật nội dung và vị trí hiển thị.</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <form
            id="banner-form"
            onSubmit={onSubmit}
            ref={dropdownScopeRef}
            className="lg:col-span-3 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur"
          >
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-white/10 dark:bg-slate-950/60">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Chi tiết Banner</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Cập nhật tiêu đề, vị trí và quản lý danh sách ảnh.</div>
            </div>

            <div className="space-y-6 p-6">
              {loading && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 animate-pulse">
                  Đang tải dữ liệu...
                </div>
              )}
              {error && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 flex justify-between items-center">
                  <span>{error}</span>
                  <button onClick={() => window.location.reload()} className="hover:underline text-[10px] uppercase font-bold tracking-widest">Thử lại</button>
                </div>
              )}

              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 dark:bg-blue-500/5 dark:border-blue-500/20 mb-4">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  Lưu ý: Tiêu đề và phụ đề hiện được cấu hình cho từng ảnh riêng lẻ bên dưới.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Vị trí</label>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={formDisabled}
                      onClick={() => setOpenDropdown(v => v === "position" ? null : "position")}
                      className="relative z-[120] flex h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl bg-slate-100 px-4 text-left text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 disabled:opacity-50"
                    >
                      <span className="truncate">
                        {position === "SLIDER" ? "Slider chính" : 
                         position === "TOP" ? "Đầu trang (Top)" : 
                         position === "MIDDLE" ? "Giữa trang (Middle)" : "Cuối trang (Bottom)"}
                      </span>
                      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {!formDisabled && openDropdown === "position" && (
                      <>
                        <div 
                          className="fixed inset-0 z-[110] bg-slate-950/20 backdrop-blur-md transition-opacity"
                          onClick={() => setOpenDropdown(null)}
                        />
                        <div className="absolute left-0 right-0 z-[120] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-popover dark:border-white/10 dark:bg-slate-950">
                          <div className="max-h-56 overflow-auto p-1">
                            {[
                              { value: "SLIDER", label: "Slider chính" },
                              { value: "TOP", label: "Đầu trang (Top)" },
                              { value: "MIDDLE", label: "Giữa trang (Middle)" },
                              { value: "BOTTOM", label: "Cuối trang (Bottom)" },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
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
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Trạng thái</label>
                  <div className="flex h-11 items-center gap-3 px-1">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      disabled={formDisabled}
                      className="h-5 w-5 cursor-pointer rounded-lg border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-white/20 dark:bg-white/5 disabled:opacity-50"
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {isActive ? "Đang hoạt động" : "Không hoạt động"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Ngày bắt đầu</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={formDisabled}
                    className="h-11 w-full rounded-2xl bg-slate-100 px-4 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25 disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Ngày kết thúc</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={formDisabled}
                    className="h-11 w-full rounded-2xl bg-slate-100 px-4 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Quản lý hình ảnh</label>
                
                <div
                  role="button"
                  onClick={() => !formDisabled && imageInputRef.current?.click()}
                  onDragEnter={() => !formDisabled && setIsDraggingFile(true)}
                  onDragOver={(e) => { e.preventDefault(); !formDisabled && setIsDraggingFile(true); }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    if (formDisabled) return;
                    const files = e.dataTransfer.files;
                    if (files) handleImageSelect({ target: { files } } as any);
                  }}
                  className={`group relative overflow-hidden rounded-3xl border border-dashed p-6 transition-all duration-300 ${
                    isDraggingFile 
                    ? "border-cyan-400 bg-pink-500/5 ring-4 ring-cyan-500/10" 
                    : "border-slate-200 hover:border-pink-400/50 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10"
                  } ${formDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg transition-transform group-hover:scale-110 dark:bg-white dark:text-slate-900 ${isDraggingFile ? 'scale-110' : ''}`}>
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 3v10" />
                        <path d="M8 7l4-4 4 4" />
                        <path d="M20 21H4a2 2 0 0 1-2-2v-5" />
                      </svg>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Bổ sung hình ảnh</div>
                    <div className="mt-1 text-[10px] text-slate-500 font-medium">Bạn có thể tải thêm nhiều ảnh mới.</div>
                  </div>
                </div>

                <input ref={imageInputRef} type="file" multiple accept="image/*" onChange={handleImageSelect} disabled={formDisabled} className="hidden" />

                <div className="grid gap-3 sm:grid-cols-2">
                  {images.map((img) => (
                    <div key={img.id} className="relative overflow-hidden rounded-[1.5rem] bg-slate-100 p-3 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10 group">
                      <div className="aspect-video relative overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 shadow-sm cursor-pointer">
                        <Image src={img.preview} alt="Banner" fill className="object-cover transition-transform duration-500 hover:scale-110" unoptimized />
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          disabled={formDisabled}
                          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 disabled:opacity-40"
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
                            disabled={formDisabled}
                            placeholder="Tiêu đề ảnh..."
                            className="w-full bg-transparent text-[11px] font-bold outline-none text-slate-900 dark:text-slate-100 disabled:opacity-50"
                          />
                        </div>
                        <div className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 dark:bg-black/20 ring-1 ring-slate-200 dark:ring-white/10">
                          <input
                            value={img.subtitle}
                            onChange={(e) => updateImageField(img.id, "subtitle", e.target.value)}
                            disabled={formDisabled}
                            placeholder="Phụ đề ảnh..."
                            className="w-full bg-transparent text-[11px] outline-none text-slate-600 dark:text-slate-300 disabled:opacity-50"
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
                            disabled={formDisabled}
                            placeholder="URL khi nhấn ảnh..."
                            className="w-full bg-transparent text-[11px] font-medium outline-none text-slate-800 dark:text-slate-200 disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </form>

          <div className="lg:col-span-2 space-y-4">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur">
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-slate-950/60 font-bold text-sm text-slate-900 dark:text-white">
                Giao diện hiện tại
              </div>
              <div className="p-6">
                <div className="group relative aspect-video overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-xl dark:border-white/10 dark:bg-white/5 cursor-pointer">
                  {images.length > 0 ? (
                    <Image src={images[0].preview} alt="Preview" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-slate-400 animate-pulse">
                      <svg viewBox="0 0 24 24" className="h-10 w-10 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Loading Assets...</span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/70 via-transparent to-transparent p-6 text-white opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <div className="text-lg font-bold truncate">{images[0]?.title || "Tiêu đề banner"}</div>
                    <div className="text-xs opacity-80 truncate">{images[0]?.subtitle || "Phụ đề banner"}</div>
                    <div className="mt-2 text-[10px] font-black uppercase tracking-tighter bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-lg w-fit">{position}</div>
                  </div>
                </div>
                
                <div className="mt-6 p-5 rounded-3xl bg-slate-50 dark:bg-white/5 ring-1 ring-slate-200 dark:ring-white/10">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wider">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-pink-500" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2v20M2 12h20" />
                    </svg>
                    Thông số
                  </div>
                  <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    <div className="flex justify-between">
                      <span>Tổng số ảnh:</span>
                      <span className="text-slate-900 dark:text-white font-bold">{images.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hiệu lực:</span>
                      <span className={isActive ? 'text-emerald-500' : 'text-rose-500'}>{isActive ? 'Có' : 'Không'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Modal */}
      {validationModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setValidationModal({ ...validationModal, open: false })} />
          <div className="relative w-full max-sm overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-2xl animate-scale-in dark:border-white/10 dark:bg-slate-900">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-rose-50 text-rose-500 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
                <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Thiếu thông tin</h3>
              <ul className="mt-4 space-y-2">
                {validationModal.fields.map((f, i) => (
                  <li key={i} className="text-sm font-semibold text-rose-600 dark:text-rose-400">• {f}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setValidationModal({ ...validationModal, open: false })}
                className="mt-8 w-full cursor-pointer rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-950"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
