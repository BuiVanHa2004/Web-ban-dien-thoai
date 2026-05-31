
"use client";

import { newsService, type NewsDto } from "@/services/newsService";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronRight, Search, Zap, ArrowRight, Home } from "lucide-react";
import Link from "next/link";
import React from "react";

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

function getCover(n: NewsDto) {
  return n.newsImages?.[0] || "";
}

const SkeletonCard = () => (
  <div className="group relative overflow-hidden rounded-[2.5rem] customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/50 p-4 shadow-sm animate-pulse">
    <div className="aspect-[16/10] w-full rounded-[1.8rem] bg-slate-200 dark:bg-slate-800" />
    <div className="mt-4 space-y-3">
      <div className="h-4 w-1/4 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-6 w-full rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  </div>
);

export default function NewPage() {
  const [items, setItems] = React.useState<NewsDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await newsService.getAll();
        if (!mounted) return;
        setItems(data || []);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Không thể tải tin tức.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const sorted = React.useMemo(() => {
    return [...items].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  }, [items]);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return sorted;
    return sorted.filter((n) => {
      const title = (n.newsTitle ?? "").toLowerCase();
      const desc = (n.newsDescribe ?? "").toLowerCase();
      const id = String(n.newsId ?? "");
      return title.includes(query) || desc.includes(query) || id.includes(query);
    });
  }, [q, sorted]);

  const featured = filtered[0] ?? null;
  const rest = featured ? filtered.slice(1) : filtered;

  return (
    <div className="min-h-screen overflow-hidden rounded-2xl customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/40 shadow-xl shadow-black/20 transition-colors duration-500 sm:rounded-[2.5rem]">
      {/* Header / Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-cyan-500/10 blur-[80px] rounded-full animate-pulse-slow" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-fuchsia-500/10 blur-[80px] rounded-full animate-pulse-slow delay-1000" />
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1 text-xs font-bold text-cyan-600 dark:text-cyan-400 backdrop-blur-md"
            >
              <Zap className="h-3 w-3" />
              <span>CẬP NHẬT MỖI NGÀY</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-5xl font-black tracking-tight text-zinc-50"
            >
              Tin Tức <span className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 bg-clip-text text-transparent">Công Nghệ</span>
            </motion.h1>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full max-w-lg relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/15 to-fuchsia-500/15 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
              <div className="relative flex items-center rounded-full border border-zinc-600/40 bg-zinc-800/70 shadow-lg shadow-black/15 overflow-hidden transition-all duration-500 focus-within:ring-2 focus-within:ring-zinc-500/25 focus-within:border-zinc-500/50">
                <Search className="ml-5 h-5 w-5 text-zinc-400" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm kiếm bài viết..."
                  className="w-full h-12 border-none bg-transparent px-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl pb-12 sm:pb-16">
        {error && (
          <div className="mb-6 rounded-full border border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Không tìm thấy kết quả</h3>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Featured Post */}
            {featured && (
              <motion.section 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ margin: "-100px" }}
                transition={{ duration: 0.8 }}
              >
                <Link href={`/new/${featured.newsId}`}>
                  <div className="group relative grid gap-0 overflow-hidden rounded-[2.5rem] customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/55 shadow-xl transition-all duration-500 hover:shadow-black/30 lg:grid-cols-2 lg:rounded-[3.5rem]">
                    <div className="relative aspect-[16/10] lg:h-full lg:aspect-auto overflow-hidden">
                      {getCover(featured) ? (
                        <img
                          src={getCover(featured)}
                          alt={featured.newsTitle}
                          className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        />
                      ) : (
                          <div className="grid h-full place-items-center bg-slate-100 dark:bg-slate-800 text-slate-900">
                            News Image
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 lg:hidden" />
                      </div>

                    <div className="flex flex-col justify-center p-8 lg:p-10 space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-black uppercase tracking-wider">
                          Nổi bật
                        </span>
                        <div className="flex items-center text-slate-900 text-[11px] font-bold">
                          <Calendar className="mr-1.5 h-3.5 w-3.5" />
                          {formatDate(featured.createdAt)}
                        </div>
                      </div>

                      <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors duration-300 leading-tight">
                        {featured.newsTitle}
                      </h2>

                      <p className="text-slate-900 dark:text-slate-900 line-clamp-2 text-base leading-relaxed">
                        {featured.newsDescribe || "Khám phá chi tiết bài viết để cập nhật những thông tin mới nhất."}
                      </p>

                      <div className="pt-2">
                        <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black group/btn transition-transform hover:scale-105 active:scale-95">
                          Đọc ngay
                          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.section>
            )}

            {/* Posts Grid */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Gần đây</h2>
                <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-900 dark:text-slate-900">
                  {rest.length} BÀI VIẾT
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {rest.map((n, idx) => (
                    <motion.div
                      key={n.newsId}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ margin: "-50px" }}
                      transition={{ duration: 0.6, delay: (idx % 3) * 0.1 }}
                    >
                      <Link
                        href={`/new/${n.newsId}`}
                        className="group mx-auto block w-full overflow-hidden rounded-3xl customer-card-surface border border-zinc-500/70 ring-1 ring-zinc-500/35 bg-zinc-800/60 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/25"
                      >
                        <div className="relative aspect-square overflow-hidden">
                          {getCover(n) ? (
                            <img
                              src={getCover(n)}
                              alt={n.newsTitle}
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <div className="grid h-full place-items-center bg-slate-100 dark:bg-slate-800 text-slate-900">News</div>
                          )}
                          <div className="absolute inset-0 bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-95">
                            <span className="inline-flex items-center justify-center rounded-3xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/15">
                              Xem ngay
                            </span>
                          </div>
                        </div>

                        <div className="p-4">
                          <h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                            {n.newsTitle}
                          </h3>
                          <p className="mt-2 line-clamp-3 text-xs text-slate-900 dark:text-slate-300">
                            {n.newsDescribe || "Đọc thêm để cập nhật thông tin công nghệ mới nhất..."}
                          </p>
                          <div className="mt-3 text-[11px] text-slate-900 dark:text-slate-900">
                            {formatDate(n.createdAt)}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>

            <div className="flex justify-center pt-4">
              <Link
                href="/home"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-200 dark:shadow-none"
              >
                <Home className="h-4 w-4" />
                VỀ TRANG CHỦ
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

