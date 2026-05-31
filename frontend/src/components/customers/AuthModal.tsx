"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogIn, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AuthModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handler = () => {
      setIsOpen(true);
    };
    window.addEventListener("show-auth-popup", handler);
    return () => {
      window.removeEventListener("show-auth-popup", handler);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  const handleLoginRedirect = () => {
    setIsOpen(false);
    router.push("/login");
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Content */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-500/10 mb-6">
                <AlertCircle className="h-8 w-8 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Bạn phải đăng nhập</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Vui lòng đăng nhập tài khoản để tiếp tục sử dụng tính năng này.
              </p>

              {/* Action Buttons */}
              <div className="flex w-full flex-col gap-3">
                <button
                  onClick={handleLoginRedirect}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-purple-500/20 transition hover:opacity-95 active:scale-95 cursor-pointer"
                >
                  <LogIn className="h-4 w-4" /> Đăng nhập ngay
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white font-bold text-xs uppercase tracking-widest text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
