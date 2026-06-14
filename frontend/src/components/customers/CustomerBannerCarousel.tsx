"use client";

import Link from "next/link";
import React from "react";

export type BannerSlide = {
  imageUrl: string;
  title: string;
  subtitle?: string | null;
  linkUrl?: string | null;
  bannerId: number;
};

type CustomerBannerCarouselProps = {
  slides: BannerSlide[];
  resolveImageUrl: (url: string) => string | undefined;
  autoPlayMs?: number;
};

export default function CustomerBannerCarousel({
  slides,
  resolveImageUrl,
  autoPlayMs = 3000,
}: CustomerBannerCarouselProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const count = slides.length;

  const goTo = React.useCallback(
    (index: number) => {
      if (count <= 0) return;
      setActiveIndex(((index % count) + count) % count);
    },
    [count]
  );

  const goNext = React.useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = React.useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  React.useEffect(() => {
    if (count <= 1 || paused) return;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % count);
    }, autoPlayMs);
    return () => window.clearInterval(id);
  }, [count, paused, autoPlayMs]);

  React.useEffect(() => {
    if (count === 0) return;
    const preload = (idx: number) => {
      const url = resolveImageUrl(slides[idx]?.imageUrl);
      if (!url) return;
      const img = new window.Image();
      img.decoding = "async";
      img.src = url;
    };
    preload(activeIndex);
    preload((activeIndex + 1) % count);
    preload((activeIndex - 1 + count) % count);
  }, [activeIndex, count, slides, resolveImageUrl]);

  if (count === 0) return null;

  return (
    <section className="px-0 sm:px-2">
      <div
        className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl bg-zinc-900 shadow-none ring-0 sm:rounded-[2.5rem]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="relative aspect-video w-full [contain:layout_paint]">
          {slides.map((slide, idx) => {
            const isActive = idx === activeIndex;
            const src = resolveImageUrl(slide.imageUrl);
            if (!src) return null;

            const imageEl = (
              <img
                src={src}
                alt={slide.title}
                className="h-full w-full object-cover"
                draggable={false}
                decoding="async"
                fetchPriority={idx === 0 ? "high" : "low"}
                loading={idx <= 1 ? "eager" : "lazy"}
              />
            );

            return (
              <div
                key={`${slide.bannerId}-${idx}`}
                className={`customer-banner-slide absolute inset-0 overflow-hidden ${
                  isActive ? "z-10 opacity-100" : "z-0 opacity-0"
                }`}
                aria-hidden={!isActive}
              >
                {slide.linkUrl ? (
                  <Link href={slide.linkUrl} className="block h-full w-full" tabIndex={isActive ? 0 : -1}>
                    {imageEl}
                  </Link>
                ) : (
                  imageEl
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-4 text-white sm:p-8 lg:p-12">
                  <h2 className="text-lg font-bold tracking-tight sm:text-3xl lg:text-5xl" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 4px 20px rgba(0,0,0,0.5)' }}>
                    {slide.title}
                  </h2>
                  {slide.subtitle && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-100 sm:mt-2 sm:text-base lg:text-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 3px 15px rgba(0,0,0,0.6)' }}>
                      {slide.subtitle}
                    </p>
                  )}
                  {slide.linkUrl && (
                    <div className="pointer-events-auto mt-3 sm:mt-6">
                      <Link
                        href={slide.linkUrl}
                        tabIndex={isActive ? 0 : -1}
                        className="keep-light inline-flex items-center justify-center rounded-xl bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-white active:translate-y-0 sm:rounded-2xl sm:px-6 sm:py-2.5 sm:text-sm"
                      >
                        Khám phá ngay
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {count > 1 && (
          <>
            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 sm:bottom-6 sm:gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => goTo(i)}
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out ${
                    activeIndex === i ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Slide trước"
              onClick={goPrev}
              className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 active:scale-95 sm:left-4 sm:h-12 sm:w-12 sm:rounded-2xl"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Slide sau"
              onClick={goNext}
              className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 active:scale-95 sm:right-4 sm:h-12 sm:w-12 sm:rounded-2xl"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}
      </div>
    </section>
  );
}
