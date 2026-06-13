"use client";

import { useRouter } from "next/navigation";
import React from "react";

import { evaluateService, type ProductEvaluateStatDto } from "@/services/evaluateService";
import { resolveImageUrl } from "@/common/resolveImageUrl";

type Row = {
  productId: string;
  productName: string;
  reviewCount: number;
  averageStars: number;
  productImageUrl?: string | null;
};

function mapDtoToRow(dto: ProductEvaluateStatDto): Row {
  const reviewCount = Number(dto.reviewCount) || 0;
  const totalStars = Number(dto.totalStars) || 0;
  return {
    productId: String(dto.productId),
    productName: dto.productName,
    reviewCount,
    averageStars: reviewCount > 0 ? totalStars / reviewCount : 0,
    productImageUrl: dto.productImageUrl,
  };
}

export default function EvaluatePage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await evaluateService.getProductStats();
      setRows((data || []).filter(Boolean).map(mapDtoToRow));
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu đánh giá.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return r.productId.toLowerCase().includes(q) || r.productName.toLowerCase().includes(q);
    });
  }, [rows, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Đánh giá
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Quản lý đánh giá</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            Thống kê số lượt đánh giá/bình luận theo sản phẩm và xem chi tiết.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={refresh}
            disabled={loading}
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/70 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10"
          >
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200/70 transition-all duration-500 ease-out dark:bg-white/5 dark:ring-white/10 ${loading ? "animate-spin" : ""}`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </span>
            Làm mới
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-slate-950/45 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60 text-slate-800 ring-1 ring-slate-200/70 backdrop-blur-xl dark:bg-white/5 dark:text-slate-100 dark:ring-white/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 17.3l-3.7 2.2 1-4.2-3.3-2.9 4.3-.4L12 8l1.7 4 4.3.4-3.3 2.9 1 4.2z" />
              <path d="M4 4h16v16H4z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Thống kê theo sản phẩm</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">Tổng: {rows.length} sản phẩm</div>
          </div>
        </div>

        <div className="w-full md:max-w-md">
          <div className="productSearchSparkle relative overflow-hidden rounded-2xl p-px shadow-[0_16px_60px_-40px_rgba(34,211,238,0.55)] transition-all duration-700 ease-out focus-within:shadow-[0_18px_70px_-40px_rgba(168,85,247,0.55)]">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-950 drop-shadow-sm dark:text-slate-100">
                <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 21l-4.3-4.3" />
                  <path d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                </svg>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm theo ID / tên sản phẩm..."
                className="h-11 w-full rounded-2xl bg-white/60 pl-11 pr-3 text-sm text-slate-900 ring-1 ring-white/10 outline-none backdrop-blur-xl transition-all duration-700 ease-out focus:bg-white/75 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:bg-white/10 dark:focus:ring-cyan-400/25"
              />
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out hover:shadow-md dark:border-white/10 dark:bg-slate-950/45 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/55 text-xs uppercase tracking-wide text-slate-700 backdrop-blur-xl dark:bg-slate-950/35 dark:text-slate-200">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="px-5 py-3 text-center">ID sản phẩm</th>
                <th className="px-5 py-3 text-center">Ảnh</th>
                <th className="px-5 py-3 text-center">Tên sản phẩm</th>
                <th className="px-5 py-3 text-center">Số lượt đánh giá</th>
                <th className="px-5 py-3 text-center">Sao trung bình</th>
                <th className="px-5 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-400 dark:text-slate-300" colSpan={6}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-400 dark:text-slate-300" colSpan={6}>
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.productId} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">{r.productId}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex justify-center">
                        {r.productImageUrl ? (
                          <div className="group relative inline-block overflow-hidden rounded-full">
                            <img
                              src={resolveImageUrl(r.productImageUrl) || ""}
                              alt={r.productName}
                              className="h-16 w-16 cursor-pointer rounded-full object-cover ring-1 ring-slate-200 transition-transform duration-300 ease-out group-hover:scale-125 dark:ring-white/10"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-white/10">
                            <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 mx-auto">{r.productName}</div>
                    </td>
                    <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">{r.reviewCount}</td>
                    <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-200">{(Number(r.averageStars) || 0).toFixed(1)}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => router.push(`/evaluates/${encodeURIComponent(r.productId)}`)}
                          aria-label="Xem chi tiết"
                          className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white p-2 text-slate-600 ring-1 ring-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-indigo-600 hover:shadow-md active:translate-y-0 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-indigo-400"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}