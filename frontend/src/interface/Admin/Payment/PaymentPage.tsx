"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  adminManualPaymentService,
  type PaymentAttempt,
  type PaymentLog
} from "@/services/adminManualPaymentService";
import { orderService, type OrderDto } from "@/services/orderService";
import { translatePaymentStatus, translatePaymentAttemptStatus } from "@/services/paymentStatusLabels";
import {
  Check, X, Eye, Loader2, Image as ImageIcon,
  History, CheckCircle2,
  Lock, Unlock,
  AlertTriangle, Info, User, Zap,
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
  return new Date(iso).toLocaleString("vi-VN");
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

const LockStatus = ({ attempt, currentAdminId }: { attempt: PaymentAttempt; currentAdminId: number }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!attempt.lockExpiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(attempt.lockExpiresAt!).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [attempt.lockExpiresAt]);

  if (!attempt.processingByAdminId || timeLeft <= 0) return null;

  const isMe = attempt.processingByAdminId === currentAdminId;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[10px] font-bold border ${
      isMe
        ? "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20"
        : "bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800"
    }`}>
      <Lock className="h-3 w-3" />
      {isMe
        ? "Bạn đang xử lý"
        : `${attempt.processingByAdminName || `Quản trị viên #${attempt.processingByAdminId}`} đang xử lý`}
      <span className="opacity-60 ml-1">
        ({Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")})
      </span>
    </div>
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
      case "LOCK_PROCESS":
      case "LOCK":
        return { label: "KHÓA XỬ LÝ", color: "text-amber-600", bg: "bg-amber-500", icon: Lock };
      case "RELEASE_LOCK":
        return { label: "MỞ KHÓA", color: "text-slate-600", bg: "bg-slate-500", icon: Unlock };
      case "VIEW_BILL":
        return { label: "XEM MINH CHỨNG", color: "text-indigo-600", bg: "bg-indigo-500", icon: Eye };
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
                className="mt-1 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10 group-hover:ring-indigo-400/30 transition-all"
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

export default function PaymentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState(1);
  const [currentAdminRole, setCurrentAdminRole] = useState<string>("STAFF");
  const PAYMENT_APPROVE_THRESHOLD = 5000000;
  const [attemptStatusFilter, setAttemptStatusFilter] = useState<"WAITING_CONFIRM" | "MATCHED" | "REJECTED">("WAITING_CONFIRM");

  // Data
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [trashCount, setTrashCount] = useState<number>(0);

  // Selected state
  const [selectedAttempt, setSelectedAttempt] = useState<PaymentAttempt | null>(null);
  const [detailOrder, setDetailOrder] = useState<OrderDto | null>(null);
  const [attemptLogs, setAttemptLogs] = useState<PaymentLog[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

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

  const fetchData = useCallback(
    async (silent = false, customFilter?: string) => {
      if (!silent) setLoading(true);
      try {
        const filterToUse = customFilter || attemptStatusFilter;
        const [attemptRes, orderTrash] = await Promise.all([
          adminManualPaymentService.getAttempts(filterToUse === "WAITING_CONFIRM" ? undefined : filterToUse),
          orderService.getTrash().catch(() => []),
        ]);
        setAttempts(attemptRes);
        setTrashCount(orderTrash.length);
      } catch (err: any) {
        setError(err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [attemptStatusFilter]
  );

  useEffect(() => {
    fetchData();
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentAdminId(Number(user.adminId || user.id || 1));
      let role = "STAFF";
      if (user.role && typeof user.role === "string") role = user.role;
      else if (user.role && typeof user.role.roleName === "string") role = user.role.roleName;
      else if (user.roleName && typeof user.roleName === "string") role = user.roleName;
      setCurrentAdminRole(role);
    }
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleFilterChange = (filter: "WAITING_CONFIRM" | "MATCHED" | "REJECTED") => {
    setAttemptStatusFilter(filter);
    fetchData(false, filter);
  };

  const handleOpenDetail = async (attempt: PaymentAttempt) => {
    setSelectedAttempt(attempt);
    setDetailOrder(null);
    setAttemptLogs([]);
    setAdminNote("");
    setShowDetailModal(true);
    try {
      adminManualPaymentService.logView(attempt.attemptId, currentAdminId);
      const [logs, order] = await Promise.all([
        adminManualPaymentService.getLogs(attempt.orderId),
        orderService.getById(attempt.orderId),
      ]);
      setAttemptLogs(logs);
      setDetailOrder(order);
    } catch (e) {
      console.error("Failed to fetch logs or order", e);
    }
  };

  const handleLock = async (attemptId: number) => {
    try {
      await adminManualPaymentService.lock(attemptId, currentAdminId);
      await fetchData(true);
      if (selectedAttempt && selectedAttempt.attemptId === attemptId) {
        // Sau khi lock, status đổi sang PROCESSING — fetch không filter để tìm được
        const updated = await adminManualPaymentService.getAttempts();
        const match = updated.find((a) => a.attemptId === attemptId);
        if (match) setSelectedAttempt(match);
      }
    } catch (err: any) {
      showStatus("Lỗi", err.message, "error");
    }
  };

  const handleRelease = async (attemptId: number) => {
    try {
      await adminManualPaymentService.release(attemptId, currentAdminId);
      await fetchData(true);
      if (selectedAttempt && selectedAttempt.attemptId === attemptId) {
        // Sau khi release, status trở về WAITING_CONFIRM — fetch không filter
        const updated = await adminManualPaymentService.getAttempts();
        const match = updated.find((a) => a.attemptId === attemptId);
        if (match) setSelectedAttempt(match);
      }
    } catch (err: any) {
      showStatus("Lỗi", err.message, "error");
    }
  };

  const handleApprove = async () => {
    if (!selectedAttempt) return;
    showConfirm(
      "Duyệt thanh toán",
      "Xác nhận duyệt thanh toán cho đơn hàng này?",
      async () => { await runApprove(); },
      "info"
    );
  };

  const runApprove = async () => {
    if (!selectedAttempt) return;
    setProcessing(true);
    try {
      await adminManualPaymentService.approve(selectedAttempt.attemptId, currentAdminId, adminNote);
      setShowDetailModal(false);
      setDetailOrder(null);
      setAdminNote("");
      fetchData();
      showStatus("Thành công", "Đã duyệt thanh toán.", "success");
    } catch (err: any) {
      showStatus("Lỗi", err.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAttempt) return;
    const reason = adminNote || "Bị từ chối bởi quản trị viên (không có lý do cụ thể)";
    showConfirm(
      "Từ chối thanh toán",
      "Xác nhận từ chối thanh toán này?",
      async () => { await runReject(reason); },
      "danger"
    );
  };

  const runReject = async (reason: string) => {
    if (!selectedAttempt) return;
    setProcessing(true);
    try {
      await adminManualPaymentService.reject(selectedAttempt.attemptId, currentAdminId, reason);
      setShowDetailModal(false);
      setDetailOrder(null);
      setAdminNote("");
      fetchData();
      showStatus("Thành công", "Đã từ chối thanh toán.", "success");
    } catch (err: any) {
      showStatus("Lỗi", err.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Thanh toán
          </div>
          <h1 className="mt-2 text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Hệ thống Thanh toán</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Xử lý minh chứng thanh toán từ khách hàng.</p>
        </div>

        <div className="flex flex-row flex-wrap gap-2 sm:items-center">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 sm:px-4 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/70 transition-all hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10 whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Làm mới
          </button>

          <Link
            href="/payments/trash"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2 sm:px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-500 active:translate-y-0 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-400/20 dark:hover:bg-emerald-500/20 whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 16h10l1-16" />
            </svg>
            Thùng rác
            {trashCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-black">
                {trashCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 sm:gap-3">
            <div className="rounded-xl p-2 bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
              <ImageIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="truncate">
            {attemptStatusFilter === "WAITING_CONFIRM"
              ? "Hàng đợi xử lý"
              : attemptStatusFilter === "MATCHED"
              ? "Đã duyệt"
              : "Đã từ chối"}
            </span>
            <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
            {attempts.length > 0 && (
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-[10px] font-black bg-indigo-600 text-white shrink-0">
                {attempts.length}
              </span>
            )}
          </h3>

          {/* Status Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mb-2">
            {(["WAITING_CONFIRM", "MATCHED", "REJECTED"] as const).map((f) => (
              <button key={f} onClick={() => handleFilterChange(f)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all shrink-0 ${
                  attemptStatusFilter === f
                    ? f === "WAITING_CONFIRM"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                      : f === "MATCHED"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                      : "bg-rose-600 text-white shadow-md shadow-rose-500/25"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  attemptStatusFilter === f ? "bg-white" :
                  f === "WAITING_CONFIRM" ? "bg-amber-400" :
                  f === "MATCHED" ? "bg-emerald-400" : "bg-rose-400"
                }`} />
                {f === "WAITING_CONFIRM" ? "Chờ xử lý" : f === "MATCHED" ? "Đã duyệt" : "Từ chối"}
              </button>
            ))}
          </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm" style={{ minWidth: "640px" }}>
            <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 sm:px-8 py-4 sm:py-5 text-center">Đơn hàng</th>
                <th className="px-4 sm:px-8 py-4 sm:py-5 text-center">Giá trị</th>
                <th className="px-4 sm:px-8 py-4 sm:py-5 text-center">Rủi ro</th>
                <th className="px-4 sm:px-8 py-4 sm:py-5 text-center">Trạng thái</th>
                <th className="px-4 sm:px-8 py-4 sm:py-5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-400" />
                  </td>
                </tr>
              ) : attempts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center opacity-30 font-black">
                    KHÔNG CÓ DỮ LIỆU PHÙ HỢP
                  </td>
                </tr>
              ) : (
                attempts.map((a) => (
                  <tr
                    key={a.attemptId}
                    className={`group transition-colors hover:bg-slate-100/70 dark:hover:bg-white/[0.06] ${
                      a.processingByAdminId ? "bg-indigo-50/30 dark:bg-indigo-500/10" : ""
                    }`}
                  >
                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                      <div className="font-black text-slate-900 dark:text-white">ĐH-{a.orderId}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{formatDate(a.createdAt)}</div>
                    </td>
                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-center font-black text-indigo-600 text-sm sm:text-lg whitespace-nowrap">{formatVnd(a.amount)}</td>
                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                      <div className="flex justify-center">
                        <RiskBadge level={a.riskLevel} />
                      </div>
                    </td>
                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {translatePaymentAttemptStatus(a.status)}
                      </div>
                      <div className="mt-1 sm:mt-2 flex justify-center">
                        <LockStatus attempt={a} currentAdminId={currentAdminId} />
                      </div>
                    </td>
                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleOpenDetail(a)}
                          className="inline-flex cursor-pointer items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-2xl bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:ring-cyan-400/15 dark:hover:shadow-black/30"
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          {a.status === "WAITING_CONFIRM" || a.status === "PROCESSING" ? "Xử lý" : "Xem"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showDetailModal && selectedAttempt && (
              <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowDetailModal(false)}
                  className="absolute inset-0"
                  style={{
                    backgroundColor: "rgba(15,23,42,0.8)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative w-full max-w-6xl rounded-[2rem] sm:rounded-[3rem] flex flex-col lg:flex-row max-h-[90vh]"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    boxShadow: "0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                  }}
                >
                  {/* Left panel: Image - hidden on mobile, shown on lg+ */}
                  <div
                    className="hidden lg:flex lg:w-1/2 p-8 flex-col items-center justify-center overflow-y-auto rounded-l-[3rem]"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      borderRight: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div className="mb-6 flex items-center justify-between w-full px-4">
                      <div className="text-xs font-black uppercase tracking-widest text-white/80">
                        Minh chứng từ khách hàng
                      </div>
                      <RiskBadge level={selectedAttempt.riskLevel} />
                    </div>
                    <div
                      className="relative group rounded-[2.5rem] shadow-2xl overflow-hidden"
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

                  {/* Right panel: Info + Actions */}
                  <div className="flex-1 flex flex-col overflow-hidden rounded-[2rem] sm:rounded-[3rem] lg:rounded-l-none lg:rounded-r-[3rem]">
                    {/* Sticky header */}
                    <div
                      className="flex items-center justify-between px-4 sm:px-10 py-4 sm:py-6 shrink-0"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(15,23,42,0.4)",
                      }}
                    >
                      <div>
                        <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white">Xử lý phê duyệt</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs sm:text-sm font-bold text-white/70">Đơn hàng:</span>
                          <span className="text-xs sm:text-sm font-black text-indigo-400">ĐH-{selectedAttempt.orderId}</span>
                          <RiskBadge level={selectedAttempt.riskLevel} />
                        </div>
                      </div>
                      <button
                        onClick={() => setShowDetailModal(false)}
                        className="p-2 rounded-full transition-all text-white/70 hover:text-white hover:bg-rose-500 active:bg-rose-600 shrink-0"
                        style={{
                          background: "rgba(255,255,255,0.12)",
                          border: "1px solid rgba(255,255,255,0.2)",
                        }}
                        title="Đóng"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-10 flex flex-col">
                      {/* Mobile: show proof image inline */}
                      {selectedAttempt.transferImageUrl && (
                        <div className="lg:hidden mb-4 flex flex-col items-center">
                          <div
                            className="rounded-2xl overflow-hidden shadow-xl"
                            style={{ border: "2px solid rgba(255,255,255,0.15)", maxWidth: "100%" }}
                          >
                            <img
                              src={selectedAttempt.transferImageUrl}
                              className="block w-full"
                              style={{ maxHeight: "40vh", objectFit: "contain" }}
                              alt="Minh chứng"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid gap-3 sm:gap-4 grid-cols-2 mb-6 sm:mb-8">
                        <div
                          className="p-3 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem]"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <div className="text-[10px] font-black uppercase tracking-widest text-white/70">
                            Số tiền khớp lệnh
                          </div>
                          <div className="mt-1 text-base sm:text-2xl font-black text-indigo-400 break-words">
                            {formatVnd(selectedAttempt.amount)}
                          </div>
                        </div>
                        <div
                          className="p-3 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem]"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <div className="text-[10px] font-black uppercase tracking-widest text-white/70">
                            Gửi lúc
                          </div>
                          <div className="mt-1 text-xs sm:text-lg font-black text-white break-words">
                            {formatDate(selectedAttempt.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div
                        className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex gap-3 sm:gap-4"
                        style={{
                          background: "rgba(245,158,11,0.08)",
                          border: "1px solid rgba(245,158,11,0.2)",
                        }}
                      >
                        <div
                          className="p-2 sm:p-3 rounded-2xl h-fit shrink-0"
                          style={{ background: "rgba(245,158,11,0.15)" }}
                        >
                          <Info className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">
                            Ghi chú khách hàng
                          </div>
                          <p className="text-xs sm:text-sm font-medium italic text-white/90 break-words">
                            "{selectedAttempt.transferNote || "Không có ghi chú"}"
                          </p>
                        </div>
                      </div>

                      <div className="mb-6 sm:mb-8">
                        <h4 className="text-xs font-black uppercase tracking-widest text-white/70 mb-4 flex items-center gap-2">
                          <History className="h-3.5 w-3.5" /> Lịch sử giao dịch
                        </h4>
                        <PaymentTimeline logs={attemptLogs} />
                      </div>

                      <div
                        className="mt-auto space-y-6 pt-6"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        {/* Read-only status for processed attempts */}
                        {(selectedAttempt.status === "MATCHED" || selectedAttempt.status === "REJECTED") && (
                          <div
                            className={`p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border flex gap-3 sm:gap-4 items-start sm:items-center ${
                              selectedAttempt.status === "MATCHED"
                                ? "bg-emerald-50/50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400"
                                : "bg-rose-50/50 border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400"
                            }`}
                          >
                            <div
                              className={`p-2 sm:p-3 rounded-2xl shrink-0 ${
                                selectedAttempt.status === "MATCHED"
                                  ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
                                  : "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {selectedAttempt.status === "MATCHED" ? (
                                <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                              ) : (
                                <X className="h-4 w-4 sm:h-5 sm:w-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-black uppercase tracking-widest mb-1">
                                {selectedAttempt.status === "MATCHED"
                                  ? "GIAO DỊCH ĐÃ ĐƯỢC DUYỆT"
                                  : "GIAO DỊCH ĐÃ BỊ TỪ CHỐI"}
                              </div>
                              <p className="text-xs font-bold leading-relaxed opacity-90 break-words">
                                {selectedAttempt.status === "MATCHED"
                                  ? "Minh chứng thanh toán này đã được duyệt thành công. Đơn hàng đã chuyển sang trạng thái đã thanh toán."
                                  : "Minh chứng này không hợp lệ và đã bị từ chối. Đơn hàng liên quan đã được hủy."}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Note input (only when locked by current admin) */}
                        {(selectedAttempt.status === "WAITING_CONFIRM" ||
                          selectedAttempt.status === "PROCESSING") &&
                          selectedAttempt.processingByAdminId &&
                          Number(selectedAttempt.processingByAdminId) === Number(currentAdminId) &&
                          (!selectedAttempt.lockExpiresAt ||
                            new Date(selectedAttempt.lockExpiresAt).getTime() > Date.now()) && (
                            <div className="space-y-3">
                              {/* Timer hiển thị trong modal */}
                              <div className="flex items-center justify-between">
                                <LockStatus attempt={selectedAttempt} currentAdminId={currentAdminId} />
                              </div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-white/50">
                                Ghi chú xử lý / Lý do từ chối
                              </div>
                              <textarea
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                placeholder="Nhập lý do nếu từ chối hoặc ghi chú phê duyệt..."
                                className="w-full h-24 rounded-3xl p-5 text-sm font-medium border-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner text-white/85 placeholder:text-white/30"
                                style={{ background: "rgba(255,255,255,0.06)" }}
                              />
                            </div>
                          )}

                        {/* Action buttons */}
                        {(selectedAttempt.status === "WAITING_CONFIRM" ||
                          selectedAttempt.status === "PROCESSING") &&
                          (() => {
                            const isStaffRestricted =
                              currentAdminRole === "STAFF" &&
                              (selectedAttempt.amount >= PAYMENT_APPROVE_THRESHOLD ||
                                selectedAttempt.riskLevel === "HIGH" ||
                                selectedAttempt.isSuspicious);

                            return (
                              <>
                                {isStaffRestricted && (
                                  <div
                                    className="mb-4 sm:mb-6 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex gap-3 sm:gap-4 items-start"
                                    style={{
                                      background: "rgba(220,38,38,0.1)",
                                      border: "1px solid rgba(220,38,38,0.2)",
                                    }}
                                  >
                                    <div
                                      className="p-2 sm:p-3 rounded-2xl h-fit shrink-0"
                                      style={{ background: "rgba(220,38,38,0.15)" }}
                                    >
                                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-400" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs font-black uppercase tracking-widest text-rose-400 mb-1">
                                        HẠN CHẾ QUYỀN HẠN
                                      </div>
                                      <p className="text-xs sm:text-sm font-bold text-white/75 leading-relaxed break-words">
                                        Giao dịch vượt quá hạn mức xử lý của Nhân viên (tối đa 5.000.000đ) hoặc có mức độ rủi ro cao. Vui lòng chuyển quyền phê duyệt cho Quản trị viên (Admin).
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {selectedAttempt.processingByAdminId &&
                                Number(selectedAttempt.processingByAdminId) === Number(currentAdminId) &&
                                (!selectedAttempt.lockExpiresAt ||
                                  new Date(selectedAttempt.lockExpiresAt).getTime() > Date.now()) ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <button
                                      onClick={handleApprove}
                                      disabled={processing || isStaffRestricted}
                                      className="h-14 sm:h-16 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm sm:text-base"
                                    >
                                      {processing ? (
                                        <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                                      ) : (
                                        <Check className="h-5 w-5 sm:h-6 sm:w-6" />
                                      )}{" "}
                                      DUYỆT THANH TOÁN
                                    </button>
                                    <button
                                      onClick={handleReject}
                                      disabled={processing || isStaffRestricted}
                                      className="h-14 sm:h-16 rounded-2xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-rose-400 whitespace-nowrap text-sm sm:text-base"
                                      style={{
                                        background: "rgba(220,38,38,0.12)",
                                        border: "1px solid rgba(220,38,38,0.25)",
                                      }}
                                    >
                                      {processing ? (
                                        <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                                      ) : (
                                        <X className="h-5 w-5 sm:h-6 sm:w-6" />
                                      )}{" "}
                                      TỪ CHỐI & HỦY ĐƠN
                                    </button>
                                    <button
                                      onClick={() => handleRelease(selectedAttempt.attemptId)}
                                      disabled={processing}
                                      className="sm:col-span-2 h-12 sm:h-14 rounded-2xl font-black transition-all flex items-center justify-center gap-2 text-white/60 hover:text-white/85 whitespace-nowrap text-sm"
                                      style={{
                                        background: "rgba(255,255,255,0.06)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                      }}
                                    >
                                      <Unlock className="h-4 w-4 sm:h-5 sm:w-5" /> MỞ KHÓA (DỪNG XỬ LÝ)
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleLock(selectedAttempt.attemptId)}
                                    disabled={
                                      processing ||
                                      isStaffRestricted ||
                                      (selectedAttempt.processingByAdminId !== null &&
                                        Number(selectedAttempt.processingByAdminId) !== Number(currentAdminId) &&
                                        (!selectedAttempt.lockExpiresAt ||
                                          new Date(selectedAttempt.lockExpiresAt).getTime() > Date.now()))
                                    }
                                    className={`w-full h-14 sm:h-16 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 transition-all whitespace-nowrap text-sm sm:text-base ${
                                      isStaffRestricted
                                        ? "cursor-not-allowed opacity-50 text-rose-400"
                                        : selectedAttempt.processingByAdminId !== null &&
                                          Number(selectedAttempt.processingByAdminId) !== Number(currentAdminId) &&
                                          (!selectedAttempt.lockExpiresAt ||
                                            new Date(selectedAttempt.lockExpiresAt).getTime() > Date.now())
                                        ? "cursor-not-allowed opacity-50 text-white/50"
                                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20"
                                    }`}
                                  >
                                    <Lock className="h-5 w-5" />
                                    {isStaffRestricted
                                      ? "VƯỢT HẠN MỨC - YÊU CẦU QUYỀN ADMIN"
                                      : selectedAttempt.processingByAdminId !== null &&
                                        Number(selectedAttempt.processingByAdminId) !== Number(currentAdminId) &&
                                        (!selectedAttempt.lockExpiresAt ||
                                          new Date(selectedAttempt.lockExpiresAt).getTime() > Date.now())
                                      ? "ĐANG CÓ NGƯỜI XỬ LÝ"
                                      : "BẮT ĐẦU XỬ LÝ (KHÓA LẠI)"}
                                  </button>
                                )}
                              </>
                            );
                          })()}

                        {/* Quick refresh */}
                        <div className="flex gap-4">
                          <button
                            onClick={async () => {
                              const filterToUse =
                                attemptStatusFilter === "WAITING_CONFIRM" ? undefined : attemptStatusFilter;
                              const updated = await adminManualPaymentService.getAttempts(filterToUse);
                              const match = updated.find((a) => a.attemptId === selectedAttempt.attemptId);
                              if (match) setSelectedAttempt(match);
                              fetchData(true);
                            }}
                            className="flex-1 h-16 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 text-white/70 hover:text-white"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.1)",
                            }}
                            title="Làm mới trạng thái"
                          >
                            <History className="h-6 w-6" /> LÀM MỚI
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      <StatusModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
    </motion.div>
  );
}
