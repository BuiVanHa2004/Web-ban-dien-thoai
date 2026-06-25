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
        className="group relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl shadow-black/30 ring-1 ring-white/10 sm:rounded-[3rem]"
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
                className="h-full w-full object-cover transition-transform duration-[8000ms] ease-out group-hover:scale-105"
                draggable={false}
                decoding="async"
                fetchPriority={idx === 0 ? "high" : "low"}
                loading={idx <= 1 ? "eager" : "lazy"}
              />
            );

            return (
              <div
                key={`${slide.bannerId}-${idx}`}
                className={`customer-banner-slide absolute inset-0 overflow-hidden transition-opacity duration-1000 ease-in-out ${
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
                {/* Gradient overlay - modern design với nhiều lớp */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-cyan-900/20" />
                
                {/* Content container */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-4 sm:p-10 lg:p-16">
                  {/* Title with modern styling */}
                  <h2 
                    className={`text-lg font-black tracking-tight sm:text-2xl lg:text-4xl xl:text-5xl text-white transition-all duration-700 leading-tight line-clamp-2 ${
                      isActive 
                        ? "opacity-100 translate-y-0 translate-x-0" 
                        : "opacity-0 -translate-y-8 translate-x-4"
                    }`}
                    style={{ 
                      textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.8)',
                      transitionDelay: isActive ? '300ms' : '0ms',
                      letterSpacing: '-0.02em',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word'
                    }}
                  >
                    {slide.title}
                  </h2>
                  
                  {/* Subtitle with modern styling */}
                  {slide.subtitle && (
                    <p 
                      className={`mt-2 max-w-2xl text-xs font-semibold text-slate-100 sm:mt-4 sm:text-sm lg:text-base transition-all duration-700 leading-relaxed line-clamp-3 ${
                        isActive 
                          ? "opacity-100 translate-y-0 translate-x-0" 
                          : "opacity-0 -translate-y-6 translate-x-8"
                      }`}
                      style={{ 
                        textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 4px 20px rgba(0,0,0,0.7)',
                        transitionDelay: isActive ? '500ms' : '0ms',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word'
                      }}
                    >
                      {slide.subtitle}
                    </p>
                  )}
                  
                  {/* CTA Button with modern styling */}
                  {slide.linkUrl && (
                    <div 
                      className={`pointer-events-auto mt-4 sm:mt-8 transition-all duration-700 ${
                        isActive 
                          ? "opacity-100 translate-y-0 scale-100" 
                          : "opacity-0 translate-y-4 scale-95"
                      }`}
                      style={{ transitionDelay: isActive ? '700ms' : '0ms' }}
                    >
                      <Link
                        href={slide.linkUrl}
                        tabIndex={isActive ? 0 : -1}
                        className="group/btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-2xl shadow-purple-500/30 transition-all hover:from-purple-500 hover:to-purple-600 hover:shadow-purple-500/50 active:scale-95 sm:gap-3 sm:rounded-2xl sm:px-8 sm:py-4 sm:text-sm lg:rounded-3xl lg:px-10 lg:py-5 lg:text-base"
                      >
                        <span>Khám phá ngay</span>
                        <svg className="h-4 w-4 transition-transform group-hover/btn:translate-x-1 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation dots - modern design */}
        {count > 1 && (
          <>
            <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-8">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => goTo(i)}
                  className={`group/dot relative transition-all duration-300 ${
                    activeIndex === i ? "w-12" : "w-3"
                  }`}
                >
                  <div className={`h-1.5 rounded-full backdrop-blur-sm transition-all duration-300 ${
                    activeIndex === i 
                      ? "bg-white shadow-lg shadow-white/50" 
                      : "bg-white/30 group-hover/dot:bg-white/50"
                  }`} />
                </button>
              ))}
            </div>
            
            {/* Navigation arrows - modern design - Hidden on mobile */}
            <button
              type="button"
              aria-label="Slide trước"
              onClick={goPrev}
              className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-2xl bg-black/40 text-white backdrop-blur-md transition-all hover:bg-black/60 hover:scale-110 active:scale-95 md:flex md:h-12 md:w-12 lg:h-14 lg:w-14 lg:rounded-3xl"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7" fill="none" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Slide sau"
              onClick={goNext}
              className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-2xl bg-black/40 text-white backdrop-blur-md transition-all hover:bg-black/60 hover:scale-110 active:scale-95 md:flex md:h-12 md:w-12 lg:h-14 lg:w-14 lg:rounded-3xl"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7" fill="none" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>
    </section>
  );
}
