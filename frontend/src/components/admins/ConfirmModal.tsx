"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { AlertCircle, HelpCircle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "XÁC NHẬN",
  cancelText = "HỦY",
  type = "warning"
}: ConfirmModalProps) {
  React.useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const getColors = () => {
    switch (type) {
      case "danger":
        return {
          bg: "bg-rose-50 dark:bg-rose-900/20",
          icon: "text-rose-500",
          btn: "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
        };
      case "info":
        return {
          bg: "bg-indigo-50 dark:bg-indigo-900/20",
          icon: "text-indigo-500",
          btn: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
        };
      default:
        return {
          bg: "bg-amber-50 dark:bg-amber-900/20",
          icon: "text-amber-500",
          btn: "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
        };
    }
  };

  const colors = getColors();

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
            className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white/60 p-8 text-center shadow-2xl backdrop-blur-sm dark:bg-slate-900/80 ring-1 ring-slate-200 dark:ring-slate-800"
          >
            <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${colors.bg}`}>
              <HelpCircle className={`h-12 w-12 ${colors.icon}`} />
            </div>
            <h3 className="mb-2 text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {title}
            </h3>
            <p className="mb-8 text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              {message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl bg-slate-100 py-4 text-xs font-black text-slate-600 transition-all hover:bg-slate-200 active:scale-[0.98] dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 rounded-2xl py-4 text-xs font-black text-white transition-all active:scale-[0.98] shadow-xl ${colors.btn}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
