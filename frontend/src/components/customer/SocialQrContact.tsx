"use client";

import React from "react";
import { QrCode, X } from "lucide-react";
import { createPortal } from "react-dom";

type Platform = "tiktok" | "zalo" | "facebook";

const QR_IMAGES: Record<Platform, { label: string; src: string }> = {
  tiktok: { label: "TikTok", src: "/QRCode/QRTiktok.PNG" },
  zalo: { label: "Zalo", src: "/QRCode/QRZalo.png" },
  facebook: { label: "Facebook", src: "/QRCode/QRCodeFacebook.png" },
};

// Màu chính thức của từng nền tảng
const PLATFORM_STYLES: Record<Platform, string> = {
  tiktok:
    "bg-black text-white hover:bg-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-700",
  zalo:
    "bg-[#0068FF] text-white hover:bg-[#005ae0] dark:bg-[#0068FF] dark:hover:bg-[#005ae0]",
  facebook:
    "bg-[#1877F2] text-white hover:bg-[#1464d0] dark:bg-[#1877F2] dark:hover:bg-[#1464d0]",
};

export default function SocialQrContact({
  title = "Liên hệ mạng xã hội",
  className = "",
}: {
  title?: string;
  className?: string;
}) {
  const [activeQr, setActiveQr] = React.useState<Platform | null>(null);
  const [portalReady, setPortalReady] = React.useState(false);

  React.useEffect(() => {
    setPortalReady(true);
  }, []);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300">
          <QrCode className="h-5 w-5" />
        </div>
        <span className="truncate text-base font-black text-slate-800 dark:text-slate-100">{title}</span>
      </div>
      <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
        Chọn kênh bạn muốn liên hệ, sau đó quét mã QR để chat trực tiếp với Shop.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          Phản hồi nhanh
        </span>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          Hỗ trợ 24/7
        </span>
      </div>
      <div className="mt-4 flex flex-row flex-wrap gap-2">
        {(["tiktok", "zalo", "facebook"] as const).map((platform) => (
          <button
            key={platform}
            onClick={() => setActiveQr(platform)}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black transition ${PLATFORM_STYLES[platform]}`}
          >
            <QrCode className="h-3.5 w-3.5 shrink-0" />
            {QR_IMAGES[platform].label}
          </button>
        ))}
      </div>

      {portalReady && activeQr
        ? createPortal(
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
            onClick={() => setActiveQr(null)}
          >
            <div
              className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveQr(null)}
                className="absolute right-3 top-3 rounded-full border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="Đóng cửa sổ QR"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-center">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Quét QR liên hệ {QR_IMAGES[activeQr].label}
                </h3>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Dùng camera hoặc ứng dụng để quét mã QR.
                </p>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800">
                <img
                  src={QR_IMAGES[activeQr].src}
                  alt={`QR ${QR_IMAGES[activeQr].label}`}
                  className="h-full w-full rounded-xl object-contain"
                />
              </div>
            </div>
          </div>,
          document.body
        )
        : null}
    </div>
  );
}
