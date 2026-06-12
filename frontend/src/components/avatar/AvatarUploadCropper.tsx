'use client';

import React, { useState, useCallback, useRef } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { createPortal } from 'react-dom';
import { fileUploadService } from '@/services/fileUploadService';

interface AvatarUploadCropperProps {
  currentAvatarUrl?: string | null;
  onAvatarChange: (url: string) => void;
  disabled?: boolean;
}

/**
 * Component để upload và crop ảnh avatar với tỉ lệ 1:1
 */
export default function AvatarUploadCropper({
  currentAvatarUrl,
  onAvatarChange,
  disabled = false,
}: AvatarUploadCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Xử lý khi chọn file
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Kiểm tra định dạng file
      if (!file.type.startsWith('image/')) {
        setError('Vui lòng chọn file ảnh');
        return;
      }

      // Kiểm tra kích thước file (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Kích thước file không được vượt quá 5MB');
        return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
        setError(null);
      });
      reader.readAsDataURL(file);
    }
  }, []);

  // Callback khi crop hoàn tất
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Hàm crop ảnh
  const createCroppedImage = useCallback(
    async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
      const image = await createImage(imageSrc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas size to cropped size
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      // Draw cropped image
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      // Convert canvas to blob
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        }, 'image/jpeg', 0.9);
      });
    },
    []
  );

  // Xử lý upload ảnh đã crop
  const handleUpload = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsUploading(true);
    setError(null);

    try {
      // Crop ảnh
      const croppedBlob = await createCroppedImage(imageSrc, croppedAreaPixels);
      
      // Chuyển blob thành File
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });

      // Upload lên server
      const url = await fileUploadService.uploadAvatar(file);

      // Callback với URL mới
      onAvatarChange(url);

      // Reset state
      setImageSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi upload ảnh');
    } finally {
      setIsUploading(false);
    }
  }, [imageSrc, croppedAreaPixels, createCroppedImage, onAvatarChange]);

  // Hủy crop
  const handleCancel = useCallback(() => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Hiển thị avatar hiện tại */}
      {!imageSrc && (
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {currentAvatarUrl ? (
              <img
                src={currentAvatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                className="w-12 h-12 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          <div>
            <label
              htmlFor="avatar-upload"
              className={`inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {currentAvatarUrl ? 'Thay đổi ảnh đại diện' : 'Chọn ảnh đại diện'}
            </label>
            <input
              ref={fileInputRef}
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={onFileChange}
              disabled={disabled}
              className="hidden"
            />
            <p className="text-sm text-gray-500 mt-2">
              Ảnh sẽ được crop thành hình vuông 1:1
            </p>
          </div>
        </div>
      )}

      {/* Cropper - render qua Portal ra document.body */}
      {imageSrc && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
              <span className="text-base font-bold text-gray-800 dark:text-white">↔ Căn chỉnh vùng ảnh</span>
            </div>

            {/* Cropper */}
            <div className="relative w-full bg-gray-100" style={{ height: 280 }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="round"
                showGrid={false}
              />
            </div>

            {/* Hint */}
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 font-medium">
              💡 <strong>Kéo thả ảnh</strong> để di chuyển, dùng thanh trượt để phóng to/thu nhỏ
            </div>

            {/* Zoom slider */}
            <div className="px-4 py-3 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Phóng to/thu nhỏ</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Buttons */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-zinc-700 flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isUploading}
                className="flex-1 py-2.5 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-white rounded-xl font-medium hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isUploading ? 'Đang upload...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

// Helper function để load image
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });
}
