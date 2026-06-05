"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Check, X, Info, AlertTriangle, Loader2 } from "lucide-react";

export type ModalType = "success" | "error" | "info" | "warning" | "loading";

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: ModalType;
}

export default function StatusModal({ isOpen, onClose, title, message, type = "info" }: StatusModalProps) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <Check className="h-12 w-12 text-emerald-500" />;
      case "error":
        return <X className="h-12 w-12 text-rose-500" />;
      case "warning":
        return <AlertTriangle className="h-12 w-12 text-amber-500" />;
      case "loading":
        return <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />;
      default:
        return <Info className="h-12 w-12 text-indigo-500" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "success": return "bg-emerald-50 dark:bg-emerald-900/20";
      case "error": return "bg-rose-50 dark:bg-rose-900/20";
      case "warning": return "bg-amber-50 dark:bg-amber-900/20";
      default: return "bg-indigo-50 dark:bg-indigo-900/20";
    }
  };

  React.useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={type !== "loading" ? onClose : undefined}
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
            <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${getBgColor()}`}>
              {getIcon()}
            </div>
            <h3 className="mb-2 text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {title}
            </h3>
            <p className="mb-8 text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              {message}
            </p>
            {type !== "loading" && (
              <button
                onClick={onClose}
                className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-black text-white transition-all hover:bg-slate-800 active:scale-[0.98] dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-xl"
              >
                ĐÓNG
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
