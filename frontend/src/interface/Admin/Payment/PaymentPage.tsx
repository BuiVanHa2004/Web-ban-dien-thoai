"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  adminManualPaymentService,
  type PaymentAttempt,
  type PaymentLog
} from "@/services/adminManualPaymentService";
import {
  adminBankTransactionService,
  type BankTransactionDto,
  type SelectableOrderDto
} from "@/services/adminBankTransactionService";
import { orderService, type OrderDto } from "@/services/orderService";
import { translatePaymentStatus, translatePaymentAttemptStatus } from "@/services/paymentStatusLabels";
import {
  Check, X, Eye, Loader2, Image as ImageIcon,
  Search, AlertCircle, History,
  Layers, CheckCircle2, ShieldCheck,
  Plus, ChevronDown, Clock, Lock, Unlock,
  AlertTriangle, Info, User, Zap, Filter, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
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

const LockStatus = ({ attempt, currentAdminId }: { attempt: PaymentAttempt, currentAdminId: number }) => {
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
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[10px] font-bold border ${isMe ? "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20" : "bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800"
      }`}>
      <Lock className="h-3 w-3" />
      {isMe ? "Bạn đang xử lý" : `${attempt.processingByAdminName || `Quản trị viên #${attempt.processingByAdminId}`} đang xử lý`}
      <span className="opacity-60 ml-1">({Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')})</span>
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
      case "AUTO_MATCH":
        return { label: "KHỚP TỰ ĐỘNG", color: "text-blue-600", bg: "bg-blue-500", icon: Check };
      case "MANUAL_MATCH":
        return { label: "KHỚP THỦ CÔNG", color: "text-indigo-600", bg: "bg-indigo-500", icon: Check };
      default:
        return { label: type, color: "text-slate-600", bg: "bg-slate-500", icon: Info };
    }
  };

  if (logs.length === 0) return (
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
            {/* Timeline Line */}
            {!isLast && (
              <div className="absolute left-[11px] top-6 h-full w-[2px] bg-slate-100 group-hover:bg-indigo-100 transition-colors dark:bg-slate-800" />
            )}

            {/* Timeline Dot & Icon */}
            <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${config.bg}`}>
              <Icon className="h-3 w-3" />
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col pb-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  {formatDate(log.createdAt)}
                </span>
              </div>

              <div className="mt-1 rounded-2xl bg-slate-50/50 p-3 ring-1 ring-slate-100 group-hover:ring-indigo-100 transition-all dark:bg-white/5 dark:ring-white/5">
                <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                  {log.note || "Không có nội dung chi tiết"}
                </p>
                {(log.oldStatus || log.newStatus) ? (
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {translatePaymentStatus(log.oldStatus)} → {translatePaymentStatus(log.newStatus)}
                  </p>
                ) : null}

                <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2 dark:border-white/5">
                  {log.adminId ? (
                    <>
                      <div className="h-4 w-4 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 dark:bg-indigo-900/30">
                        <User className="h-2.5 w-2.5" />
                      </div>
                      <span className="text-[9px] font-black text-slate-500 tracking-tighter">
                        {log.adminName || (log.adminId === 0 ? "Hệ thống" : `Quản trị viên #${log.adminId}`)}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-4 w-4 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 dark:bg-purple-900/30">
                        <User className="h-2.5 w-2.5" />
                      </div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"manual" | "matching">("manual");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState(1);
  const [currentAdminRole, setCurrentAdminRole] = useState<string>("STAFF");
  const PAYMENT_APPROVE_THRESHOLD = 5000000;
  const [attemptStatusFilter, setAttemptStatusFilter] = useState<"WAITING_CONFIRM" | "MATCHED" | "REJECTED">("WAITING_CONFIRM");

  // Data
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [transactions, setTransactions] = useState<BankTransactionDto[]>([]);
  const [selectableOrders, setSelectableOrders] = useState<SelectableOrderDto[]>([]);
  const [trashCount, setTrashCount] = useState<number>(0);

  // Selected state
  const [selectedAttempt, setSelectedAttempt] = useState<PaymentAttempt | null>(null);
  const [detailOrder, setDetailOrder] = useState<OrderDto | null>(null);
  const [attemptLogs, setAttemptLogs] = useState<PaymentLog[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  // Tab Matching state
  const [manualSelection, setManualSelection] = useState<Record<number, number>>({});
  const [newTx, setNewTx] = useState({
    transactionCode: "",
    amount: "",
    transferContent: "",
    orderId: null as number | null,
    adminNote: "",
  });
  const [openDropdown, setOpenDropdown] = useState<null | "order" | number>(null);

  // Status Modal State
  const [modalConfig, setModalConfig] = useState<{
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

  // Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    type: "warning",
  });

  const showStatus = (title: string, message: string, type: ModalType = "info") => {
    setModalConfig({ isOpen: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: "danger" | "warning" | "info" = "warning") => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, type });
  };

  const getLockingAdmin = (orderId: number) => {
    const lockAttempt = attempts.find(
      (a) =>
        a.orderId === orderId &&
        a.processingByAdminId &&
        Number(a.processingByAdminId) !== Number(currentAdminId) &&
        (!a.lockExpiresAt || new Date(a.lockExpiresAt).getTime() > Date.now())
    );
    return lockAttempt ? (lockAttempt.processingByAdminName || `Quản trị viên #${lockAttempt.processingByAdminId}`) : null;
  };
  const filteredSelectableOrders = selectableOrders.filter(o => {
    // Phải là thanh toán Banking (BANK_TRANSFER)
    if (o.paymentMethod !== "BANK_TRANSFER") return false;
    
    // Loại bỏ các đơn hàng đã hoàn tất, đang giao hoặc bị hủy
    if (o.orderStatus === "CANCELLED" || o.orderStatus === "DELIVERED" || o.orderStatus === "SHIPPING") return false;
    if (o.paymentStatus === "PAID" || o.paymentStatus === "FAILED") return false;

    // Chỉ lấy các đơn hàng đang chờ thanh toán hoặc chờ xác nhận
    const isWaitingConfirm = o.orderStatus === "WAITING_CONFIRMATION" || o.orderStatus === "PENDING_CONFIRM" || o.orderStatus === "PENDING_PAYMENT_CONFIRMATION";
    const isPendingPayment = o.paymentStatus === "UNPAID" || o.paymentStatus === "PENDING" || o.paymentStatus === "PENDING_PAYMENT_CONFIRMATION" || o.paymentStatus === "WAITING_CONFIRM";
    
    return isWaitingConfirm || isPendingPayment;
  });

  const fetchData = useCallback(async (silent = false, customFilter?: string) => {
    if (!silent) setLoading(true);
    try {
      const filterToUse = customFilter || attemptStatusFilter;
      const [attemptRes, txs, orders, orderTrash, txTrash] = await Promise.all([
        adminManualPaymentService.getAttempts(filterToUse === "WAITING_CONFIRM" ? undefined : filterToUse),
        adminBankTransactionService.getAll(),
        adminBankTransactionService.getSelectableOrders(),
        orderService.getTrash().catch(() => []),
        adminBankTransactionService.getAll(undefined, true).catch(() => [])
      ]);
      setAttempts(attemptRes);
      setTransactions(txs);
      // Backend already filters for BANK_TRANSFER and Banking
      setSelectableOrders(orders);
      setTrashCount(orderTrash.length + txTrash.length);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [attemptStatusFilter]);

  useEffect(() => {
    fetchData();
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentAdminId(Number(user.adminId || user.id || 1));
      
      let role = "STAFF";
      if (user.role && typeof user.role === 'string') role = user.role;
      else if (user.role && typeof user.role.roleName === 'string') role = user.role.roleName;
      else if (user.roleName && typeof user.roleName === 'string') role = user.roleName;
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
      // Update selectedAttempt if it's currently open
      if (selectedAttempt && selectedAttempt.attemptId === attemptId) {
        const updated = await adminManualPaymentService.getAttempts("WAITING_CONFIRM");
        const match = updated.find(a => a.attemptId === attemptId);
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
        const updated = await adminManualPaymentService.getAttempts("WAITING_CONFIRM");
        const match = updated.find(a => a.attemptId === attemptId);
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
      async () => {
        await runApprove();
      },
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
      async () => {
        await runReject(reason);
      },
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

  const handleAutoMatch = async () => {
    setProcessing(true);
    try {
      const results = await adminBankTransactionService.autoMatch();
      if (results.length > 0) {
        showStatus("Thành công", `Đã tự động khớp thành công ${results.length} giao dịch!`, "success");
      } else {
        showStatus("Thông báo", "Không tìm thấy giao dịch nào khớp với đơn hàng hiện có.", "info");
      }
      fetchData();
    } catch (err: any) {
      showStatus("Lỗi", err.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleManualMatch = async (txId: number) => {
    const tx = transactions.find(t => t.transactionId === txId);
    const orderId = manualSelection[txId] || tx?.matchedOrderId;
    if (!orderId) return showStatus("Lưu ý", "Vui lòng chọn đơn hàng.", "warning");

    const lockAdmin = getLockingAdmin(orderId);
    if (lockAdmin) {
      showStatus("Đang bị khóa", `Giao dịch này admin ${lockAdmin} đang xử lý`, "warning");
      return;
    }

    try {
      await adminBankTransactionService.confirmMatch(txId, Number(orderId), currentAdminId);
      showStatus("Thành công", "Khớp giao dịch thành công!", "success");
      setOpenDropdown(null);
      setManualSelection(prev => {
        const next = { ...prev };
        delete next[txId];
        return next;
      });
      fetchData();
    } catch (err: any) {
      showStatus("Lỗi", "Lỗi khi khớp giao dịch: " + err.message, "error");
    }
  };

  const handleRejectTx = async (txId: number) => {
    const tx = transactions.find(t => t.transactionId === txId);
    const orderId = tx?.matchedOrderId || manualSelection[txId];

    const executeReject = async () => {
      if (orderId) {
        const lockAdmin = getLockingAdmin(orderId);
        if (lockAdmin) {
          showStatus("Đang bị khóa", `Giao dịch này admin ${lockAdmin} đang xử lý`, "warning");
          return;
        }
      }

      try {
        const noteToUse = adminNote || "Giao dịch ngân hàng bị từ chối";

        // 1. Explicitly cancel the order if orderId exists
        if (orderId) {
          try {
            const reasons = await orderService.getAdminReasons();
            const defaultReason = reasons.find(r => r.allowInput) || reasons[0];
            await orderService.adminCancelOrder(orderId, {
              reasonId: defaultReason?.reasonId || 1,
              cancelNote: noteToUse
            });
          } catch (cancelErr) {
            console.error("Order cancellation failed or already cancelled", cancelErr);
          }
        }

        // 2. Reject the transaction
        await adminBankTransactionService.reject(txId, tx?.matchedOrderId ?? undefined, currentAdminId, noteToUse);
        showStatus("Thành công", "Đã từ chối giao dịch và hủy đơn hàng.", "success");
        setOpenDropdown(null);
        fetchData();
      } catch (err: any) {
        showStatus("Lỗi", "Lỗi khi từ chối giao dịch: " + err.message, "error");
      }
    };

    showConfirm("Xác nhận", "Xác nhận từ chối giao dịch này?", executeReject, "warning");
  };

  const handleCreateManualTx = async (action: 'match' | 'reject') => {
    if (!newTx.amount) return showStatus("Thiếu thông tin", "Vui lòng nhập số tiền.", "warning");

    if (newTx.orderId) {
      const lockAdmin = getLockingAdmin(newTx.orderId);
      if (lockAdmin) {
        showStatus("Đang bị khóa", `Giao dịch này admin ${lockAdmin} đang xử lý`, "warning");
        return;
      }
    }

    setProcessing(true);
    try {
      const created = await adminBankTransactionService.create({
        amount: Number(newTx.amount),
        transferContent: newTx.transferContent || `MANUAL_TX_${Date.now()}`,
        transactionCode: newTx.transactionCode.trim() || `MANUAL_${Date.now()}`
      });

      if (newTx.orderId) {
        try {
          if (action === 'match') {
            await adminBankTransactionService.confirmMatch(created.transactionId, newTx.orderId, currentAdminId, newTx.adminNote);
            showStatus("Thành công", "Đã tạo và khớp giao dịch thành công!", "success");
          } else {
            // Explicitly cancel order for rejection
            try {
              const reasons = await orderService.getAdminReasons();
              const defaultReason = reasons.find(r => r.allowInput) || reasons[0];
              await orderService.adminCancelOrder(newTx.orderId, {
                reasonId: defaultReason?.reasonId || 1,
                cancelNote: newTx.adminNote || "Giao dịch bị từ chối thủ công"
              });
            } catch (cancelErr) {
              console.error("Order cancellation failed or already cancelled", cancelErr);
            }

            await adminBankTransactionService.reject(created.transactionId, newTx.orderId, currentAdminId, newTx.adminNote);
            showStatus("Thành công", "Đã tạo và từ chối giao dịch, đơn hàng đã được hủy!", "success");
          }
        } catch (matchErr: any) {
          showStatus("Lưu ý", `Giao dịch đã tạo (Mã: ${created.transactionCode}) nhưng KHÔNG THỂ THỰC HIỆN THAO TÁC: ${matchErr.message}`, "warning");
        }
      } else {
        showStatus("Thành công", "Đã tạo giao dịch thành công (chưa gắn đơn hàng)!", "success");
      }

      setNewTx({ transactionCode: "", amount: "", transferContent: "", orderId: null, adminNote: "" });
      fetchData();
    } catch (err: any) {
      showStatus("Lỗi", "Lỗi khi tạo giao dịch: " + err.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteTx = async (txId: number) => {
    const tx = transactions.find(t => t.transactionId === txId);
    if (tx && tx.reconcileStatus === "MATCHED") {
      showStatus("Không thể xóa", "Không thể xóa giao dịch đã Khớp lệnh", "warning");
      return;
    }

    const executeDelete = async () => {
      setProcessing(true);
      try {
        await adminBankTransactionService.delete(txId);
        showStatus("Thành công", "Đã xóa giao dịch thành công!", "success");
        fetchData();
      } catch (err: any) {
        showStatus("Lỗi", "Lỗi khi xóa giao dịch: " + err.message, "error");
      } finally {
        setProcessing(false);
      }
    };

    showConfirm("Xác nhận xóa", "Xác nhận xóa giao dịch ngân hàng này?", executeDelete, "danger");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Thanh toán
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Hệ thống Thanh toán</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Đối soát giao dịch khách hàng.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/70 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10"
          >
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200/70 transition-all duration-500 ease-out dark:bg-white/5 dark:ring-white/10 ${loading ? "animate-spin" : ""}`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </span>
            Làm mới
          </button>

          <Link
            href="/payments/trash"
            className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-600/20 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-md active:translate-y-0 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-400/20 dark:hover:bg-emerald-500/20 dark:hover:ring-emerald-400/30 dark:hover:shadow-black/30"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/15 transition-all duration-500 ease-out dark:bg-emerald-500/20 dark:ring-emerald-400/20">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M6 6l1 16h10l1-16" />
              </svg>
            </span>
            Thùng rác
            <span className="ml-1 inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white ring-1 ring-white/15 transition-all duration-500 ease-out dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-400/20">
              {trashCount}
            </span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-[2.5rem] bg-white p-2 shadow-xl shadow-slate-200/50 dark:bg-slate-900/50 dark:shadow-none ring-1 ring-slate-200/50 dark:ring-white/5">
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex flex-1 items-center justify-center gap-3 rounded-[2rem] py-5 text-sm font-black transition-all ${activeTab === "manual"
            ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/30"
            : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
            }`}
        >
          <div className={`rounded-xl p-1.5 ${activeTab === "manual" ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>
            <ImageIcon className="h-5 w-5" />
          </div>
          Minh chứng khách gửi (VietQR)
          {attempts.length > 0 && (
            <span className={`flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-[10px] font-black ${activeTab === "manual" ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
              }`}>
              {attempts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("matching")}
          className={`flex flex-1 items-center justify-center gap-3 rounded-[2rem] py-5 text-sm font-black transition-all ${activeTab === "matching"
            ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/30"
            : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
            }`}
        >
          <div className={`rounded-xl p-1.5 ${activeTab === "matching" ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>
            <Layers className="h-5 w-5" />
          </div>
          Đối soát giao dịch ngân hàng
        </button>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === "manual" ? (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                {attemptStatusFilter === "WAITING_CONFIRM" ? "Hàng đợi xử lý minh chứng" : attemptStatusFilter === "MATCHED" ? "Lịch sử đã duyệt thành công" : "Lịch sử đã từ chối"}
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </h3>

              {/* Status Filters */}
              <div className="flex gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800">
                <button
                  onClick={() => handleFilterChange("WAITING_CONFIRM")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    attemptStatusFilter === "WAITING_CONFIRM"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Chờ xử lý
                </button>
                <button
                  onClick={() => handleFilterChange("MATCHED")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    attemptStatusFilter === "MATCHED"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Đã duyệt
                </button>
                <button
                  onClick={() => handleFilterChange("REJECTED")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    attemptStatusFilter === "REJECTED"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Đã từ chối
                </button>
              </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm min-w-[900px]">
                <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-8 py-5">Đơn hàng</th>
                    <th className="px-8 py-5">Giá trị</th>
                    <th className="px-8 py-5">Rủi ro</th>
                    <th className="px-8 py-5">Trạng thái xử lý</th>
                    <th className="px-8 py-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attempts.length === 0 ? (
                    <tr><td colSpan={5} className="py-24 text-center opacity-30 font-black">KHÔNG CÓ DỮ LIỆU PHÙ HỢP</td></tr>
                  ) : (
                    attempts.map((a) => (
                      <tr key={a.attemptId} className={`group hover:bg-slate-50/80 transition-colors ${a.processingByAdminId ? "bg-indigo-50/30" : ""}`}>
                        <td className="px-8 py-6">
                          <div className="font-black text-slate-900 dark:text-white">ĐH-{a.orderId}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{formatDate(a.createdAt)}</div>
                        </td>
                        <td className="px-8 py-6 font-black text-indigo-600 text-lg">{formatVnd(a.amount)}</td>
                        <td className="px-8 py-6"><RiskBadge level={a.riskLevel} /></td>
                        <td className="px-8 py-6">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {translatePaymentAttemptStatus(a.status)}
                          </div>
                          <div className="mt-2">
                            <LockStatus attempt={a} currentAdminId={currentAdminId} />
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button
                            onClick={() => handleOpenDetail(a)}
                            className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:ring-cyan-400/15 dark:hover:shadow-black/30"
                          >
                            <Eye className="h-4 w-4" />
                            {a.status === "WAITING_CONFIRM" || a.status === "PROCESSING" ? "Xử lý" : "Xem chi tiết"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="matching"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Manual Input Form */}
              <div className="lg:col-span-2 rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Plus className="h-6 w-6 text-indigo-500" /> Nhập giao dịch thủ công</h3>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Chọn đơn hàng</label>
                    <div className="relative">
                      <div className="w-full h-14 rounded-2xl bg-slate-50 px-5 border-none ring-1 ring-slate-100 dark:bg-slate-800 flex items-center justify-between">
                        <button 
                          onClick={() => setOpenDropdown(openDropdown === "order" ? null : "order")} 
                          className="flex-1 text-left text-sm font-bold truncate h-full flex items-center"
                        >
                          {newTx.transferContent || "Chọn đơn hàng (Tùy chọn)"}
                        </button>
                        {newTx.orderId && (
                          <button 
                            onClick={() => setNewTx({ ...newTx, orderId: null, transferContent: "", amount: "" })}
                            className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors mr-1"
                            title="Xóa lựa chọn"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      </div>
                      {openDropdown === "order" && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-60 overflow-auto rounded-3xl bg-white shadow-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                          {filteredSelectableOrders.map(o => {
                            const lockAdmin = getLockingAdmin(o.orderId);
                            return (
                              <button
                                key={o.orderId}
                                onClick={() => {
                                  if (lockAdmin) {
                                    showStatus("Đang bị khóa", `Giao dịch này admin ${lockAdmin} đang xử lý`, "warning");
                                    return;
                                  }
                                  setNewTx({ ...newTx, transferContent: o.orderCode, amount: String(o.totalAmount), orderId: o.orderId });
                                  setOpenDropdown(null);
                                }}
                                className={`w-full p-4 text-left hover:bg-slate-50 flex flex-col gap-1 border-b last:border-0 dark:hover:bg-slate-800/50 ${lockAdmin ? "opacity-60 grayscale-[0.5]" : ""}`}
                              >
                                <div className="flex w-full justify-between items-center gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black">{o.orderCode}</span>
                                    {lockAdmin && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black border border-amber-200">
                                        <Lock className="h-2.5 w-2.5" /> {lockAdmin.split(' ').pop()}...
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-indigo-600 font-bold shrink-0">{formatVnd(o.totalAmount)}</span>
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                  {translatePaymentStatus(o.orderStatus)} · {translatePaymentStatus(o.paymentStatus)}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Mã GD *</label>
                    <input type="text" value={newTx.transactionCode} onChange={e => setNewTx({ ...newTx, transactionCode: e.target.value })} className="w-full h-14 rounded-2xl bg-slate-50 px-5 font-black text-indigo-600 border-none ring-1 ring-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Nhập mã giao dịch *" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Số tiền *</label>
                    <input type="number" value={newTx.amount} onChange={e => setNewTx({ ...newTx, amount: e.target.value })} className="w-full h-14 rounded-2xl bg-slate-50 px-5 font-black text-indigo-600 border-none ring-1 ring-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Số tiền" />
                  </div>
                  <div className="space-y-2 lg:col-span-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ghi chú chung của Admin (Sẽ hiển thị trong đơn hàng)</label>
                    <textarea
                      value={newTx.adminNote}
                      onChange={e => setNewTx({ ...newTx, adminNote: e.target.value })}
                      className="w-full h-24 rounded-2xl bg-slate-50 p-5 text-xs font-medium border-none ring-1 ring-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                      placeholder="Nhập ghi chú chung của admin..."
                    />
                  </div>
                  {(() => {
                    const isTxStaffRestricted = currentAdminRole === "STAFF" && (Number(newTx.amount) >= PAYMENT_APPROVE_THRESHOLD);
                    
                    return (
                      <div className="space-y-2 lg:col-span-3">
                        {isTxStaffRestricted && (
                          <div className="mb-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 flex gap-3 items-center text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <span className="text-xs font-bold leading-relaxed">
                              Vượt quá hạn mức giao dịch đối soát của Nhân viên (tối đa {formatVnd(PAYMENT_APPROVE_THRESHOLD)}). Yêu cầu tài khoản Admin phê duyệt.
                            </span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          {newTx.orderId ? (
                            <>
                              <button
                                onClick={() => handleCreateManualTx('match')}
                                disabled={processing || isTxStaffRestricted || !newTx.amount || !newTx.transactionCode.trim()}
                                className={`h-14 rounded-2xl text-white font-black shadow-lg flex items-center justify-center gap-2 transition-all ${(processing || isTxStaffRestricted || !newTx.amount || !newTx.transactionCode.trim())
                                  ? "bg-slate-300 cursor-not-allowed shadow-none"
                                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                  }`}
                              >
                                {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} KHỚP LỆNH
                              </button>
                              <button
                                onClick={() => handleCreateManualTx('reject')}
                                disabled={processing || isTxStaffRestricted || !newTx.amount || !newTx.transactionCode.trim()}
                                className={`h-14 rounded-2xl text-white font-black shadow-lg flex items-center justify-center gap-2 transition-all ${(processing || isTxStaffRestricted || !newTx.amount || !newTx.transactionCode.trim())
                                  ? "bg-slate-300 cursor-not-allowed shadow-none"
                                  : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
                                  }`}
                              >
                                {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />} TỪ CHỐI
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleCreateManualTx('match')}
                              disabled={processing || isTxStaffRestricted || !newTx.amount || !newTx.transactionCode.trim()}
                              className={`col-span-2 h-14 rounded-2xl text-white font-black shadow-lg flex items-center justify-center gap-2 transition-all ${(processing || isTxStaffRestricted || !newTx.amount || !newTx.transactionCode.trim())
                                ? "bg-slate-300 cursor-not-allowed shadow-none"
                                : "bg-slate-800 hover:bg-slate-700 shadow-slate-800/20 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                                }`}
                            >
                              {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} GHI NHẬN GIAO DỊCH (SỔ CÁI)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Statistics Sidebar */}
              <div className="rounded-[2.5rem] bg-slate-900 text-white p-8 shadow-2xl h-fit">
                <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Zap className="h-6 w-6 text-amber-400" /> Thống kê đối soát</h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <span className="text-sm font-bold opacity-60">Tổng GD ngân hàng</span>
                    <span className="text-xl font-black">{transactions.length}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <span className="text-sm font-bold opacity-60">Giao dịch đã khớp</span>
                    <span className="text-xl font-black text-emerald-400">{transactions.filter(t => t.isMatched).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold opacity-60">Tỷ lệ chính xác</span>
                    <span className="text-xl font-black text-amber-400">{transactions.length ? Math.round((transactions.filter(t => t.isMatched).length / transactions.length) * 100) : 0}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Ledger Table - Full Width */}
            <div className="rounded-[2.5rem] border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-black flex items-center gap-3"><Layers className="h-6 w-6 text-indigo-500" /> Sổ cái giao dịch ngân hàng</h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm min-w-[1000px] table-fixed">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-8 py-5 w-[20%] text-center">Mã GD</th>
                      <th className="px-8 py-5 text-center w-[12%]">Giá trị</th>
                      <th className="px-8 py-5 w-[33%] text-center">Nội dung</th>
                      <th className="px-8 py-5 text-center w-[15%]">Mã đơn hàng</th>
                      <th className="px-8 py-5 text-center w-[20%]">Trạng thái & Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.map(tx => (
                      <tr key={tx.transactionId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-8 py-6 text-center">
                          <div className="font-black truncate">{tx.transactionCode}</div>
                          <div className="text-[10px] text-slate-400">{formatDate(tx.transferTime)}</div>
                        </td>
                        <td className="px-8 py-6 font-black text-indigo-600 text-center">{formatVnd(tx.amount)}</td>
                        <td className="px-8 py-6 text-xs font-medium italic opacity-60 truncate text-center">{tx.transferContent}</td>
                        <td className="px-8 py-6 text-center">
                          {tx.matchedOrderCode ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="font-black text-indigo-500 hover:underline cursor-pointer text-sm" onClick={() => router.push(`/payments/${tx.matchedOrderId}`)}>
                                {tx.matchedOrderCode}
                              </span>
                            </div>
                          ) : (
                            <div className="relative min-w-[140px]">
                              <button onClick={() => setOpenDropdown(openDropdown === tx.transactionId ? null : tx.transactionId)} className="w-full h-10 rounded-xl bg-slate-50 px-3 text-left text-[11px] font-bold border-none ring-1 ring-slate-100 dark:bg-slate-800 flex items-center justify-between transition-all hover:ring-indigo-500/30">
                                <span className="truncate">
                                  {manualSelection[tx.transactionId]
                                    ? selectableOrders.find(o => o.orderId === manualSelection[tx.transactionId])?.orderCode
                                    : "Chọn đơn hàng"}
                                </span>
                                <ChevronDown className="h-3 w-3 text-slate-400" />
                              </button>
                              {openDropdown === tx.transactionId && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-48 overflow-auto rounded-2xl bg-white shadow-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                                  {filteredSelectableOrders.map(o => {
                                    const lockAdmin = getLockingAdmin(o.orderId);
                                    return (
                                      <button
                                        key={o.orderId}
                                        onClick={() => {
                                          if (lockAdmin) {
                                            showStatus("Đang bị khóa", `Giao dịch này admin ${lockAdmin} đang xử lý`, "warning");
                                            return;
                                          }
                                          setManualSelection({ ...manualSelection, [tx.transactionId]: o.orderId });
                                          setOpenDropdown(null);
                                        }}
                                        className={`w-full px-4 py-3 text-left text-[11px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-none flex items-center justify-between group ${lockAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className={lockAdmin ? "text-slate-400" : "group-hover:text-indigo-600"}>{o.orderCode}</span>
                                          {lockAdmin && (
                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px] font-black border border-amber-200">
                                              <Lock className="h-2 w-2" /> {lockAdmin.split(' ').pop()}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[9px] text-slate-400">{formatVnd(o.totalAmount)}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6 text-center">
                          {tx.reconcileStatus === "MATCHED" ? (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black border border-emerald-100 uppercase">
                                <Check className="h-3 w-3" /> Khớp lệnh
                              </span>
                              {tx.matchedByAdminName && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[9px] font-black uppercase text-slate-400">Bởi:</span>
                                  <span className="text-[9px] font-black text-indigo-600 truncate max-w-[80px]" title={tx.matchedByAdminName}>
                                    {tx.matchedByAdminName}
                                  </span>
                                </div>
                              )}
                              <div className="flex flex-col gap-2 w-full">
                                <button
                                  type="button"
                                  onClick={() => router.push(`/payments/${tx.matchedOrderId}`)}
                                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-200 w-full"
                                >
                                  <Eye className="h-4 w-4" /> Xem chi tiết
                                </button>
                                {currentAdminRole === "ADMIN" && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTx(tx.transactionId)}
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 shadow-sm transition-all hover:bg-rose-100 w-full"
                                  >
                                    <Trash2 className="h-4 w-4" /> Xóa
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : tx.reconcileStatus === "REJECTED" ? (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black border border-rose-100 uppercase">
                                <X className="h-3 w-3" /> Từ chối
                              </span>
                              {tx.matchedByAdminName && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[9px] font-black uppercase text-slate-400">Bởi:</span>
                                  <span className="text-[9px] font-black text-indigo-600 truncate max-w-[80px]" title={tx.matchedByAdminName}>
                                    {tx.matchedByAdminName}
                                  </span>
                                </div>
                              )}
                              <div className="flex flex-col gap-2 w-full">
                                {tx.matchedOrderId && (
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/payments/${tx.matchedOrderId}`)}
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-200 w-full"
                                  >
                                    <Eye className="h-4 w-4" /> Xem chi tiết
                                  </button>
                                )}
                                {currentAdminRole === "ADMIN" && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTx(tx.transactionId)}
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 shadow-sm transition-all hover:bg-rose-100 w-full"
                                  >
                                    <Trash2 className="h-4 w-4" /> Xóa
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2">
                              {(() => {
                                const isRowStaffRestricted = currentAdminRole === "STAFF" && (tx.amount >= PAYMENT_APPROVE_THRESHOLD);
                                
                                return (
                                  <div className="flex flex-col gap-2 w-full">
                                    <button
                                      type="button"
                                      onClick={() => handleManualMatch(tx.transactionId)}
                                      disabled={isRowStaffRestricted}
                                      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[10px] font-black w-full shadow-sm transition-all active:translate-y-0 ${
                                        isRowStaffRestricted
                                          ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700"
                                          : "bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5 shadow-indigo-500/20"
                                      }`}
                                    >
                                      <Check className="h-4 w-4" /> KHỚP LỆNH
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRejectTx(tx.transactionId)}
                                      disabled={isRowStaffRestricted}
                                      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[10px] font-black w-full shadow-sm transition-all active:translate-y-0 ${
                                        isRowStaffRestricted
                                          ? "bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100 dark:bg-slate-800/20 dark:text-slate-600"
                                          : "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:-translate-y-0.5 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-rose-500/10"
                                      }`}
                                    >
                                      <X className="h-4 w-4" /> TỪ CHỐI
                                    </button>
                                    {currentAdminRole === "ADMIN" && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTx(tx.transactionId)}
                                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-[10px] font-black text-rose-600 shadow-sm transition-all hover:bg-rose-100 hover:-translate-y-0.5 w-full active:translate-y-0 dark:bg-rose-900/20 dark:hover:bg-rose-900/40"
                                      >
                                        <Trash2 className="h-4 w-4" /> XÓA
                                      </button>
                                    )}
                                    {isRowStaffRestricted && (
                                      <div className="text-[8px] font-bold text-rose-500 mt-1 uppercase tracking-tighter text-center">
                                        Vượt hạn mức Nhân viên
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal (Manual Approval) */}
      <AnimatePresence>
        {showDetailModal && selectedAttempt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDetailModal(false)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-6xl overflow-hidden rounded-[3rem] bg-white shadow-2xl dark:bg-slate-900 flex flex-col lg:flex-row max-h-[90vh]">
              <div className="lg:w-1/2 bg-slate-100 dark:bg-slate-800 p-8 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800">
                <div className="mb-6 flex items-center justify-between w-full px-4"><div className="text-xs font-black uppercase tracking-widest text-slate-400">Minh chứng từ khách hàng</div><RiskBadge level={selectedAttempt.riskLevel} /></div>
                <div className="relative group w-full aspect-[3/4] overflow-hidden rounded-[2.5rem] bg-white shadow-2xl border-[12px] border-white dark:border-slate-700">
                  <img src={selectedAttempt.transferImageUrl} className="h-full w-full object-contain" alt="Minh chứng" />
                </div>
              </div>
              <div className="flex-1 p-10 overflow-y-auto flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">Xử lý phê duyệt</h2>
                    <div className="flex items-center gap-2 mt-1"><span className="text-sm font-bold text-slate-400">Đơn hàng:</span><span className="text-sm font-black text-indigo-600">ĐH-{selectedAttempt.orderId}</span></div>
                  </div>
                  <button onClick={() => setShowDetailModal(false)} className="p-3 rounded-full hover:bg-slate-100 transition dark:hover:bg-white/5"><X className="h-8 w-8" /></button>
                </div>
                <div className="grid gap-4 grid-cols-2 mb-8">
                  <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Số tiền khớp lệnh</div><div className="mt-1 text-2xl font-black text-indigo-600">{formatVnd(selectedAttempt.amount)}</div></div>
                  <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gửi lúc</div><div className="mt-1 text-lg font-black">{formatDate(selectedAttempt.createdAt)}</div></div>
                </div>
                <div className="mb-8 p-6 rounded-[2rem] bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 flex gap-4">
                  <div className="p-3 rounded-2xl bg-amber-100 text-amber-600 h-fit"><Info className="h-5 w-5" /></div>
                  <div><div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Ghi chú khách hàng</div><p className="text-sm font-medium italic">"{selectedAttempt.transferNote || "Không có ghi chú"}"</p></div>
                </div>
                <div className="mb-8"><h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><History className="h-3.5 w-3.5" /> Lịch sử giao dịch</h4><PaymentTimeline logs={attemptLogs} /></div>

                <div className="mt-auto space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  {/* Trạng thái Read-Only của Hóa đơn đã xử lý */}
                  {(selectedAttempt.status === "MATCHED" || selectedAttempt.status === "REJECTED") && (
                    <div className={`p-6 rounded-[2rem] border flex gap-4 items-center ${
                      selectedAttempt.status === "MATCHED"
                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400"
                        : "bg-rose-50/50 border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400"
                    }`}>
                      <div className={`p-3 rounded-2xl ${
                        selectedAttempt.status === "MATCHED" 
                          ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400" 
                          : "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400"
                      }`}>
                        {selectedAttempt.status === "MATCHED" ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest mb-1">
                          {selectedAttempt.status === "MATCHED" ? "GIAO DỊCH ĐÃ ĐƯỢC DUYỆT" : "GIAO DỊCH ĐÃ BỊ TỪ CHỐI"}
                        </div>
                        <p className="text-xs font-bold leading-relaxed opacity-90">
                          {selectedAttempt.status === "MATCHED"
                            ? "Minh chứng thanh toán này đã được đối soát khớp lệnh thành công. Đơn hàng đã chuyển sang trạng thái đã thanh toán."
                            : `Hóa đơn minh chứng này không hợp lệ và đã bị từ chối phê duyệt. Đơn hàng liên quan đã được hủy.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Note Input */}
                  {((selectedAttempt.status === "WAITING_CONFIRM" || selectedAttempt.status === "PROCESSING") &&
                    selectedAttempt.processingByAdminId &&
                    Number(selectedAttempt.processingByAdminId) === Number(currentAdminId) &&
                    (!selectedAttempt.lockExpiresAt || new Date(selectedAttempt.lockExpiresAt).getTime() > Date.now())) && (
                      <div className="space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ghi chú xử lý / Lý do từ chối</div>
                        <textarea
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          placeholder="Nhập lý do nếu từ chối hoặc ghi chú phê duyệt..."
                          className="w-full h-24 rounded-3xl bg-slate-50 p-5 text-sm font-medium border-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:bg-slate-800 transition-all shadow-inner"
                        />
                      </div>
                    )}

                  {/* Actions */}
                  {(selectedAttempt.status === "WAITING_CONFIRM" || selectedAttempt.status === "PROCESSING") && (() => {
                    const isStaffRestricted = currentAdminRole === "STAFF" && (selectedAttempt.amount >= PAYMENT_APPROVE_THRESHOLD || selectedAttempt.riskLevel === 'HIGH' || selectedAttempt.isSuspicious);
                    
                    return (
                      <>
                        {isStaffRestricted && (
                          <div className="mb-6 p-6 rounded-[2rem] bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 flex gap-4 items-center">
                            <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 h-fit">
                              <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1">
                                HẠN CHẾ QUYỀN HẠN
                              </div>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                                Giao dịch vượt quá hạn mức xử lý của Nhân viên (tối đa 5.000.000đ) hoặc có mức độ rủi ro cao. Vui lòng chuyển quyền phê duyệt cho Quản trị viên (Admin).
                              </p>
                            </div>
                          </div>
                        )}

                        {(selectedAttempt.processingByAdminId &&
                          Number(selectedAttempt.processingByAdminId) === Number(currentAdminId) &&
                          (!selectedAttempt.lockExpiresAt || new Date(selectedAttempt.lockExpiresAt).getTime() > Date.now())) ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                              onClick={handleApprove}
                              disabled={processing || isStaffRestricted}
                              className="h-16 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-6 w-6" />} DUYỆT THANH TOÁN
                            </button>
                            <button
                              onClick={handleReject}
                              disabled={processing || isStaffRestricted}
                              className="h-16 rounded-2xl bg-rose-50 text-rose-600 font-black hover:bg-rose-100 transition-all border border-rose-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processing ? <Loader2 className="h-6 w-6 animate-spin" /> : <X className="h-6 w-6" />} TỪ CHỐI & HỦY ĐƠN
                            </button>
                            <button
                              onClick={() => handleRelease(selectedAttempt.attemptId)}
                              disabled={processing}
                              className="md:col-span-2 h-14 rounded-2xl bg-slate-100 text-slate-600 font-black hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                            >
                              <Unlock className="h-5 w-5" /> MỞ KHÓA (DỪNG XỬ LÝ)
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleLock(selectedAttempt.attemptId)}
                            disabled={processing || isStaffRestricted || (selectedAttempt.processingByAdminId !== null &&
                              Number(selectedAttempt.processingByAdminId) !== Number(currentAdminId) &&
                              (!selectedAttempt.lockExpiresAt || new Date(selectedAttempt.lockExpiresAt).getTime() > Date.now()))}
                            className={`w-full h-16 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 transition-all ${
                              isStaffRestricted
                                ? "bg-rose-50 text-rose-400 border border-rose-100 cursor-not-allowed shadow-none"
                                : (selectedAttempt.processingByAdminId !== null &&
                                  Number(selectedAttempt.processingByAdminId) !== Number(currentAdminId) &&
                                  (!selectedAttempt.lockExpiresAt || new Date(selectedAttempt.lockExpiresAt).getTime() > Date.now()))
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20"
                            }`}
                          >
                            <Lock className="h-5 w-5" />
                            {isStaffRestricted
                              ? "VƯỢT HẠN MỨC - YÊU CẦU QUYỀN ADMIN"
                              : (selectedAttempt.processingByAdminId !== null &&
                                Number(selectedAttempt.processingByAdminId) !== Number(currentAdminId) &&
                                (!selectedAttempt.lockExpiresAt || new Date(selectedAttempt.lockExpiresAt).getTime() > Date.now()))
                                ? "ĐANG CÓ NGƯỜI XỬ LÝ"
                                : "BẮT ĐẦU XỬ LÝ (KHÓA LẠI)"}
                          </button>
                        )}
                      </>
                    );
                  })()}

                  {/* Quick refresh inside modal */}
                  <div className="flex gap-4">
                    <button
                      onClick={async () => {
                        const filterToUse = attemptStatusFilter === "WAITING_CONFIRM" ? undefined : attemptStatusFilter;
                        const updated = await adminManualPaymentService.getAttempts(filterToUse);
                        const match = updated.find(a => a.attemptId === selectedAttempt.attemptId);
                        if (match) setSelectedAttempt(match);
                        fetchData(true);
                      }}
                      className="flex-1 h-16 px-6 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 transition-all shadow-sm flex items-center justify-center gap-2"
                      title="Làm mới trạng thái"
                    >
                      <History className="h-6 w-6" /> LÀM MỚI
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <StatusModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
    </motion.div>
  );
}
