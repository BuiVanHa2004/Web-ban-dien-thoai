"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import React from "react";

import { evaluateService, type ProductEvaluateCommentDto, type ProductEvaluateDetailDto } from "@/services/evaluateService";

type StarFilter = 0 | 1 | 2 | 3 | 4 | 5;

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

function resolveImageUrl(input?: string | null | unknown): string | undefined {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return undefined;
  if (/^(https?:)?\/\//i.test(raw)) return raw;
  if (/^(data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_URL}${raw}`;
  return `${API_URL}/${raw}`;
}

function parseProductIdFromPathname(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const maybeId = parts[parts.length - 1] || "";
  return maybeId;
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour12: false });
}

function starBadgeClass(star: number) {
  if (star >= 5) return "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-200 dark:ring-emerald-400/20";
  if (star === 4) return "bg-cyan-500/15 text-cyan-800 ring-1 ring-cyan-500/25 dark:text-cyan-200 dark:ring-cyan-400/20";
  if (star === 3) return "bg-violet-500/15 text-violet-800 ring-1 ring-violet-500/25 dark:text-violet-200 dark:ring-violet-400/20";
  if (star === 2) return "bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-200 dark:ring-amber-400/20";
  return "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/25 dark:text-rose-200 dark:ring-rose-400/20";
}

function Stars({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < v;
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className={"h-4 w-4 " + (filled ? "text-amber-400" : "text-slate-300 dark:text-slate-600")}
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 17.3l-3.7 2.2 1-4.2-3.3-2.9 4.3-.4L12 8l1.7 4 4.3.4-3.3 2.9 1 4.2z" />
          </svg>
        );
      })}
    </div>
  );
}

export default function EvaluteId() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const productIdStr = React.useMemo(() => parseProductIdFromPathname(pathname), [pathname]);
  const productId = Number(productIdStr);
  const targetEvaluateId = searchParams ? searchParams.get("evaluateId") : null;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<ProductEvaluateDetailDto[]>([]);
  const [imagesByEvaluateId, setImagesByEvaluateId] = React.useState<Record<number, string[]>>({});
  const [selectedEvaluate, setSelectedEvaluate] = React.useState<ProductEvaluateDetailDto | null>(null);

  const [filter, setFilter] = React.useState<StarFilter>(0);
  const [replyingId, setReplyingId] = React.useState<number | null>(null);
  const [replyText, setReplyText] = React.useState("");
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!selectedEvaluate) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedEvaluate(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedEvaluate]);

  React.useEffect(() => {
    if (!Number.isFinite(productId) || Number.isNaN(productId)) {
      setError("ID sản phẩm không hợp lệ.");
      setLoading(false);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [data, withImages] = await Promise.all([
        evaluateService.getByProductId(productId),
        evaluateService.getByProductIdWithImages(productId).catch(() => [] as ProductEvaluateCommentDto[]),
      ]);
      setItems(data);
      const map: Record<number, string[]> = {};
      for (const it of withImages) {
        const id = Number(it.evaluateId);
        if (!Number.isFinite(id) || Number.isNaN(id)) continue;
        const urls = (it.images || [])
          .map((img) => resolveImageUrl(img?.imageUrl))
          .filter(Boolean) as string[];
        if (urls.length > 0) map[id] = urls;
      }
      setImagesByEvaluateId(map);

      if (targetEvaluateId) {
        const targetIdNum = Number(targetEvaluateId);
        const found = data.find((x) => x.id === targetIdNum);
        if (found) {
          setSelectedEvaluate(found);
          setTimeout(() => {
            const row = document.getElementById(`evaluate-row-${targetIdNum}`);
            if (row) {
              row.scrollIntoView({ behavior: "smooth", block: "center" });
              row.classList.add("bg-cyan-50", "dark:bg-cyan-900/20");
              setTimeout(() => {
                row.classList.remove("bg-cyan-50", "dark:bg-cyan-900/20");
              }, 3000);
            }
          }, 300);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu đánh giá.");
    } finally {
      setLoading(false);
    }
  }

  const countsByStar = React.useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const it of items) {
      const s = Number(it.rating) || 0;
      if (s >= 1 && s <= 5) counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [items]);

  const filteredItems = React.useMemo(() => {
    if (filter === 0) return items;
    return items.filter((it) => Number(it.rating) === filter);
  }, [items, filter]);

  async function onDelete(evaluateId: number) {
    setDeletingId(evaluateId);
    try {
      await evaluateService.deleteComment(evaluateId);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể xóa bình luận.");
    } finally {
      setDeletingId(null);
    }
  }

  async function onDeleteReply(evaluateId: number) {
    try {
      await evaluateService.deleteReply(evaluateId);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể xóa phản hồi.");
    }
  }

  function openReply(it: ProductEvaluateDetailDto) {
    setReplyingId(it.id);
    setReplyText(it.adminReply || "");
  }

  function openDetail(it: ProductEvaluateDetailDto) {
    setSelectedEvaluate(it);
  }

  async function submitReply() {
    if (replyingId == null) return;
    const text = replyText.trim();
    if (!text) return;
    try {
      await evaluateService.reply(replyingId, { reply: text });
      setReplyingId(null);
      setReplyText("");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Không thể phản hồi.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Chi tiết đánh giá
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Chi tiết đánh giá</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            Xem tất cả đánh giá/bình luận của sản phẩm.
          </p>
        </div>
      </div>
      <div className="fixed top-[120px] right-[46px] z-50 flex items-center gap-3">
        <button
          type="button"
          onClick={refresh}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          Làm mới
        </button>
        <Link
          href="/evaluates"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Quay lại
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {([0, 5, 4, 3, 2, 1] as StarFilter[]).map((s) => {
            const active = filter === s;
            const label = s === 0 ? "Tất cả" : `${s} sao`;
            const count = s === 0 ? items.length : countsByStar[s] || 0;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={
                  "inline-flex cursor-pointer h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold ring-1 transition " +
                  (active
                    ? "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/20"
                    : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10")
                }
              >
                <span className={s === 0 ? "" : "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold " + starBadgeClass(s)}>
                  {label}
                </span>
                <span className="text-xs opacity-80">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="px-5 py-3">Khách hàng</th>
                <th className="px-5 py-3">Sản phẩm đã mua</th>
                <th className="px-5 py-3">Số sao</th>
                <th className="px-5 py-3">Bình luận</th>
                <th className="px-5 py-3">Ngày tạo</th>
                <th className="px-5 py-3">Phản hồi admin</th>
                <th className="px-5 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-400 dark:text-slate-300" colSpan={7}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-400 dark:text-slate-300" colSpan={7}>
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                filteredItems.map((it) => {
                  const isDeleting = deletingId === it.id;
                  const rowClickable = !isDeleting;
                  return (
                    <tr
                      id={`evaluate-row-${it.id}`}
                      key={it.id}
                      onClick={() => {
                        if (!rowClickable) return;
                        openDetail(it);
                      }}
                      className={
                        "transition-all duration-200 " +
                        (isDeleting
                          ? "opacity-50"
                          : "cursor-pointer hover:bg-slate-50 active:bg-slate-100/70 dark:hover:bg-white/5 dark:active:bg-white/10")
                      }
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{it.customerName || "-"}</div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{it.customerEmail || ""}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-800 dark:text-slate-200">
                        {(it.productName || it.colorName || it.ramGb || it.storageGb || it.quantity) ? (
                          <div className="text-xs">
                            <div className="font-medium text-slate-900 dark:text-slate-100">{it.productName || "-"}</div>
                            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-slate-600 dark:text-slate-400">
                              {it.colorName && <span>Màu: <span className="text-slate-800 dark:text-slate-200">{it.colorName}</span></span>}
                              {it.ramGb && <span>RAM: <span className="text-slate-800 dark:text-slate-200">{it.ramGb}GB</span></span>}
                              {it.storageGb && <span>Bộ nhớ: <span className="text-slate-800 dark:text-slate-200">{it.storageGb}GB</span></span>}
                              {it.quantity && <span>SL: <span className="text-slate-800 dark:text-slate-200">{it.quantity}</span></span>}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={"inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold " + starBadgeClass(it.rating)}>
                            {it.rating}
                          </span>
                          <Stars value={it.rating} />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-800 dark:text-slate-200">
                        <div className="line-clamp-2 max-w-[520px]">{it.content || "-"}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{formatDate(it.createdAt)}</td>
                      <td className="px-5 py-4 text-slate-800 dark:text-slate-200">
                        {it.adminReply ? (
                          <div>
                            <div className="line-clamp-2 max-w-[420px]">{it.adminReply}</div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(it.adminRepliedAt)}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteReply(it.id);
                                }}
                                className="ml-auto inline-flex cursor-pointer h-8 w-8 items-center justify-center rounded-full bg-transparent text-slate-500 ring-1 ring-slate-200 transition hover:bg-rose-50 hover:text-rose-700 hover:ring-rose-200 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-rose-500/10 dark:hover:text-rose-200 dark:hover:ring-rose-400/20"
                                title="Xóa phản hồi"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openReply(it);
                            }}
                            className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:ring-cyan-400/15 dark:hover:shadow-black/30"
                          >
                            Phản hồi
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(it.id);
                            }}
                            disabled={deletingId != null}
                            className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-md active:translate-y-0 disabled:opacity-70 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-1 dark:ring-rose-400/20 dark:hover:bg-rose-500/20 dark:hover:ring-rose-400/30 dark:hover:shadow-black/30"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEvaluate ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm animate-[productModalOverlayIn_160ms_ease-out]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedEvaluate(null);
          }}
        >
          <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-950 animate-[productModalIn_180ms_ease-out] max-h-[calc(100vh-2rem)]">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/60">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Chi tiết đánh giá</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvaluate(null)}
                className="inline-flex cursor-pointer h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                aria-label="Đóng"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Khách hàng</div>
                    <div className="mt-1 text-sm text-slate-900 dark:text-slate-100">{selectedEvaluate.customerName || "-"}</div>
                    {selectedEvaluate.customerEmail ? (
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{selectedEvaluate.customerEmail}</div>
                    ) : null}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Ngày tạo</div>
                    <div className="mt-1 text-sm text-slate-900 dark:text-slate-100">{formatDate(selectedEvaluate.createdAt) || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Số sao</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold " +
                          starBadgeClass(selectedEvaluate.rating)
                        }
                      >
                        {selectedEvaluate.rating}
                      </span>
                      <Stars value={selectedEvaluate.rating} />
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Sản phẩm đã mua</div>
                    <div className="mt-1 text-sm text-slate-900 dark:text-slate-100">{selectedEvaluate.productName || "-"}</div>
                    {(selectedEvaluate.colorName || selectedEvaluate.ramGb || selectedEvaluate.storageGb || selectedEvaluate.quantity) ? (
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                        {selectedEvaluate.colorName && (
                          <span>
                            Màu: <span className="text-slate-800 dark:text-slate-200">{selectedEvaluate.colorName}</span>
                          </span>
                        )}
                        {selectedEvaluate.ramGb && (
                          <span>
                            RAM: <span className="text-slate-800 dark:text-slate-200">{selectedEvaluate.ramGb}GB</span>
                          </span>
                        )}
                        {selectedEvaluate.storageGb && (
                          <span>
                            Bộ nhớ: <span className="text-slate-800 dark:text-slate-200">{selectedEvaluate.storageGb}GB</span>
                          </span>
                        )}
                        {selectedEvaluate.quantity && (
                          <span>
                            SL: <span className="text-slate-800 dark:text-slate-200">{selectedEvaluate.quantity}</span>
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:ring-white/10">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bình luận</div>
                  <div className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{selectedEvaluate.content || "-"}</div>
                </div>

                {(() => {
                  const urls = imagesByEvaluateId[selectedEvaluate.id] || [];
                  if (urls.length === 0) return null;
                  return (
                    <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:ring-white/10">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ảnh đánh giá</div>
                      <div className="flex flex-wrap gap-3">
                        {urls.map((src, idx) => (
                          <a
                            key={`${selectedEvaluate.id}-${idx}`}
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative w-20 aspect-9/16 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 cursor-pointer dark:bg-white/5 dark:ring-white/10 sm:w-24"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <img
                              src={src}
                              alt={`evaluate-${selectedEvaluate.id}-${idx}`}
                              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:ring-white/10">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Phản hồi admin</div>
                  <div className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{selectedEvaluate.adminReply || "-"}</div>
                  {selectedEvaluate.adminRepliedAt ? (
                    <div className="text-xs text-slate-600 dark:text-slate-300">{formatDate(selectedEvaluate.adminRepliedAt)}</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {replyingId != null ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Phản hồi khách hàng</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplyingId(null);
                  setReplyText("");
                }}
                className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submitReply}
                className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 dark:bg-linear-to-br dark:from-cyan-400/20 dark:to-fuchsia-500/15 dark:text-slate-100 dark:ring-1 dark:ring-cyan-400/20 dark:shadow-lg dark:shadow-cyan-500/5 dark:hover:ring-cyan-400/30"
              >
                Gửi phản hồi
              </button>
            </div>
          </div>

          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Nhập phản hồi..."
            className="mt-3 min-h-[110px] w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
          />
        </div>
      ) : null}
    </div>
  );
}