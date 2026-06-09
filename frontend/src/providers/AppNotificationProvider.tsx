"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import ConfirmModal from "@/components/admins/ConfirmModal";
import StatusModal, { type ModalType } from "@/components/admins/StatusModal";

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

      <AnimatePresence>
        {toast && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
              onClick={() => setToast(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
              className="fixed left-1/2 top-1/2 z-[9999] w-[min(90vw,22rem)] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 dark:bg-slate-900 dark:ring-white/10"
            >
              {/* Icon + message */}
              <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-4 text-center">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                  toast.type === "success"
                    ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10"
                    : toast.type === "error"
                      ? "bg-rose-50 text-rose-500 dark:bg-rose-500/10"
                      : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                }`}>
                  {toast.type === "success" && <CheckCircle2 className="h-7 w-7" />}
                  {toast.type === "error" && <AlertCircle className="h-7 w-7" />}
                  {toast.type === "info" && <Info className="h-7 w-7" />}
                </div>
                <p className="text-sm font-semibold leading-snug text-slate-700 dark:text-slate-200">
                  {toast.message}
                </p>
              </div>
              {/* Button */}
              <div className="border-t border-slate-100 px-6 py-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className={`w-full rounded-xl py-2.5 text-sm font-bold text-white transition active:scale-95 ${
                    toast.type === "success"
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : toast.type === "error"
                        ? "bg-rose-500 hover:bg-rose-600"
                        : "bg-slate-800 hover:bg-slate-700"
                  }`}
                >
                  Đã hiểu
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
