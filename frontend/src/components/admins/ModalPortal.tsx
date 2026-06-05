"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Backdrop hoàn toàn trong suốt, không màu, không blur */
  transparent?: boolean;
  /** Backdrop glassmorphism giống BrandPage (tối + blur 6px) */
  glass?: boolean;
}

export default function ModalPortal({ isOpen, onClose, children, transparent = false, glass = false }: Props) {
  React.useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const backdropStyle: React.CSSProperties = glass
    ? {
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }
    : {};

  const backdropClass = glass || transparent
    ? "absolute inset-0"
    : "absolute inset-0 bg-slate-900/60 backdrop-blur-sm";

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={backdropClass}
            style={backdropStyle}
          />

          <div className="flex min-h-full items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              className="relative w-full max-w-5xl my-4"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
