"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  adminManualPaymentService,
  type PaymentAttempt,
  type PaymentLog
} from "@/services/adminManualPaymentService";
import { orderService, type OrderDto } from "@/services/orderService";
import { translatePaymentStatus } from "@/services/paymentStatusLabels";
import {
  Check, X, Trash2, Loader2, Image as ImageIcon,
  History, CheckCircle2, Info, User, Zap, AlertTriangle, Archive
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import StatusModal, { type ModalType } from "@/components/admins/StatusModal";
import ConfirmModal from "@/components/admins/ConfirmModal";

// --- Utilities ---
const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  const date = new Date(iso);
  return date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};

// --- Sub-components ---

const RiskBadge = ({ level }: { level?: string }) => {
  const styles: Record<string, string> = {
    LOW: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800",
    MEDIUM: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800",
    HIGH: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800",
  };
  const labels: Record<string, string> = {
    LOW: "THẤP",
    MEDIUM: "TRUNG BÌNH",
    HIGH: "CAO",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${styles[level || "LOW"]}`}>
      <AlertTriangle className="h-3 w-3" />
      {labels[level || "LOW"]}
    </span>
  );
};

const PaymentTimeline = ({ logs }: { logs: PaymentLog[] }) => {
  const getActionConfig = (type: string) => {
    switch (type) {
      case "APPROVE":
      case "APPROVE_BILL":
        return { label: "DUYỆT", color: "text-emerald-600", bg: "bg-emerald-500", icon: CheckCircle2 };
      case "REJECT":
      case "REJECT_BILL":
        return { label: "TỪ CHỐI", color: "text-rose-600", bg: "bg-rose-500", icon: X };
      case "CUSTOMER_CONFIRM":
        return { label: "GỬI MINH CHỨNG", color: "text-purple-600", bg: "bg-purple-500", icon: Zap };
      default:
        return { label: type, color: "text-slate-600", bg: "bg-slate-500", icon: Info };
    }
  };

  if (logs.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-10 opacity-30">
        <History className="h-10 w-10 mb-2" />
        <p className="text-xs font-black">CHƯA CÓ LỊCH SỬ</p>
      </div>
    );

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
      {logs.map((log, idx) => {
        const config = getActionConfig(log.actionType);
        const Icon = config.icon;
        const isLast = idx === logs.length - 1;

        return (
          <div key={log.logId} className="group relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <div className="absolute left-[11px] top-6 h-full w-[2px] bg-white/15 group-hover:bg-indigo-400/30 transition-colors" />
            )}
            <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${config.bg}`}>
              <Icon className="h-3 w-3" />
            </div>
            <div className="flex flex-1 flex-col pb-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-[9px] font-bold text-white/60">{formatDate(log.createdAt)}</span>
              </div>
              <div
                className="mt-1 rounded-3xl bg-white/8 p-3 ring-1 ring-white/10 group-hover:ring-indigo-400/30 transition-all"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <p className="text-[11px] font-medium text-white/90 leading-relaxed">
                  {log.note || "Không có nội dung chi tiết"}
                </p>
                {(log.oldStatus || log.newStatus) ? (
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-white/60">
                    {translatePaymentStatus(log.oldStatus)} → {translatePaymentStatus(log.newStatus)}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-2">
                  {log.adminId ? (
                    <>
                      <div className="h-4 w-4 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-300">
                        <User className="h-2.5 w-2.5" />
                      </div>
                      <span className="text-[9px] font-black text-white/70 tracking-tighter">
                        {log.adminName || (log.adminId === 0 ? "Hệ thống" : `Quản trị viên #${log.adminId}`)}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-4 w-4 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300">
                        <User className="h-2.5 w-2.5" />
                      </div>
                      <span className="text-[9px] font-black text-white/70 uppercase tracking-tighter">
                        Khách hàng
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Main Component ---

export default function WareHousePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [archivedAttempts, setArchivedAttempts] = useState<PaymentAttempt[]>([]);

  // Selected state
  const [selectedAttempt, setSelectedAttempt] = useState<PaymentAttempt | null>(null);
  const [attemptLogs, setAttemptLogs] = useState<PaymentLog[]>([]);
  const [detailOrder, setDetailOrder] = useState<OrderDto | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Status Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: ModalType;
  }>({ isOpen: false, title: "", message: "", type: "info" });

  // Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning" | "info";
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {}, type: "warning" });

  const showStatus = (title: string, message: string, type: ModalType = "info") => {
    setModalConfig({ isOpen: true, title, message, type });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: "danger" | "warning" | "info" = "warning"
  ) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, type });
  };

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const archived = await adminManualPaymentService.getArchivedAttempts();
      setArchivedAttempts(archived);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = async (attempt: PaymentAttempt) => {
    setSelectedAttempt(attempt);
    setShowDetailModal(true);
    try {
      const [logs, order] = await Promise.all([
        adminManualPaymentService.getLogs(attempt.orderId),
        orderService.getById(attempt.orderId),
      ]);
      setAttemptLogs(logs);
      setDetailOrder(order);
    } catch (err: any) {
      setAttemptLogs([]);
      setDetailOrder(null);
    }
  };

  const handleDeleteOne = async (attemptId: number) => {
    showConfirm(
      "Xóa vĩnh viễn bill?",
      "Bill này sẽ bị xóa vĩnh viễn khỏi hệ thống. Không thể khôi phục!",
      async () => {
        setDeleting(true);
        try {
          await adminManualPaymentService.deleteArchivedAttempt(attemptId);
          showStatus("Đã xóa", "Bill đã được xóa vĩnh viễn", "success");
          await fetchData(true);
          if (selectedAttempt?.attemptId === attemptId) {
            setShowDetailModal(false);
          }
        } catch (err: any) {
          showStatus("Lỗi", err.message || "Không thể xóa bill", "error");
        } finally {
          setDeleting(false);
        }
      },
      "danger"
    );
  };

  const handleDeleteAll = async () => {
    showConfirm(
      "Xóa tất cả bill lưu trữ?",
      `Tất cả ${archivedAttempts.length} bill sẽ bị xóa vĩnh viễn khỏi hệ thống. Không thể khôi phục!`,
      async () => {
        setDeleting(true);
        try {
          await adminManualPaymentService.deleteAllArchivedAttempts();
          showStatus("Đã xóa tất cả", "Tất cả bill đã được xóa vĩnh viễn", "success");
          await fetchData(true);
          setShowDetailModal(false);
        } catch (err: any) {
          showStatus("Lỗi", err.message || "Không thể xóa", "error");
        } finally {
          setDeleting(false);
        }
      },
      "danger"
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6 lg:p-8">
      <StatusModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={() => {
          confirmConfig.onConfirm();
          setConfirmConfig({ ...confirmConfig, isOpen: false });
        }}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        type={confirmConfig.type}
      />

      {/* Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-black text-white tracking-tight">
              Kho Lưu Trữ Bill
            </h1>
            <p className="mt-1 text-xs sm:text-sm lg:text-base text-white/70">
              Bill đã được lưu trữ từ đơn hàng đã xóa vĩnh viễn
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fetchData()}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl sm:rounded-3xl bg-white/10 px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-white/20 whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.2-8.5" />
              </svg>
              <span className="hidden xs:inline">Làm mới</span>
            </button>

            {archivedAttempts.length > 0 && (
              <button
                onClick={handleDeleteAll}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl sm:rounded-3xl bg-rose-600 px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-rose-700 disabled:opacity-50 whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Xóa tất cả</span>
                <span className="hidden sm:inline">({archivedAttempts.length})</span>
              </button>
            )}

            <Link
              href="/payments"
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl sm:rounded-3xl bg-indigo-600 px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 whitespace-nowrap ml-auto"
            >
              Quay lại
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-3 sm:p-6 lg:p-8 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Archive className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 shrink-0 text-amber-500" />
            <span>Bill đã lưu trữ</span>
            <span className="text-xs sm:text-sm lg:text-base opacity-60">({archivedAttempts.length})</span>
          </h3>
        </div>

        {error && (
          <div className="p-4 sm:p-8 border-b border-rose-100 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-900/20">
            <p className="text-sm font-bold text-rose-600">{error}</p>
          </div>
        )}

        {archivedAttempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 lg:py-24 px-4">
            <Archive className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 text-slate-300 dark:text-slate-600 mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base lg:text-lg font-black text-slate-400 text-center">Chưa có bill nào trong kho lưu trữ</p>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-500 text-center">Bill sẽ được lưu trữ khi bạn xóa vĩnh viễn đơn hàng</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {archivedAttempts.map((attempt) => (
              <div
                key={attempt.attemptId}
                className="p-3 sm:p-4 lg:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="shrink-0">
                      {attempt.transferImageUrl ? (
                        <img
                          src={attempt.transferImageUrl}
                          className="h-14 w-14 sm:h-20 sm:w-20 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700"
                          alt="Bill"
                        />
                      ) : (
                        <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white whitespace-nowrap">
                          ĐH #{attempt.orderId}
                        </span>
                        <span
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black whitespace-nowrap ${
                            attempt.status === "MATCHED"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                              : "bg-rose-50 text-rose-600 dark:bg-rose-900/20"
                          }`}
                        >
                          {attempt.status === "MATCHED" ? <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                          {attempt.status === "MATCHED" ? "DUYỆT" : "TỪ CHỐI"}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs sm:text-sm">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-slate-500 text-[10px] sm:text-xs">Số tiền:</span>
                          <span className="font-bold text-indigo-600 text-xs sm:text-sm">{formatVnd(attempt.amount)}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-slate-500 text-[10px] sm:text-xs">Lưu trữ:</span>
                          <span className="font-medium text-[11px] sm:text-sm">{formatDate(attempt.archivedAt || undefined)}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-slate-500 text-[10px] sm:text-xs">Ghi chú:</span>
                          <span className="italic text-[11px] sm:text-sm line-clamp-2">{attempt.transferNote || "Không có"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleViewDetail(attempt)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-indigo-700 transition"
                    >
                      <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>Chi tiết</span>
                    </button>
                    <button
                      onClick={() => handleDeleteOne(attempt.attemptId)}
                      disabled={deleting}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-rose-700 transition disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal - Same as PaymentPage */}
      <AnimatePresence>
        {showDetailModal && selectedAttempt && typeof window !== "undefined" && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-7xl h-[90vh] flex flex-col lg:flex-row gap-0 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(88,28,135,0.95) 100%)",
                borderRadius: "3rem",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {/* Left panel: Image */}
              <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8 lg:p-12 overflow-hidden">
                <div className="relative group rounded-[3rem] shadow-2xl overflow-hidden"
                  style={{ border: "3px solid rgba(255,255,255,0.15)", display: "inline-block", maxWidth: "100%" }}
                >
                  <img
                    src={selectedAttempt.transferImageUrl}
                    className="block"
                    style={{ maxWidth: "100%", maxHeight: "65vh", width: "auto", height: "auto" }}
                    alt="Minh chứng"
                  />
                </div>
              </div>

              {/* Right panel: Info */}
              <div className="flex-1 flex flex-col overflow-hidden rounded-[2rem] sm:rounded-[3rem] lg:rounded-l-none lg:rounded-r-[3rem]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3 sm:py-4 lg:py-6 shrink-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(15,23,42,0.4)" }}
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-white truncate">Chi tiết Bill</h2>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-white/70">Đơn hàng:</span>
                      <span className="text-[10px] sm:text-xs lg:text-sm font-black text-indigo-400">ĐH-{selectedAttempt.orderId}</span>
                      <div className="scale-75 sm:scale-90 lg:scale-100 origin-left">
                        <RiskBadge level={selectedAttempt.riskLevel} />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-1.5 sm:p-2 rounded-full transition-all text-white/70 hover:text-white hover:bg-rose-500 active:bg-rose-600 shrink-0"
                    style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
                    title="Đóng"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-10 flex flex-col">
                  {/* Mobile: show proof image inline */}
                  {selectedAttempt.transferImageUrl && (
                    <div className="lg:hidden mb-3 sm:mb-4 flex flex-col items-center">
                      <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl w-full"
                        style={{ border: "2px solid rgba(255,255,255,0.15)", maxWidth: "100%" }}
                      >
                        <img
                          src={selectedAttempt.transferImageUrl}
                          className="block w-full"
                          style={{ maxHeight: "35vh", objectFit: "contain" }}
                          alt="Minh chứng"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-2 mb-4 sm:mb-6 lg:mb-8">
                    <div className="p-2.5 sm:p-4 lg:p-6 rounded-xl sm:rounded-[1.5rem] lg:rounded-[2rem]"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/70">
                        Số tiền khớp lệnh
                      </div>
                      <div className="mt-0.5 sm:mt-1 text-sm sm:text-lg lg:text-2xl font-black text-indigo-400 break-words">
                        {formatVnd(selectedAttempt.amount)}
                      </div>
                    </div>
                    <div className="p-2.5 sm:p-4 lg:p-6 rounded-xl sm:rounded-[1.5rem] lg:rounded-[2rem]"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/70">
                        Lưu trữ lúc
                      </div>
                      <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm lg:text-lg font-black text-white break-words">
                        {formatDate(selectedAttempt.archivedAt || undefined)}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 sm:mb-6 lg:mb-8 p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-[1.5rem] lg:rounded-[2rem] flex gap-2 sm:gap-3 lg:gap-4"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
                  >
                    <div className="p-2 sm:p-2.5 lg:p-3 rounded-2xl sm:rounded-3xl h-fit shrink-0"
                      style={{ background: "rgba(245,158,11,0.15)" }}
                    >
                      <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">
                        Ghi chú khách hàng
                      </div>
                      <p className="text-[11px] sm:text-xs lg:text-sm font-medium italic text-white/90 break-words">
                        "{selectedAttempt.transferNote || "Không có ghi chú"}"
                      </p>
                    </div>
                  </div>

                  {/* Admin Feedback Card */}
                  {(selectedAttempt.status === "MATCHED" || selectedAttempt.status === "REJECTED") && 
                   (selectedAttempt.reviewedAt || selectedAttempt.rejectReason) && (
                    <div className={`mb-4 sm:mb-6 lg:mb-8 p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-[1.5rem] lg:rounded-[2rem] flex gap-2 sm:gap-3 lg:gap-4 ${
                      selectedAttempt.status === "MATCHED"
                        ? "bg-emerald-50/5 border border-emerald-500/20"
                        : "bg-rose-50/5 border border-rose-500/20"
                    }`}>
                      <div className={`p-2 sm:p-2.5 lg:p-3 rounded-2xl sm:rounded-3xl h-fit shrink-0 ${
                        selectedAttempt.status === "MATCHED" ? "bg-emerald-500/15" : "bg-rose-500/15"
                      }`}>
                        {selectedAttempt.status === "MATCHED" ? (
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-emerald-400" />
                        ) : (
                          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-rose-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1.5 sm:mb-2 ${
                          selectedAttempt.status === "MATCHED" ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          GHI CHÚ CỦA QUẢN TRỊ VIÊN
                        </div>
                        <p className="text-[11px] sm:text-xs lg:text-sm font-medium text-white/90 break-words mb-2 sm:mb-3">
                          {selectedAttempt.status === "MATCHED" 
                            ? (detailOrder?.paymentNote || "Không có ghi chú")
                            : (selectedAttempt.rejectReason || "Không có ghi chú")}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[9px] sm:text-[10px] font-bold text-white/50">
                          {selectedAttempt.reviewedByAdminName && (
                            <span>Người xử lý: {selectedAttempt.reviewedByAdminName}</span>
                          )}
                          {!selectedAttempt.reviewedByAdminName && selectedAttempt.reviewedByAdminId && (
                            <span>Người xử lý: Admin #{selectedAttempt.reviewedByAdminId}</span>
                          )}
                          {selectedAttempt.reviewedAt && (
                            <span>Thời gian: {formatDate(selectedAttempt.reviewedAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-4 sm:mb-6 lg:mb-8">
                    <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/70 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                      <History className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Lịch sử giao dịch
                    </h4>
                    <PaymentTimeline logs={attemptLogs} />
                  </div>

                  <div className="mt-auto pt-4 sm:pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <button
                      onClick={() => handleDeleteOne(selectedAttempt.attemptId)}
                      disabled={deleting}
                      className="w-full h-12 sm:h-14 lg:h-16 rounded-2xl sm:rounded-3xl bg-rose-600 text-white text-sm sm:text-base font-black hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 animate-spin" /> : <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />}
                      XÓA VĨNH VIỄN BILL NÀY
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
