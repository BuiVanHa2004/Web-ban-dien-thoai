"use client";

import React, { useState } from "react";
import { Sparkles, MessageCircle, Scale, X } from "lucide-react";
import AiAssistantWidget from "./AiAssistantWidget";
import CompareWidget from "./CompareWidget";
import { useDraggableEdge } from "@/hooks/useDraggableEdge";

export default function UnifiedAiWidget() {
  const [showMenu, setShowMenu] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const drag = useDraggableEdge({
    storageKey: "unified-ai-widget-pos",
    margin: 24,
  });

  const safariFixStyle = {
    transform: "translateZ(0)",
    WebkitTransform: "translateZ(0)",
    willChange: "transform",
  };

  const handleOpenAssistant = () => {
    setShowMenu(false);
    // Use setTimeout to ensure menu closes before widget opens
    setTimeout(() => {
      setAssistantOpen(true);
    }, 100);
  };

  const handleOpenCompare = () => {
    setShowMenu(false);
    // Use setTimeout to ensure menu closes before widget opens
    setTimeout(() => {
      setCompareOpen(true);
    }, 100);
  };

  // Always render widgets, just control their visibility
  // This ensures they mount properly and open immediately

  return (
    <>
      {/* AI Assistant Widget - always mounted to preserve state/history */}
      <div style={{ display: assistantOpen ? 'block' : 'none' }}>
        <AiAssistantWidget 
          forceOpen={assistantOpen}
          onOpenChange={(open) => {
            setAssistantOpen(open);
          }} 
        />
      </div>

      {/* Compare Widget - only rendered when needed */}
      {compareOpen && (
        <CompareWidgetWrapper onClose={() => setCompareOpen(false)} />
      )}

      {/* Main Floating Button - hide when any widget is open */}
      {!showMenu && !assistantOpen && !compareOpen && (
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
            onClick={() => { 
              if (!drag.wasDragged()) setShowMenu(true); 
            }}
            onTouchEnd={(e) => {
              if (!drag.wasDragged()) {
                e.preventDefault();
                setShowMenu(true);
              }
            }}
            className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 sm:h-14 sm:w-auto sm:gap-3 sm:px-5 sm:shadow-2xl sm:hover:pr-6 dark:bg-slate-900"
            style={{
              boxShadow: "0 8px 24px -8px rgba(139,92,246,0.45)",
              WebkitTapHighlightColor: "transparent",
            }}
            aria-label="AI MyPhone - Trợ lý thông minh"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-10 transition-opacity group-hover:opacity-20" />

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white shadow-md ring-2 ring-white/20 sm:h-11 sm:w-11">
              <Sparkles className="h-4 w-4 drop-shadow-md sm:h-[22px] sm:w-[22px]" />
            </div>

            <div className="hidden flex-col items-start pr-1 text-left whitespace-nowrap sm:flex">
              <span className="text-sm font-extrabold tracking-tight text-slate-800 dark:text-white">AI MyPhone</span>
              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">Trợ lý thông minh</span>
            </div>
          </button>
        </div>
      )}

      {/* Menu Popup - hide when any widget is open */}
      {showMenu && !assistantOpen && !compareOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="relative">
            {/* Close button */}
            <button
              onClick={() => setShowMenu(false)}
              className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg transition-all hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-950 z-10"
              style={{
                boxShadow: "0 4px 12px -4px rgba(239,68,68,0.45)",
              }}
            >
              <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>

            {/* Menu Card */}
            <div
              className="overflow-hidden rounded-2xl shadow-2xl"
              style={{
                background: "linear-gradient(165deg, #0f172a 0%, #1e1b4b 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 20px 50px rgba(0,0,0,0.5)",
                width: "340px",
                maxWidth: "calc(100vw - 2rem)",
              }}
            >
              {/* Header */}
              <div
                className="px-4 py-3"
                style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}
              >
                <div className="flex items-center gap-2 text-white justify-center">
                  <Sparkles size={18} />
                  <h3 className="text-xs font-black uppercase tracking-wider">Chọn tính năng AI</h3>
                </div>
              </div>

              {/* Menu Options */}
              <div className="p-3 space-y-2">
                {/* AI Tư vấn */}
                <button
                  onClick={handleOpenAssistant}
                  className="group w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-indigo-500/50 hover:bg-indigo-500/20 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                      <MessageCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">AI Tư vấn</div>
                      <div className="text-xs text-slate-400 group-hover:text-slate-300">
                        Trò chuyện để tìm sản phẩm phù hợp
                      </div>
                    </div>
                  </div>
                </button>

                {/* So sánh sản phẩm */}
                <button
                  onClick={handleOpenCompare}
                  className="group w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-purple-500/50 hover:bg-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg">
                      <Scale size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">So sánh AI</div>
                      <div className="text-xs text-slate-400 group-hover:text-slate-300">
                        So sánh chi tiết các sản phẩm
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 px-3 py-2">
                <div className="text-center text-[8px] font-bold uppercase tracking-widest text-slate-600">
                  MyPhone AI Assistant
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global styles */}
      <style jsx global>{`
        @keyframes fabPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,.5); }
          50% { box-shadow: 0 0 0 12px rgba(139,92,246,0); }
        }
      `}</style>
    </>
  );
}

// Wrapper component for CompareWidget to intercept close events
function CompareWidgetWrapper({ onClose }: { onClose: () => void }) {
  return <CompareWidget chatOpen={false} forceOpen={true} onClose={onClose} />;
}
