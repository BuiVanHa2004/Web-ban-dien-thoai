"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

interface ValidationModalProps {
  open: boolean;
  fields: string[];
  onClose: () => void;
  title?: string;
}

export default function ValidationModal({
  open,
  fields,
  onClose,
  title = "Bạn chưa điền đầy đủ thông tin",
}: ValidationModalProps) {
  React.useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const content = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.7)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white p-8 text-center shadow-2xl dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/20">
              <AlertTriangle className="h-10 w-10 text-rose-500" />
            </div>
            <h3 className="mb-2 text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {title}
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Vui lòng hoàn thiện các mục sau:
            </p>
            <ul className="mt-3 mb-8 space-y-1">
              {fields.map((f, i) => (
                <li key={i} className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  • {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-black text-white transition-all hover:bg-slate-800 active:scale-[0.98] dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-xl"
            >
              ĐÃ HIỂU
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
