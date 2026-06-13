"use client";

import React from "react";
import { Bot, Send, X, MessageCircle, Sparkles, Trash2, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useDraggableEdge } from "@/hooks/useDraggableEdge";
import { resolveImageUrl } from "@/common/resolveImageUrl";

type ChatMsg = { role: "user" | "assistant"; content: string };
type ProductPreview = { imageUrl?: string };
type ProductMeta = { imageUrl?: string; name?: string };

const OPENING_GREETING =
  "Chào bạn, Shop rất vui được hỗ trợ. Bạn có thể cho Shop biết nhu cầu để Shop giúp bạn tìm điện thoại phù hợp nhất nhé!";
const AI_MAINTENANCE_MESSAGE = "Hiện tại AI đang bảo trì. Bạn vui lòng thử lại sau nhé.";
const GUEST_SESSION_KEY = "bvh-ai-guest-session-id";

const SUGGESTIONS = [
  "📱 Tư vấn iPhone đời mới nhất",
  "🔋 Điện thoại pin trâu, giá hời?",
  "📸 So sánh camera Samsung vs iPhone",
  "🎮 Gaming phone tốt nhất tầm giá?",
];

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

function pickPreviewImage(product: any): string | undefined {
  return resolveImageUrl(
    product?.productMainImage ||
    product?.productImages?.[0]?.imageUrl ||
    product?.productColors?.[0]?.images?.[0]
  );
}

function pickProductName(product: any): string | undefined {
  const name = product?.productName || product?.product_name;
  if (typeof name !== "string") return undefined;
  const trimmed = name.trim();
  return trimmed ? trimmed : undefined;
}

function isTokenLimitErrorMessage(message?: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("token") ||
    normalized.includes("context length") ||
    normalized.includes("rate limit") ||
    normalized.includes("quota") ||
    normalized.includes("too many requests") ||
    normalized.includes("429")
  );
}

function getOrCreateGuestSessionId() {
  if (typeof window === "undefined") return "guest-unknown";
  const existing = localStorage.getItem(GUEST_SESSION_KEY);
  if (existing) return existing;
  const id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(GUEST_SESSION_KEY, id);
  return id;
}

