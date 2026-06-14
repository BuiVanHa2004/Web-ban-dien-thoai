"use client";

import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Loader2, Send } from "lucide-react";
import { orderService, type ReasonDto } from "@/services/orderService";
import { useAppNotification } from "@/providers/AppNotificationProvider";

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOrder: any) => void;
  orderId: number;
  customerId: number;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  customerId,
}) => {
  const { confirm } = useAppNotification();
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
      // Lock scroll when modal is open
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
      const data = await orderService.getReasons("ORDER_CANCEL");
      if (!data || data.length === 0) {
        setError("Không có lý do hủy nào được tìm thấy.");
      } else {
        setReasons(data);
      }
    } catch (err: any) {
      console.error("Fetch reasons error:", err);
      setError("Không thể tải danh sách lý do. Vui lòng thử lại sau.");
    } finally {
      setFetchingReasons(false);
    }
  };

  const selectedReason = reasons.find((r) => r.reasonId === selectedReasonId);
  const isSubmitDisabled = !selectedReasonId || (selectedReason?.allowInput && !cancelNote.trim()) || loading;

  const handleSubmit = async () => {
    if (!selectedReasonId) return;
    const ok = await confirm({
      title: "Hủy đơn hàng",
      message: "Bạn có chắc chắn muốn hủy đơn hàng này không?",
      type: "warning",
      confirmText: "HỦY ĐƠN",
    });
    if (!ok) return;

    setLoading(true);
    setError(null);
    try {
      const updatedOrder = await orderService.cancelOrder(orderId, {
        customerId,
        reasonId: selectedReasonId,
        cancelNote: selectedReason?.allowInput ? cancelNote : undefined,
      });
      // Đóng modal trước khi gọi onSuccess để không bị đè popup
      onClose();
      // Delay một chút để animation đóng modal hoàn tất
      setTimeout(() => {
        onSuccess(updatedOrder);
      }, 100);
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi hủy đơn hàng.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Hủy đơn hàng</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lý do hủy đơn</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto p-6 scrollbar-hide">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600 dark:bg-rose-500/10"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              {fetchingReasons ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                  <p className="mt-4 text-sm font-bold uppercase tracking-widest text-center px-4">
                    Đang tải danh sách lý do hủy...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reasons.map((reason) => (
                    <label
                      key={reason.reasonId}
                      className={`group relative flex cursor-pointer items-center justify-between rounded-2xl border-2 p-4 transition-all duration-300 ${
                        selectedReasonId === reason.reasonId
                          ? "border-purple-600 bg-purple-50/50 dark:bg-purple-500/5 ring-4 ring-purple-500/10"
                          : "border-slate-100 bg-white hover:border-slate-200 dark:border-slate-800 dark:bg-slate-950"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                            selectedReasonId === reason.reasonId
                              ? "border-purple-600 bg-purple-600"
                              : "border-slate-200 group-hover:border-slate-300"
                          }`}
                        >
                          {selectedReasonId === reason.reasonId && (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className={`text-sm font-bold ${
                          selectedReasonId === reason.reasonId ? "text-purple-900 dark:text-purple-400" : "text-slate-600 dark:text-slate-400"
                        }`}>
                          {reason.reasonName}
                        </span>
                      </div>
                      <input
                        type="radio"
                        name="cancelReason"
                        className="hidden"
                        checked={selectedReasonId === reason.reasonId}
                        onChange={() => setSelectedReasonId(reason.reasonId)}
                      />
                    </label>
                  ))}
                </div>
              )}

              <AnimatePresence>
                {selectedReason?.allowInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Chi tiết lý do <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={cancelNote}
                      onChange={(e) => setCancelNote(e.target.value)}
                      placeholder="Hãy cho chúng tôi biết thêm chi tiết..."
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-sm font-medium transition-all focus:border-purple-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                      rows={4}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 bg-slate-50 p-6 dark:bg-slate-950/50">
              <button
                onClick={onClose}
                disabled={loading}
                className="rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-purple-500/20 transition-all hover:bg-purple-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
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
