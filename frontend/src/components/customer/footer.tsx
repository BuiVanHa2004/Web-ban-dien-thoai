"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ShieldCheck,
  Truck
} from "lucide-react";
import { Logo } from "./Logo";
import SocialQrContact from "./SocialQrContact";

/** 
 * Trên Safari iOS, iframe Google Maps ăn mất touch events của các element đè lên nó
 * (như AI widget, Compare widget). Fix: block pointer-events trên iframe mặc định,
 * chỉ bật sau khi user tap vào map. Overlay transparent bắt touch đầu tiên.
 */
function MapEmbed({ address }: { address: string }) {
  const [active, setActive] = React.useState(false);
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&hl=vi&z=14&output=embed`;

  return (
    <div className="relative h-48 w-full overflow-hidden rounded-[1.5rem] border border-slate-100 bg-slate-50 shadow-sm dark:border-white/5 dark:bg-slate-900">
      <iframe
        title="Bản đồ"
        src={src}
        className="h-full w-full border-0"
        style={{ pointerEvents: active ? "auto" : "none" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {/* Overlay: bắt tap đầu tiên để kích hoạt map, sau đó tự ẩn */}
      {!active && (
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={() => setActive(true)}
          onTouchStart={() => setActive(true)}
          aria-label="Nhấn để tương tác với bản đồ"
        />
      )}
    </div>
  );
}

export default function CustomerFooter() {
  const address = "Số 10, Phượng Trì, Đan Phượng, Hà Nội";
  const phone = "0978 603 382";
  const email = "buivanha22032004@gmail.com";
  const year = new Date().getFullYear();

  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&hl=vi&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  const mapOpenHref = `https://www.google.com/maps?q=${encodeURIComponent(address)}`;

  return (
    <footer className="relative mt-8 overflow-hidden border-t border-slate-200 bg-white/90 pt-8 pb-6 backdrop-blur-sm sm:mt-12 sm:pt-10 sm:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand Identity */}
          <div className="flex flex-col space-y-4 lg:col-span-4">
            <h4 className="text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Về chúng tôi</h4>
            <Link
              href="/home"
              className="inline-flex w-fit max-w-full transition-transform hover:scale-[1.02]"
              aria-label="MyPhone Store - Trang chủ"
            >
              <Logo variant="footer" />
            </Link>
            <p className="max-w-sm text-sm font-medium leading-relaxed text-slate-600">
              MyPhone Store cam kết mang đến sản phẩm chính hãng, bảo hành uy tín và dịch vụ khách hàng tận tâm nhất.
            </p>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                <ShieldCheck className="h-3 w-3" />
                <span className="text-[9px] font-black uppercase">Chính hãng</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                <Truck className="h-3 w-3" />
                <span className="text-[9px] font-black uppercase">Giao nhanh</span>
              </div>
            </div>
          </div>

          {/* Map Section - Middle */}
          <div className="flex flex-col space-y-4 lg:col-span-4">
            <h4 className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Vị trí cửa hàng</h4>
            <MapEmbed address={address} />
            <a
              href={mapOpenHref}
              target="_blank"
              rel="noreferrer"
              className="text-center text-[10px] font-bold text-purple-600 hover:underline underline-offset-4"
            >
              Xem bản đồ chi tiết trên Google Maps
            </a>
          </div>

          {/* Contact Section */}
          <div className="flex flex-col space-y-4 lg:col-span-4 lg:items-start lg:pl-[50px]">
            <h4 className="w-full text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Thông tin liên hệ</h4>
            <div className="space-y-4 lg:text-left">
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Địa chỉ</span>
                <p className="text-xs font-bold text-slate-700">
                  {address}
                </p>
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hotline</span>
                <a href={`tel:${phone}`} className="text-sm font-black text-slate-800 hover:text-purple-600">
                  {phone}
                </a>
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</span>
                <a href={`mailto:${email}`} className="text-xs font-black text-slate-800 hover:text-purple-600">
                  {email}
                </a>
              </div>
              <SocialQrContact />
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 sm:flex-row">
          <p className="text-[10px] font-bold text-slate-400">
            © {year} MyPhone Store. All rights reserved.
          </p>
          <div className="flex gap-6 text-[9px] font-black uppercase tracking-widest text-slate-500">
            <Link href="#" className="hover:text-purple-600 transition">Chính sách</Link>
            <Link href="#" className="hover:text-purple-600 transition">Bảo mật</Link>
          </div>
        </div>
      </div>

    </footer>
  );
}
