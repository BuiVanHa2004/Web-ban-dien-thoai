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
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300">
          <QrCode className="h-4 w-4" />
        </div>
        <span className="text-sm font-black text-slate-800 dark:text-slate-100">{title}</span>
      </div>
      <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
        Chọn kênh bạn muốn liên hệ, sau đó quét mã QR để chat trực tiếp với Shop.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          Phản hồi nhanh
        </span>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          Hỗ trợ 24/7
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(["tiktok", "zalo", "facebook"] as const).map((platform) => (
          <button
            key={platform}
            onClick={() => setActiveQr(platform)}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-700 transition hover:bg-purple-100 hover:text-purple-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-purple-500/20 dark:hover:text-purple-300"
          >
            <QrCode className="h-3.5 w-3.5" />
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