export default function AiAssistantWidget({ onOpenChange, forceOpen }: { onOpenChange?: (open: boolean) => void; forceOpen?: boolean }) {
  const [open, setOpenState] = React.useState(forceOpen || false);

  const setOpen = React.useCallback((v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  }, [onOpenChange]);

  // Force open when forceOpen prop changes
  React.useEffect(() => {
    if (forceOpen !== undefined) {
      setOpenState(forceOpen);
    }
  }, [forceOpen]);
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [productPreviews, setProductPreviews] = React.useState<Record<number, ProductPreview>>({});
  const [productNames, setProductNames] = React.useState<Record<number, string>>({});
  const [quotaHint, setQuotaHint] = React.useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = React.useState<number | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const isLoggedIn = typeof window !== "undefined" && 
    !!localStorage.getItem("token") && 
    localStorage.getItem("token") !== "null" && 
    localStorage.getItem("token") !== "undefined";

  const userMsgCount = messages.filter(m => m.role === "user").length;
  const guestLimitReached = !isLoggedIn && userMsgCount >= 1;

  const drag = useDraggableEdge({
    storageKey: "bvh-assistant-pos",
  });

  // Safari iOS fix: force hardware acceleration to prevent iframe stacking issues
  const safariFixStyle = {
    transform: "translateZ(0)",
    WebkitTransform: "translateZ(0)",
    willChange: "transform",
  };

  // Get current user ID for storage key
  const userId = React.useMemo(() => {
    if (typeof window === "undefined") return "guest";
    try {
      const u = localStorage.getItem("user");
      if (u) {
        const parsed = JSON.parse(u);
        return parsed.customerId || parsed.userId || parsed.id || "user";
      }
    } catch {}
    return "guest";
  }, []);

  const historyKey = React.useMemo(() => `bvh-ai-chat-history-${userId}`, [userId]);

  const fetchProductsMeta = React.useCallback(async (ids: number[]) => {
    const unique = [...new Set(ids)].filter((id) => Number.isFinite(id) && id > 0);
    const missing = unique.filter((id) => !(id in productNames) || !(id in productPreviews));
    
    const newNames: Record<number, string> = {};
    if (missing.length > 0) {
      const results = await Promise.all(
        missing.map(async (id) => {
          try {
            const res = await fetch(`${API_URL}/api/products/${id}`, {
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) return { id, meta: {} as ProductMeta };
            const product = await res.json();
            return { id, meta: { imageUrl: pickPreviewImage(product), name: pickProductName(product) } as ProductMeta };
          } catch {
            return { id, meta: {} as ProductMeta };
          }
        })
      );

      setProductPreviews((prev) => {
        const next = { ...prev };
        for (const { id, meta } of results) {
          if (meta.imageUrl) next[id] = { imageUrl: meta.imageUrl };
        }
        return next;
      });
      setProductNames((prev) => {
        const next = { ...prev };
        for (const { id, meta } of results) {
          if (meta.name) next[id] = meta.name;
        }
        return next;
      });

      for (const { id, meta } of results) {
        if (meta.name) newNames[id] = meta.name;
      }
    }

    return { ...productNames, ...newNames };
  }, [productNames, productPreviews]);

  // Load chat history on mount or when user changes
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(historyKey);
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        setMessages([{ role: "assistant", content: OPENING_GREETING }]);
      }
    } catch (e) {
      console.error("Failed to load chat history", e);
      setMessages([{ role: "assistant", content: OPENING_GREETING }]);
    }
  }, [historyKey]);

  // Save chat history when messages change
  React.useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(historyKey, JSON.stringify(messages));
      } else {
        localStorage.removeItem(historyKey);
      }
    } catch (e) {
      console.error("Failed to save chat history", e);
    }
  }, [messages, historyKey]);

  // Clear messages if user logs in/out to avoid cross-user leak
  React.useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("token");
      if (!token) {
        // Logged out
        setMessages([{ role: "assistant", content: OPENING_GREETING }]);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  React.useEffect(() => {
    if (!open) return;
    setMessages((prev) => (prev.length === 0 ? [{ role: "assistant", content: OPENING_GREETING }] : prev));
  }, [open]);

  React.useEffect(() => {
    const productIds = new Set<number>();
    for (const msg of messages) {
      const matches = msg.content.matchAll(/\/product\/(\d+)/g);
      for (const match of matches) {
        const id = Number(match[1]);
        if (Number.isFinite(id)) productIds.add(id);
      }
    }

    const missingIds = [...productIds].filter((id) => !(id in productPreviews) || !(id in productNames));
    if (missingIds.length === 0) return;

    let cancelled = false;
    Promise.all(
      missingIds.map(async (id) => {
        try {
          const res = await fetch(`${API_URL}/api/products/${id}`, {
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
          });
          if (!res.ok) return { id, preview: {} as ProductMeta };
          const product = await res.json();
          return { id, preview: { imageUrl: pickPreviewImage(product), name: pickProductName(product) } as ProductMeta };
        } catch {
          return { id, preview: {} as ProductMeta };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      setProductPreviews((prev) => {
        const next = { ...prev };
        for (const { id, preview } of results) {
          if (preview.imageUrl) next[id] = { imageUrl: preview.imageUrl };
        }
        return next;
      });
      setProductNames((prev) => {
        const next = { ...prev };
        for (const { id, preview } of results) {
          if (preview.name) next[id] = preview.name;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [messages, productPreviews, productNames]);

  const shouldShowSuggestionChips =
    !loading &&
    messages.length === 1 &&
    messages[0]?.role === "assistant" &&
    messages[0]?.content === OPENING_GREETING;

  async function sendMessage(text: string) {
    const msg = text.trim();
    if (!msg || loading) return;
    const currentToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const reallyLoggedIn = !!currentToken && currentToken !== "null" && currentToken !== "undefined";

    if (!reallyLoggedIn && userMsgCount >= 1) {
      setMessages((prev) => {
        // Avoid duplicate limit messages
        if (prev[prev.length - 1]?.content.includes("hết lượt hỏi thử")) return prev;
        return [
          ...prev,
          { role: "assistant", content: "Bạn đã dùng hết lượt hỏi thử dành cho khách. Vui lòng đăng nhập để tiếp tục trò chuyện cùng MyPhone AI nhé!" },
        ];
      });
      return;
    }

    const userMsg: ChatMsg = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {

      const res = await fetch("/api/chat/advice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        },
        body: JSON.stringify({
          message: msg,
          topK: 5,
        }),
      });
      const data = (await res.json()) as {
        answer?: string;
        recommendedProductIds?: number[];
        error?: string;
      };
      if (!res.ok) {
        const serverError = data.error || `Lỗi server (${res.status})`;
        if (res.status === 429 || isTokenLimitErrorMessage(serverError)) {
          throw new Error(AI_MAINTENANCE_MESSAGE);
        }
        throw new Error(serverError);
      }

      const rec = Array.isArray(data.recommendedProductIds) ? data.recommendedProductIds : [];
      const recIds = rec
        .filter((id) => typeof id === "number" && Number.isFinite(id))
        .slice(0, 10) as number[];

      const allNames = await fetchProductsMeta(recIds);

      const links = rec
        .filter((id) => typeof id === "number" && Number.isFinite(id))
        .slice(0, 10)
        .map((id) => {
          const name = allNames[id];
          if (!name) return null;
          return `- [${name}](/product/${id})`;
        })
        .filter(Boolean)
        .join("\n");

      let answer = data.answer || "...";
      
      // Auto-link product names in the answer
      const productEntries = Object.entries(allNames)
        .map(([id, name]) => ({ id: Number(id), name }))
        .sort((a, b) => b.name.length - a.name.length);

      for (const p of productEntries) {
        // Safe regex: match the name but avoid replacing if it's already part of a markdown link [name](url)
        const escapedName = p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Using lookahead to ensure we don't replace if it's already inside a markdown link
        const safeRegex = new RegExp(`(${escapedName})(?![^\\[]*\\])`, "gi");
        answer = answer.replace(safeRegex, `[${p.name}](/product/${p.id})`);
      }

      const content = `${answer}${links ? `\n\nShop gợi ý:\n${links}` : ""}`;
      setMessages((prev) => [...prev, { role: "assistant", content }]);
      setQuotaHint(null);
    } catch (e) {
      const rawError = e instanceof Error ? e.message : "Có lỗi xảy ra";
      const safeMessage = isTokenLimitErrorMessage(rawError) ? AI_MAINTENANCE_MESSAGE : rawError;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ ${safeMessage}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  /* ---- robust markdown renderer: bold + links + bullet points ---- */
  function renderMd(text: string) {
    if (!text) return null;

    // Split text into parts to identify bold and links
    // Regex: (\*\*.*?\*\*|\[.*?\]\(.*?\))
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);

    return (
      <div className="space-y-1.5">
        {text.split("\n").map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-2" />;

          const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
          const lineContent = isBullet ? trimmed.substring(2) : line;

          // Remove bold wrappers around links or inside links to prevent regex conflict
          const sanitizedLine = lineContent
            .replace(/\*\*(\[.*?\]\(.*?\))\*\*/g, "$1") // **[link](url)** -> [link](url)
            .replace(/\[\*\*(.*?)\*\*\]\((.*?)\)/g, "[$1]($2)"); // [**link**](url) -> [link](url)

          // Process the content of the line for bold/links
          const segments = sanitizedLine.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);

          return (
            <div key={i} className={`${isBullet ? "ml-2 flex gap-2" : ""}`}>
              {isBullet && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />}
              <div className="flex-1 break-words">
                {segments.map((seg, j) => {
                  if (!seg) return null;

                  // Handle Bold
                  if (seg.startsWith("**") && seg.endsWith("**")) {
                    return <strong key={j} className="font-extrabold text-white">{seg.slice(2, -2)}</strong>;
                  }

                  // Handle Links
                  if (seg.startsWith("[") && seg.includes("](")) {
                    const match = seg.match(/\[(.*?)\]\((.*?)\)/);
                    if (match) {
                      const [_, label, url] = match;
                      const isProduct = url.includes("/product/");
                      const productIdMatch = url.match(/\/product\/(\d+)/);
                      const productId = productIdMatch ? Number(productIdMatch[1]) : null;
                      const previewUrl = productId ? productPreviews[productId]?.imageUrl : undefined;

                      return (
                        <Link
                          key={j}
                          href={url}
                          className={`
                            inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 font-black transition-all
                            ${isProduct
                              ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30 hover:bg-indigo-500/40 hover:text-white hover:ring-indigo-400"
                              : "text-purple-400 underline underline-offset-4 hover:text-purple-300"}
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          {isProduct && previewUrl && (
                            <img
                              src={previewUrl}
                              alt={label}
                              className="h-5 w-5 rounded-md object-cover ring-1 ring-white/20"
                            />
                          )}
                          {label}
                          {isProduct && <ArrowUpRight size={12} className="opacity-70" />}
                        </Link>
                      );
                    }
                  }

                  return <span key={j} className="text-slate-200">{seg}</span>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {/* ---- FAB ---- */}
      {!open && (
        <div
          ref={drag.ref}
          className="rounded-full z-[999]"
          style={{
            ...drag.style,
            ...safariFixStyle,
            animation: "fabPulse 2s infinite",
          }}
          {...drag.handlers}
        >
          <button
            onClick={() => { if (!drag.wasDragged()) setOpen(true); }}
            onTouchEnd={(e) => {
              if (!drag.wasDragged()) {
                e.preventDefault();
                setOpen(true);
              }
            }}
            className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 sm:h-14 sm:w-auto sm:gap-3 sm:px-5 sm:shadow-2xl sm:hover:pr-6 dark:bg-slate-900"
            style={{
              boxShadow: "0 8px 24px -8px rgba(139,92,246,0.45)",
              WebkitTapHighlightColor: "transparent",
            }}
            aria-label="AI MyPhone - Trợ lý thông minh"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-10 transition-opacity group-hover:opacity-20" />

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white shadow-md ring-2 ring-white/20 sm:h-11 sm:w-11">
              <MessageCircle className="h-[18px] w-[18px] drop-shadow-md sm:h-[22px] sm:w-[22px]" />
            </div>

            <div className="hidden flex-col items-start pr-1 text-left whitespace-nowrap sm:flex">
              <span className="text-sm font-extrabold tracking-tight text-slate-800 dark:text-white">AI MyPhone</span>
              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">Trợ lý thông minh</span>
            </div>
          </button>
        </div>
      )}

      {/* ---- Chat panel ---- */}
      {open && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col overflow-hidden rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full sm:w-[420px]"
            style={{
              height: "min(650px, 85dvh)",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "linear-gradient(165deg, #0f172a 0%, #1e1b4b 100%)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 20px 50px rgba(0,0,0,0.5)",
              WebkitTransform: "translateZ(0)",
            }}
          >
          {/* Subtle glow effect */}
          <div className="absolute -top-[50%] -left-[50%] h-[200%] w-[200%] pointer-events-none opacity-20"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />

          {/* header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}
          >
            <div className="flex items-center gap-3 text-white">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md ring-1 ring-white/30">
                  <Bot size={22} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-purple-600 bg-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-wider">MyPhone AI</div>
                <div className="text-[10px] font-medium text-white/70">Sẵn sàng tư vấn 24/7</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    setMessages([{ role: "assistant", content: OPENING_GREETING }]);
                    setChatSessionId(null);
                  }}
                  className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                  title="Xoá hội thoại"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: "thin" }}>
            {quotaHint && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-300">
                {quotaHint}
              </div>
            )}
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center gap-4 pt-6 text-center">
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-3xl shadow-lg ring-4 ring-white/10"
                  style={{ background: "linear-gradient(135deg,#6366f1,#a855f7,#ec4899)" }}
                >
                  <Sparkles size={36} className="text-white animate-pulse" />
                </div>
                <div className="px-6">
                  <div className="text-lg font-black text-white tracking-tight">Chào mừng tới MyPhone! 👋</div>
                  <div className="mt-2 text-xs leading-relaxed text-slate-400">
                    Tôi là chuyên gia công nghệ của MyPhone Store. Bạn cần tìm điện thoại chơi game, chụp ảnh hay làm việc?
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2 px-4">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="rounded-full border border-white/5 bg-white/5 px-4 py-2 text-[11px] font-medium text-slate-300 transition-all hover:border-purple-500/50 hover:bg-purple-500/20 hover:text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                  style={
                    m.role === "user"
                      ? { background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", borderBottomRightRadius: 4 }
                      : { background: "#1e1e2e", color: "#e2e8f0", borderBottomLeftRadius: 4 }
                  }
                >
                  {renderMd(m.content)}
                </div>
              </div>
            ))}

            {shouldShowSuggestionChips && (
              <div className="flex flex-wrap justify-start gap-2 pl-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="rounded-full border border-white/5 bg-white/5 px-4 py-2 text-[11px] font-medium text-slate-300 transition-all hover:border-purple-500/50 hover:bg-purple-500/20 hover:text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl bg-[#1e1e2e] px-4 py-3">
                  <span className="ai-dot" style={{ animationDelay: "0ms" }} />
                  <span className="ai-dot" style={{ animationDelay: "150ms" }} />
                  <span className="ai-dot" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* input */}
          <div className="border-t border-slate-800/50 px-4 py-4">
            {guestLimitReached ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-indigo-500/10 p-4 ring-1 ring-indigo-500/30">
                <p className="text-center text-xs font-semibold text-indigo-300">
                  Đăng nhập để tiếp tục hỏi đáp không giới hạn!
                </p>
                <Link
                  href="/auth/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles size={16} />
                  Đăng nhập ngay
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-[1.25rem] bg-white/5 px-4 py-2.5 ring-1 ring-white/10 focus-within:ring-purple-500/50 focus-within:bg-white/10 transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Nhập câu hỏi..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent py-1 text-sm text-white outline-none placeholder:text-slate-500"
                  style={{ maxHeight: 100 }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
                >
                  <Send size={16} className="text-white" />
                </button>
              </div>
            )}
            <div className="mt-2 text-center text-[9px] font-bold uppercase tracking-widest text-slate-600">
              Professional Assistant · MyPhone Store
            </div>
          </div>
          </div>
        </div>
      )}

      {/* scoped styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fabPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,.5); }
          50% { box-shadow: 0 0 0 12px rgba(139,92,246,0); }
        }
        .ai-dot {
          display: inline-block;
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #8b5cf6;
          animation: aiDotBounce 1.2s infinite ease-in-out;
        }
        @keyframes aiDotBounce {
          0%,80%,100% { transform: scale(0.4); opacity:.4; }
          40% { transform: scale(1); opacity:1; }
        }
      `}} />
    </>
  );
}