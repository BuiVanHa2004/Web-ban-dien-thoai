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
          <motion.div
            initial={{ opacity: 0, y: 40, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className={`fixed bottom-8 left-1/2 z-[300] flex max-w-[min(90vw,28rem)] items-center gap-3 rounded-2xl px-5 py-4 shadow-2xl backdrop-blur-xl ring-1 ${
              toast.type === "success"
                ? "bg-emerald-500/95 text-white ring-emerald-400/30"
                : toast.type === "error"
                  ? "bg-rose-500/95 text-white ring-rose-400/30"
                  : "bg-slate-900/95 text-white ring-slate-700/30"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="h-5 w-5 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="h-5 w-5 shrink-0" />}
            {toast.type === "info" && <Info className="h-5 w-5 shrink-0" />}
            <span className="text-sm font-bold leading-snug">{toast.message}</span>
          </motion.div>
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
