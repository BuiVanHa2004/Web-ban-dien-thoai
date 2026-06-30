"use client";

import { newsService, type NewsDto } from "@/services/newsService";
import { createPortal } from "react-dom";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowLeft, Calendar, Clock, Share2, Tag, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import React from "react";
import { resolveImageUrl } from "@/common/resolveImageUrl";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function splitSections(text?: string | null) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  return raw
    .split(/\n\s*\n+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function NewId() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { scrollY, scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const opacity = useTransform(scrollY, [0, 500], [1, 0.3]);

  const idRaw = params?.id;
  const newsId = Number(idRaw);

  const [item, setItem] = React.useState<NewsDto | null>(null);
  const [related, setRelated] = React.useState<NewsDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);

  const sections = splitSections(item?.newsDescribe);
  const allImages = (item?.newsImages || []).filter(Boolean).map(img => resolveImageUrl(img) || img);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      if (!idRaw || Number.isNaN(newsId)) {
        setError("Thiếu hoặc sai id tin tức.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [dto, all] = await Promise.all([
          newsService.getById(newsId),
          newsService.getAll(),
        ]);

        if (!mounted) return;

        setItem(dto);

        const sorted = (all || [])
          .filter((x) => x.newsId !== dto.newsId)
          .sort(
            (a, b) =>
              new Date(b.createdAt ?? 0).getTime() -
              new Date(a.createdAt ?? 0).getTime()
          );

        setRelated(sorted.slice(0, 3));
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Không thể tải chi tiết tin tức.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [idRaw, newsId]);

  // Auto-slide logic
  React.useEffect(() => {
    if (allImages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % allImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [allImages.length]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-900">Đang tải nội dung...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="h-20 w-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
            <Share2 className="h-10 w-10 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{error || "Không tìm thấy nội dung"}</h1>
          <p className="text-slate-500">Bài viết bạn đang tìm kiếm không tồn tại hoặc đã bị gỡ bỏ.</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-lg transition-transform hover:scale-105 hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  const readingTime = Math.max(1, Math.ceil((item.newsDescribe || "").length / 600));

  return (
    <div className="min-h-screen">
      {/* Fixed back button via portal */}
      {typeof window !== "undefined" && createPortal(
        <div className="fixed left-3 top-[3.5rem] z-[190] sm:left-4 sm:top-[4.25rem]">
          <Link href="/new" className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 py-1.5 pl-2 pr-4 text-sm font-bold text-slate-600 backdrop-blur-md shadow-sm transition-colors hover:border-indigo-400 hover:text-indigo-600">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 transition-all group-hover:bg-indigo-600 group-hover:text-white">
              <ChevronLeft className="h-3.5 w-3.5" />
            </div>
            Quay lại
          </Link>
        </div>,
        document.body
      )}

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white transition-colors duration-500 sm:rounded-[2.5rem]">
      {/* Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 z-[100] origin-left"
        style={{ scaleX }}
      />

      {/* Floating Action Buttons - desktop only, redundant on mobile */}
      <div className="fixed top-6 left-6 z-[80] hidden lg:block">
        <button
          onClick={() => router.back()}
          className="group flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xl border border-slate-200 transition-all hover:scale-110 active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-slate-800 transition-transform group-hover:-translate-x-1" />
        </button>
      </div>

      {/* Hero Header */}
      <header className="relative w-full aspect-square md:max-h-[800px] overflow-hidden shadow-lg group mx-auto">
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/20 via-black/30 to-black/90" />

        {allImages.length > 0 ? (
          <div className="absolute inset-0">
            {allImages.map((img, idx) => (
              <motion.img
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: activeImageIndex === idx ? 1 : 0 }}
                transition={{ duration: 1.5 }}
                style={{}}
                src={img}
                alt={item.newsTitle}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
            <Share2 className="h-20 w-20 text-slate-800" />
          </div>
        )}

        <div className="relative z-20 h-full flex flex-col justify-end pb-12 px-6 md:px-12 max-w-6xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="flex flex-wrap items-center gap-4">
              <span className="px-4 py-1.5 rounded-full bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/25">
                BÀI VIẾT CHI TIẾT
              </span>
              <div className="flex items-center gap-2 text-white/90 text-xs font-black uppercase tracking-widest bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(item.createdAt)}
              </div>
              <div className="flex items-center gap-2 text-white/90 text-xs font-black uppercase tracking-widest bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <Clock className="h-3.5 w-3.5" />
                {readingTime} phút đọc
              </div>
            </div>

            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-2xl max-w-4xl">
              {item.newsTitle}
            </h1>
          </motion.div>
        </div>
      </header>

      {/* Content Section */}
      <main className="max-w-4xl mx-auto px-4 py-10 md:py-16">
        <div className="max-w-3xl mx-auto">
          {/* Main Article Content */}
          <article className="prose prose-slate max-w-none">
            {sections.length > 0 ? (
              <div className="space-y-8">
                {sections.map((section, idx) => (
                  <motion.p
                    key={idx}
                    initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    viewport={{ margin: "-50px" }}
                    transition={{ duration: 0.8, delay: 0.05 }}
                    className="text-lg md:text-xl leading-relaxed text-slate-700 whitespace-pre-line font-medium"
                  >
                    {section}
                  </motion.p>
                ))}
              </div>
            ) : (
              <p className="text-lg text-slate-900 italic">Nội dung đang được cập nhật...</p>
            )}

            {/* Tags / Meta Footer */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-16 pt-10 border-t border-slate-200 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Tag className="h-4 w-4 shrink-0 text-cyan-600" />
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest shrink-0">Chủ đề:</span>
                {["Công nghệ", "Đời sống", "Tương lai"].map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold transition-colors hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer">
                    {tag}
                  </span>
                ))}
              </div>

              <button className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">
                <Share2 className="h-4 w-4" /> Chia sẻ bài viết
              </button>
            </motion.div>
          </article>
        </div>
      </main>

      {/* Footer Related Section */}
      {related.length > 0 && (
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mx-4 mb-8 bg-slate-50 py-16 md:py-24 rounded-[4rem] border border-slate-200"
        >
          <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-12">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Gợi ý dành cho bạn</h2>
                <p className="text-sm font-medium text-slate-500">Những tin tức mới nhất bạn có thể đã bỏ lỡ</p>
              </div>
              <Link href="/new" className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white border border-slate-200 text-xs font-black text-slate-700 uppercase tracking-widest shadow-sm hover:shadow-md transition-all">
                Xem tất cả <ChevronRight className="h-4 w-4 text-cyan-500" />
              </Link>
            </div>

          <div className="grid gap-8 md:grid-cols-3">
            {related.map((post, idx) => (
              <motion.div
                key={post.newsId}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link href={`/new/${post.newsId}`} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-md">
                  <div className="relative aspect-square overflow-hidden bg-slate-50">
                    {post.newsImages?.[0] ? (
                      <img
                        src={resolveImageUrl(post.newsImages[0]) || post.newsImages[0]}
                        alt={post.newsTitle}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400">News</div>
                    )}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300">
                      <span className="px-5 py-2 rounded-full bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest shadow-md">
                        Đọc ngay
                      </span>
                    </div>
                  </div>
                  <div className="p-6 space-y-3 flex flex-col flex-1">
                    <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">
                      TIN TỨC MỚI
                    </span>
                    <h3 className="text-xl font-black text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                      {post.newsTitle}
                    </h3>
                    <div className="mt-auto pt-4 flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(post.createdAt)}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
        </motion.section>
      )}

      {/* Bottom Navigation */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="py-12 flex flex-col sm:flex-row items-center justify-center gap-6"
      >
        <Link
          href="/new"
          className="group inline-flex items-center gap-3 px-10 py-4 rounded-full bg-white border border-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-50 shadow-sm"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          DANH SÁCH TIN TỨC
        </Link>
        <Link
          href="/home"
          className="group inline-flex items-center gap-3 px-10 py-4 rounded-full bg-indigo-600 text-white font-black text-xs uppercase tracking-widest transition-all hover:scale-105 hover:bg-indigo-700 shadow-md"
        >
          <Home className="h-4 w-4" />
          VỀ TRANG CHỦ
        </Link>
      </motion.div>
      </div>
    </div>
  );
}