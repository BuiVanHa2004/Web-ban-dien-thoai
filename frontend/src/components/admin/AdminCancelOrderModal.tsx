"use client";

import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Loader2, Send, AlertCircle } from "lucide-react";
import { orderService, type ReasonDto } from "@/services/orderService";
import { useAppNotification } from "@/providers/AppNotificationProvider";

interface AdminCancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOrder: any) => void;
  orderId: number;
}

export const AdminCancelOrderModal: React.FC<AdminCancelOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orderId,
}) => {
  const { showToast, confirm, showStatus } = useAppNotification();
  const [reasons, setReasons] = React.useState<ReasonDto[]>([]);
  const [selectedReasonId, setSelectedReasonId] = React.useState<number | null>(null);
  const [cancelNote, setCancelNote] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fetchingReasons, setFetchingReasons] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    if (isOpen) {
      fetchReasons();
      document.body.style.overflow = "hidden";
    } else {
      setSelectedReasonId(null);
      setCancelNote("");
      setError(null);
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const fetchReasons = async () => {
    setFetchingReasons(true);
    setError(null);
    try {
      const data = await orderService.getAdminReasons();
      setReasons(data || []);
      
      // Auto-select a reason: prefer one that allows input, otherwise the first one
      if (data && data.length > 0) {
        const defaultReason = data.find(r => r.allowInput) || data[0];
        setSelectedReasonId(defaultReason.reasonId);
      }
    } catch (err: any) {
      console.error("Fetch reasons error:", err);
      setError("Không thể tải cấu hình lý do hủy.");
    } finally {
      setFetchingReasons(false);
    }
  };

  const selectedReason = reasons.find((r) => r.reasonId === selectedReasonId);
  const isSubmitDisabled = !cancelNote.trim() || loading || fetchingReasons;

  const handleSubmit = async () => {
    if (!selectedReasonId) return;
    
    const ok = await confirm({
      title: "Hủy đơn hàng",
      message:
        "Bạn có chắc chắn muốn hủy đơn hàng này? Hành động không thể hoàn tác và sẽ thông báo đến khách hàng.",
      type: "danger",
      confirmText: "HỦY ĐƠN",
    });
    if (!ok) return;

    setLoading(true);
    setError(null);
    try {
      const updatedOrder = await orderService.adminCancelOrder(orderId, {
        reasonId: selectedReasonId!,
        cancelNote: cancelNote,
      });
      showStatus("Thành công", "Đã hủy đơn hàng thành công!", "success");
      onSuccess(updatedOrder);
      onClose();
    } catch (err: any) {
      const msg = err.message || "Có lỗi xảy ra khi hủy đơn hàng.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Xác nhận hủy đơn hàng</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dành cho Quản trị viên / Nhân viên</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6">
              <div className="rounded-2xl bg-rose-50 p-4 border border-rose-100 dark:bg-rose-500/5 dark:border-rose-500/10">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-400">Cảnh báo quan trọng</p>
                    <p className="text-xs text-rose-600/80 dark:text-rose-400/60 mt-1 font-medium">
                      Hành động này không thể hoàn tác. Hệ thống sẽ tự động hoàn kho và gửi thông báo cho khách hàng.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 dark:bg-rose-500/10">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {fetchingReasons ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">
                      Lý do hủy đơn hàng (Bắt buộc)
                    </label>
                    <textarea
                      value={cancelNote}
                      onChange={(e) => setCancelNote(e.target.value)}
                      placeholder="Nhập lý do chi tiết để thông báo cho khách hàng..."
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-sm font-medium transition-all focus:border-purple-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                      rows={4}
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 bg-slate-50/50 p-6 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={onClose}
                disabled={loading}
                className="rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Xác nhận hủy đơn
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
