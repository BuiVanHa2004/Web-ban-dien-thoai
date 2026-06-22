"use client";

import React from "react";

export type LogoVariant = "default" | "header" | "footer";

type LogoProps = {
  className?: string;
  variant?: LogoVariant;
  /** Hiển thị chữ MyPhone Store bên cạnh icon */
  showText?: boolean;
};

const VARIANT_CONFIG: Record<
  LogoVariant,
  {
    root: string;
    frame: string;
    title: string;
    tagline: string;
    defaultShowText: boolean;
    glow: boolean;
  }
> = {
  default: {
    root: "gap-3",
    frame: "h-11 w-11",
    title: "text-base sm:text-lg",
    tagline: "hidden sm:block",
    defaultShowText: true,
    glow: true,
  },
  header: {
    root: "gap-2 sm:gap-2.5",
    frame: "h-9 w-9 sm:h-10 sm:w-10",
    title: "text-sm sm:text-base",
    tagline: "hidden",
    defaultShowText: true,
    glow: false,
  },
  footer: {
    root: "gap-3",
    frame: "h-10 w-10",
    title: "text-base",
    tagline: "block",
    defaultShowText: true,
    glow: false,
  },
};

const FRAME_CLASS =
  "relative shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-zinc-400/55 dark:ring-zinc-500/50";

export function Logo({ className = "", variant = "default", showText }: LogoProps) {
  const cfg = VARIANT_CONFIG[variant];
  const textVisible = showText ?? cfg.defaultShowText;

  return (
    <div className={`group flex min-w-0 items-center ${cfg.root} ${className}`}>
      <div className={`${FRAME_CLASS} ${cfg.frame}`}>
        {cfg.glow && (
          <div
            className="pointer-events-none absolute -inset-0.5 rounded-full bg-gradient-to-tr from-cyan-400/35 to-fuchsia-400/35 opacity-70 blur-[5px] transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        )}
        <img
          src="/Logo/LogoWeb.png"
          alt="MyPhone Logo"
          className="relative z-[1] h-full w-full scale-[1.12] object-cover object-center"
          draggable={false}
        />
      </div>

      {textVisible && (
        <div
          className={`min-w-0 leading-tight ${variant === "header" ? "hidden sm:block" : ""}`}
        >
          <div
            className={`truncate font-black tracking-tight text-zinc-900 dark:text-zinc-50 ${cfg.title}`}
          >
            MyPhone <span className="text-cyan-500 dark:text-cyan-400">Store</span>
          </div>
          <div
            className={`truncate text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 ${cfg.tagline}`}
          >
            Điện thoại chính hãng - Giá tốt nhất
          </div>
        </div>
      )}
    </div>
  );
}
