"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Camera, LoaderCircle, Move, Upload } from "lucide-react";
import Avatar from "@/components/avatar/Avatar";
import { fileUploadService } from "@/services/fileUploadService";

const VIEWPORT_SIZE = 320;
const OUTPUT_SIZE = 800;

type CropDraft = {
  objectUrl: string;
  fileName: string;
  mimeType: string;
  imageWidth: number;
  imageHeight: number;
};

type AvatarUploadFieldProps = {
  label: string;
  value?: string | null;
  name?: string | null;
  helperText?: string;
  disabled?: boolean;
  cropMode?: "none" | "square-required";
  onChange: (file: File | null) => void;
  onPreviewChange?: (previewUrl: string | null) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function readImageSize(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Không thể đọc ảnh đã chọn."));
      img.src = objectUrl;
    });

    return {
      objectUrl,
      width: dims.width,
      height: dims.height,
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export default function AvatarUploadField({
  label,
  value,
  name,
  helperText,
  disabled = false,
  cropMode = "none",
  onChange,
  onPreviewChange,
}: AvatarUploadFieldProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<CropDraft | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offsetX, setOffsetX] = React.useState(0);
  const [offsetY, setOffsetY] = React.useState(0);
  const isDraggingRef = React.useRef(false);
  const dragStartRef = React.useRef({ x: 0, y: 0 });
  const [mounted, setMounted] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (onPreviewChange) {
      onPreviewChange(previewUrl);
    }
  }, [previewUrl, onPreviewChange]);

  const baseScale = React.useMemo(() => {
    if (!draft) return 1;
    return Math.max(VIEWPORT_SIZE / draft.imageWidth, VIEWPORT_SIZE / draft.imageHeight);
  }, [draft]);

  const renderedWidth = React.useMemo(() => {
    if (!draft) return VIEWPORT_SIZE;
    return draft.imageWidth * baseScale * zoom;
  }, [baseScale, draft, zoom]);

  const renderedHeight = React.useMemo(() => {
    if (!draft) return VIEWPORT_SIZE;
    return draft.imageHeight * baseScale * zoom;
  }, [baseScale, draft, zoom]);

  const maxOffsetX = Math.max(0, (renderedWidth - VIEWPORT_SIZE) / 2);
  const maxOffsetY = Math.max(0, (renderedHeight - VIEWPORT_SIZE) / 2);

  React.useEffect(() => {
    setOffsetX((current) => clamp(current, -maxOffsetX, maxOffsetX));
    setOffsetY((current) => clamp(current, -maxOffsetY, maxOffsetY));
  }, [maxOffsetX, maxOffsetY]);

  React.useEffect(() => {
    return () => {
      if (draft?.objectUrl) {
        URL.revokeObjectURL(draft.objectUrl);
      }
    };
  }, [draft]);

  const closeCropModal = React.useCallback(() => {
    setDraft((current) => {
      if (current?.objectUrl) {
        URL.revokeObjectURL(current.objectUrl);
      }
      return null;
    });
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    isDraggingRef.current = false;
    setError(null);
  }, []);

  const uploadFile = React.useCallback(
    async (file: File) => {
      // Don't upload to server, just create preview and pass file to parent
      setUploading(true);
      setError(null);
      try {
        // Create preview URL
        const objectUrl = URL.createObjectURL(file);
        
        // Clean up old preview URL (store in temp var first)
        const oldPreview = previewUrl;
        
        setPreviewUrl(objectUrl);
        onChange(file); // Pass file to parent
        
        // Notify parent about preview change immediately
        if (onPreviewChange) {
          onPreviewChange(objectUrl);
        }
        
        // Clean up old preview after state update
        if (oldPreview) {
          URL.revokeObjectURL(oldPreview);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể xử lý ảnh.");
      } finally {
        setUploading(false);
      }
    },
    [onChange, onPreviewChange, previewUrl]
  );

  const handlePickFile = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Vui lòng chọn một tệp ảnh hợp lệ.");
        return;
      }

      setError(null);

      if (cropMode === "square-required") {
        try {
          const imageMeta = await readImageSize(file);
          setZoom(1);
          setOffsetX(0);
          setOffsetY(0);
          isDraggingRef.current = false;
          setDraft({
            objectUrl: imageMeta.objectUrl,
            fileName: file.name,
            mimeType: file.type || "image/jpeg",
            imageWidth: imageMeta.width,
            imageHeight: imageMeta.height,
          });
        } catch (cropError) {
          setError(cropError instanceof Error ? cropError.message : "Không thể xử lý ảnh đã chọn.");
        }
        return;
      }

      await uploadFile(file);
    },
    [cropMode, uploadFile]
  );

  const handleConfirmCrop = React.useCallback(async () => {
    if (!draft) return;

    const img = new Image();
    img.src = draft.objectUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Không thể tải ảnh để cắt."));
    });

    const scale = baseScale * zoom;
    const sourceSize = VIEWPORT_SIZE / scale;
    const rawSourceX = draft.imageWidth / 2 - sourceSize / 2 - offsetX / scale;
    const rawSourceY = draft.imageHeight / 2 - sourceSize / 2 - offsetY / scale;
    const sourceX = clamp(rawSourceX, 0, draft.imageWidth - sourceSize);
    const sourceY = clamp(rawSourceY, 0, draft.imageHeight - sourceSize);

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
      setError("Trình duyệt không hỗ trợ xử lý ảnh.");
      return;
    }

    context.drawImage(
      img,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    const croppedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!croppedBlob) {
      setError("Không thể tạo ảnh vuông 1:1.");
      return;
    }

    const croppedFile = new File(
      [croppedBlob],
      draft.fileName.replace(/\.[^.]+$/, "") + "-square.jpg",
      { type: "image/jpeg" }
    );

    // Don't upload immediately, just prepare the file
    closeCropModal();
    await uploadFile(croppedFile);
  }, [baseScale, closeCropModal, draft, offsetX, offsetY, uploadFile, zoom]);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - offsetX, y: e.clientY - offsetY };
  }, [offsetX, offsetY]);

  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const newOffsetX = e.clientX - dragStartRef.current.x;
    const newOffsetY = e.clientY - dragStartRef.current.y;
    setOffsetX(clamp(newOffsetX, -maxOffsetX, maxOffsetX));
    setOffsetY(clamp(newOffsetY, -maxOffsetY, maxOffsetY));
  }, [maxOffsetX, maxOffsetY]);

  const handleMouseUp = React.useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  React.useEffect(() => {
    if (!draft) return;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newOffsetX = e.clientX - dragStartRef.current.x;
      const newOffsetY = e.clientY - dragStartRef.current.y;
      setOffsetX(clamp(newOffsetX, -maxOffsetX, maxOffsetX));
      setOffsetY(clamp(newOffsetY, -maxOffsetY, maxOffsetY));
    };
    
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draft, maxOffsetX, maxOffsetY]);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <Avatar src={previewUrl || value} name={name} className="h-20 w-20 shrink-0 aspect-square rounded-3xl" textClassName="text-2xl font-black" />
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || uploading}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Đang xử lý..." : "Chọn ảnh"}
              </button>
              {value || previewUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                    }
                    onChange(null);
                    if (onPreviewChange) {
                      onPreviewChange(null);
                    }
                  }}
                  disabled={disabled || uploading}
                  className="inline-flex h-10 items-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  Xóa ảnh
                </button>
              ) : null}
            </div>
            {helperText ? (
              <div className="text-xs text-slate-500 dark:text-slate-300">{helperText}</div>
            ) : null}
            {previewUrl && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Ảnh chưa được lưu. Nhấn "Lưu" để cập nhật.
              </div>
            )}
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handlePickFile}
          className="hidden"
        />
      </div>

      {mounted && draft ? createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div
            onClick={closeCropModal}
            style={{ 
              backgroundColor: "rgba(15, 23, 42, 0.7)", 
              backdropFilter: "blur(6px)", 
              WebkitBackdropFilter: "blur(6px)" 
            }}
            className="absolute inset-0"
          />
          <div 
            className="relative w-full max-w-3xl overflow-hidden rounded-[2.5rem]"
            style={{ 
              background: "rgba(255,255,255,0.08)", 
              backdropFilter: "blur(20px)", 
              WebkitBackdropFilter: "blur(20px)", 
              border: "1px solid rgba(255,255,255,0.15)", 
              boxShadow: "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
              animation: "avatarModalScaleIn 180ms ease-out"
            }}
          >
            <div 
              className="flex items-start justify-between gap-3 px-6 py-5"
              style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div>
                <div className="text-lg font-bold text-white/95">Căn chỉnh ảnh đại diện 1:1</div>
                <div className="mt-1 text-sm text-white/70">
                  Kéo ảnh bằng chuột để di chuyển, dùng thanh trượt để phóng to.
                </div>
              </div>
              <button
                type="button"
                onClick={closeCropModal}
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white/70 shadow-sm transition hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div 
                className="flex items-center justify-center rounded-[2rem] p-4"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="relative overflow-hidden rounded-[2rem] select-none"
                  style={{ 
                    width: VIEWPORT_SIZE, 
                    height: VIEWPORT_SIZE, 
                    cursor: 'grab',
                    background: "rgba(255,255,255,0.08)", 
                    border: "1px solid rgba(255,255,255,0.12)"
                  }}
                  onMouseDown={handleMouseDown}
                >
                  <img
                    src={draft.objectUrl}
                    alt="Ảnh cần cắt"
                    className="absolute max-w-none select-none pointer-events-none"
                    draggable={false}
                    style={{
                      width: renderedWidth,
                      height: renderedHeight,
                      left: "50%",
                      top: "50%",
                      transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div 
                  className="rounded-3xl p-4"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/90">
                    <Move className="h-4 w-4" />
                    Căn chỉnh vùng ảnh
                  </div>
                  <div className="space-y-4">
                    <div 
                      className="rounded-2xl px-3 py-2 text-xs"
                      style={{ background: "rgba(56,189,248,0.15)", color: "rgb(125,211,252)" }}
                    >
                      💡 <strong>Kéo thả ảnh</strong> bên trái để di chuyển, dùng thanh trượt để phóng to/thu nhỏ
                    </div>

                    <label className="block">
                      <div className="mb-2 text-xs font-semibold text-white/70">Phóng to/thu nhỏ</div>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={zoom}
                        onChange={(event) => setZoom(Number(event.target.value))}
                        className="w-full"
                      />
                      <div className="mt-1 text-[10px] text-white/50 text-center">{Math.round(zoom * 100)}%</div>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div 
                    className="rounded-3xl p-4 text-xs"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
                  >
                    <div className="font-semibold mb-2 text-white/85">📐 Hướng dẫn:</div>
                    <ul className="space-y-1 pl-4">
                      <li>• <strong>Kéo ảnh:</strong> Click và giữ chuột trên ảnh để di chuyển</li>
                      <li>• <strong>Phóng to:</strong> Kéo thanh trượt để zoom in/out</li>
                      <li>• <strong>Khung vuông:</strong> Chỉ vùng bên trong khung sẽ được lưu</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeCropModal}
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                    className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white/85 shadow-sm transition hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmCrop()}
                    style={{ background: "rgba(168,85,247,0.85)", border: "1px solid rgba(168,85,247,0.3)", boxShadow: "0 4px 20px rgba(168,85,247,0.25)" }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
                  >
                    <Camera className="h-4 w-4" />
                    Dùng ảnh này
                  </button>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
