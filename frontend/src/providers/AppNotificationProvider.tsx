"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import StatusModal, { type ModalType } from "@/components/admin/StatusModal";

type ToastType = "success" | "error" | "info";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
};

type AppNotificationContextValue = {
  showToast: (message: string, type?: ToastType) => void;
  showStatus: (title: string, message: string, type?: ModalType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const AppNotificationContext =
  createContext<AppNotificationContextValue | null>(null);

export function useAppNotification(): AppNotificationContextValue {
  const ctx = useContext(AppNotificationContext);
  if (!ctx) {
    throw new Error(
      "useAppNotification phải được dùng trong AppNotificationProvider"
    );
  }
  return ctx;
}

export function useAppNotificationOptional(): AppNotificationContextValue | null {
  return useContext(AppNotificationContext);
}

export default function AppNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: ModalType;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type: "danger" | "warning" | "info";
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const showStatus = useCallback(
    (title: string, message: string, type: ModalType = "info") => {
      setStatusModal({ isOpen: true, title, message, type });
    },
    []
  );

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        type: options.type ?? "warning",
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }, []);

  const closeConfirm = useCallback((confirmed: boolean) => {
    setConfirmModal((prev) => {
      if (confirmed) prev.onConfirm();
      else prev.onCancel();
      return { ...prev, isOpen: false };
    });
  }, []);

  const value: AppNotificationContextValue = {
    showToast,
    showStatus,
    confirm,
  };

  return (
    <AppNotificationContext.Provider value={value}>
      {children}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {toast && (
            <div
              className="fixed inset-0 flex items-center justify-center"
              style={{ zIndex: 99999 }}
            >
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setToast(null)}
                className="absolute inset-0"
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
              />
              {/* Modal — full-width on mobile like admin notification panel */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative mx-3 w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white p-8 text-center shadow-2xl dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800"
                style={{
                  marginLeft: "max(0.75rem, env(safe-area-inset-left))",
                  marginRight: "max(0.75rem, env(safe-area-inset-right))",
                  paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
                }}
              >
                {/* Icon */}
                <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
                  toast.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-900/20"
                    : toast.type === "error"
                      ? "bg-rose-50 dark:bg-rose-900/20"
                      : "bg-indigo-50 dark:bg-indigo-900/20"
                }`}>
                  {toast.type === "success" && <CheckCircle2 className="h-12 w-12 text-emerald-500" />}
                  {toast.type === "error" && <AlertCircle className="h-12 w-12 text-rose-500" />}
                  {toast.type === "info" && <Info className="h-12 w-12 text-indigo-500" />}
                </div>
                {/* Message */}
                <p className="mb-8 text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  {toast.message}
                </p>
                {/* Button */}
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className={`w-full rounded-2xl py-4 text-sm font-black text-white transition-all active:scale-[0.98] shadow-xl ${
                    toast.type === "success"
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : toast.type === "error"
                        ? "bg-rose-500 hover:bg-rose-600"
                        : "bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                  }`}
                >
                  ĐÓNG
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <StatusModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal((prev) => ({ ...prev, isOpen: false }))}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => closeConfirm(false)}
        onConfirm={() => closeConfirm(true)}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
      />
    </AppNotificationContext.Provider>
  );
}
