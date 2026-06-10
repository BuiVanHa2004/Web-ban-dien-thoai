"use client";

import React from "react";
import { Camera, LoaderCircle, Move, Upload } from "lucide-react";
import Avatar from "@/components/shared/Avatar";
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
  onChange: (url: string | null) => void;
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
}: AvatarUploadFieldProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<CropDraft | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offsetX, setOffsetX] = React.useState(0);
  const [offsetY, setOffsetY] = React.useState(0);

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
  }, []);

  const uploadFile = React.useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        const url = await fileUploadService.uploadAvatar(file);
        onChange(url);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Không thể tải ảnh đại diện.");
      } finally {
        setUploading(false);
      }
    },
    [onChange]
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

    closeCropModal();
    await uploadFile(croppedFile);
  }, [baseScale, closeCropModal, draft, offsetX, offsetY, uploadFile, zoom]);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <Avatar src={value} name={name} className="h-20 w-20 rounded-3xl" textClassName="text-2xl font-black" />
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
                {uploading ? "Đang tải ảnh..." : "Chọn ảnh"}
              </button>
              {value ? (
                <button
                  type="button"
                  onClick={() => onChange(null)}
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

      {draft ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Đóng hộp thoại cắt ảnh"
            onClick={closeCropModal}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-3xl rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-950">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">Căn chỉnh ảnh đại diện 1:1</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Kéo thanh trượt để chọn vùng hiển thị phù hợp trong khung vuông.
                </div>
              </div>
              <button
                type="button"
                onClick={closeCropModal}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                Đóng
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="flex items-center justify-center rounded-[2rem] bg-slate-100 p-4 dark:bg-white/5">
                <div
                  className="relative overflow-hidden rounded-[2rem] bg-slate-200 ring-1 ring-slate-300 dark:bg-slate-900 dark:ring-white/10"
                  style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
                >
                  <img
                    src={draft.objectUrl}
                    alt="Ảnh cần cắt"
                    className="absolute max-w-none select-none"
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
                <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <Move className="h-4 w-4" />
                    Căn chỉnh vùng ảnh
                  </div>
                  <div className="space-y-4">
                    <label className="block">
                      <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Phóng to</div>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={zoom}
                        onChange={(event) => setZoom(Number(event.target.value))}
                        className="w-full"
                      />
                    </label>

                    <label className="block">
                      <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Dịch ngang</div>
                      <input
                        type="range"
                        min={-maxOffsetX}
                        max={maxOffsetX}
                        step={1}
                        value={offsetX}
                        disabled={maxOffsetX === 0}
                        onChange={(event) => setOffsetX(Number(event.target.value))}
                        className="w-full"
                      />
                    </label>

                    <label className="block">
                      <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Dịch dọc</div>
                      <input
                        type="range"
                        min={-maxOffsetY}
                        max={maxOffsetY}
                        step={1}
                        value={offsetY}
                        disabled={maxOffsetY === 0}
                        onChange={(event) => setOffsetY(Number(event.target.value))}
                        className="w-full"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-50 p-4 text-xs text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                  Ảnh gốc có thể ở bất kỳ tỉ lệ nào, nhưng ảnh đại diện sẽ được lưu và hiển thị theo khung vuông 1:1.
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeCropModal}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmCrop()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Camera className="h-4 w-4" />
                    Dùng ảnh này
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
