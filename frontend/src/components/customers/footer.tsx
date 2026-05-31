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

export default function CustomerFooter() {
  const address = "Số 10, Phượng Trì, Đan Phượng, Hà Nội";
  const phone = "0978 603 382";
  const email = "buivanha22032004@gmail.com";
  const year = new Date().getFullYear();

  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&hl=vi&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  const mapOpenHref = `https://www.google.com/maps?q=${encodeURIComponent(address)}`;

  return (
    <footer className="relative mt-8 overflow-hidden border-t border-zinc-600/25 bg-[#252528]/88 pt-8 pb-6 backdrop-blur-sm sm:mt-12 sm:pt-10 sm:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand Identity */}
          <div className="flex flex-col space-y-4 lg:col-span-4">
            <h4 className="text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white">Về chúng tôi</h4>
            <Link
              href="/home"
              className="inline-flex w-fit max-w-full transition-transform hover:scale-[1.02]"
              aria-label="MyPhone Store - Trang chủ"
            >
              <Logo variant="footer" />
            </Link>
            <p className="max-w-sm text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              MyPhone Store cam kết mang đến sản phẩm chính hãng, bảo hành uy tín và dịch vụ khách hàng tận tâm nhất.
            </p>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                <span className="text-[9px] font-black uppercase">Chính hãng</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                <Truck className="h-3 w-3" />
                <span className="text-[9px] font-black uppercase">Giao nhanh</span>
              </div>
            </div>
          </div>

          {/* Map Section - Middle */}
          <div className="flex flex-col space-y-4 lg:col-span-4">
            <h4 className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white">Vị trí cửa hàng</h4>
            <div className="relative h-48 w-full overflow-hidden rounded-[1.5rem] border border-slate-100 bg-slate-50 shadow-sm dark:border-white/5 dark:bg-slate-900">
              <iframe
                title="Bản đồ"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&hl=vi&z=14&output=embed`}
                className="h-full w-full border-0"
                style={{ pointerEvents: 'auto', userSelect: 'auto' }}
                allowFullScreen
                loading="lazy"
                tabIndex={0}
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
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
            <h4 className="w-full text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white">Thông tin liên hệ</h4>
            <div className="space-y-4 lg:text-left">
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Địa chỉ</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {address}
                </p>
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hotline</span>
                <a href={`tel:${phone}`} className="text-sm font-black text-slate-900 hover:text-purple-600 dark:text-white">
                  {phone}
                </a>
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</span>
                <a href={`mailto:${email}`} className="text-xs font-black text-slate-900 hover:text-purple-600 dark:text-white">
                  {email}
                </a>
              </div>
              <SocialQrContact />
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-50 pt-8 dark:border-white/5 sm:flex-row">
          <p className="text-[10px] font-bold text-slate-400">
            © {year} MyPhone Store. All rights reserved.
          </p>
          <div className="flex gap-6 text-[9px] font-black uppercase tracking-widest text-slate-400">
            <Link href="#" className="hover:text-purple-600 transition">Chính sách</Link>
            <Link href="#" className="hover:text-purple-600 transition">Bảo mật</Link>
          </div>
        </div>
      </div>

    </footer>
  );
}
