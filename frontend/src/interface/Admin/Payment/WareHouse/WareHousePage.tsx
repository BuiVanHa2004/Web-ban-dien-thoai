"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  adminManualPaymentService,
  type PaymentAttempt
} from "@/services/adminManualPaymentService";
import { orderService, type OrderDto } from "@/services/orderService";
import {
  Check, X, Trash2, Loader2,
  AlertTriangle, Archive, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import StatusModal, { type ModalType } from "@/components/admin/StatusModal";
import ConfirmModal from "@/components/admin/ConfirmModal";

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

// --- Main Component ---

export default function WareHousePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("STAFF");

  // Data
  const [archivedAttempts, setArchivedAttempts] = useState<PaymentAttempt[]>([]);
  const [trashCount, setTrashCount] = useState<number>(0);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Selected state
  const [selectedAttempt, setSelectedAttempt] = useState<PaymentAttempt | null>(null);
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
      const [archived, trashed] = await Promise.all([
        adminManualPaymentService.getArchivedAttempts(),
        adminManualPaymentService.getTrashedAttempts()
      ]);
      setArchivedAttempts(archived);
      setTrashCount(trashed.length);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Get user role and load data
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        let role = "STAFF";
        if (user.role && typeof user.role === "string") role = user.role;
        else if (user.role && typeof user.role.roleName === "string") role = user.role.roleName;
        else if (user.roleName && typeof user.roleName === "string") role = user.roleName;
        console.log("🔐 WareHouse - User role:", role, "User:", user);
        setUserRole(role);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
    fetchData();
  }, [fetchData]);
  const handleViewDetail = async (attempt: PaymentAttempt) => {
    console.log("🔍 handleViewDetail called", { attemptId: attempt.attemptId, attempt });
    setSelectedAttempt(attempt);
    setShowDetailModal(true);
    setDetailOrder(null);
    
    console.log("📊 Modal state set:", { showDetailModal: true, selectedAttempt: attempt });
    
    try {
      // Try to fetch order details if orderId exists
      if (attempt.orderId !== null && attempt.orderId !== undefined) {
        try {
          const order = await orderService.getById(attempt.orderId);
          console.log("📦 Order fetched:", order);
          setDetailOrder(order);
        } catch (err) {
          console.log("⚠️ Order not found (might be deleted), using archived data");
          setDetailOrder(null);
        }
      } else {
        console.log("ℹ️ No orderId, skipping order fetch");
      }
    } catch (err: any) {
      console.error("❌ Failed to fetch details:", err);
      setDetailOrder(null);
    }
  };

  const handleDeleteOne = async (attemptId: number) => {
    showConfirm(
      "Xóa bill này?",
      "Bill sẽ được chuyển vào thùng rác. Bạn có thể khôi phục hoặc xóa vĩnh viễn sau.",
      async () => {
        setDeleting(true);
        try {
          await adminManualPaymentService.softDeleteAttempt(attemptId);
          showStatus("Đã xóa", "Bill đã được chuyển vào thùng rác", "success");
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
      "warning"
    );
  };

  const handleDeleteAll = async () => {
    showConfirm(
      "Xóa tất cả bill lưu trữ?",
      `Tất cả ${archivedAttempts.length} bill sẽ được chuyển vào thùng rác. Bạn có thể khôi phục hoặc xóa vĩnh viễn sau.`,
      async () => {
        setDeleting(true);
        try {
          // Soft delete each archived bill
          for (const attempt of archivedAttempts) {
            await adminManualPaymentService.softDeleteAttempt(attempt.attemptId);
          }
          showStatus("Đã xóa tất cả", "Tất cả bill đã được chuyển vào thùng rác", "success");
          await fetchData(true);
          setShowDetailModal(false);
        } catch (err: any) {
          showStatus("Lỗi", err.message || "Không thể xóa", "error");
        } finally {
          setDeleting(false);
        }
      },
      "warning"
    );
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(archivedAttempts.map(a => a.attemptId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (attemptId: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(attemptId);
    } else {
      newSelected.delete(attemptId);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    showConfirm(
      "Xóa các bill đã chọn?",
      `${selectedIds.size} bill sẽ được chuyển vào thùng rác. Bạn có thể khôi phục hoặc xóa vĩnh viễn sau.`,
      async () => {
        setDeleting(true);
        try {
          // Soft delete each selected bill
          for (const id of Array.from(selectedIds)) {
            await adminManualPaymentService.softDeleteAttempt(id);
          }
          showStatus("Đã xóa", `Đã chuyển ${selectedIds.size} bill vào thùng rác`, "success");
          setSelectedIds(new Set());
          await fetchData(true);
        } catch (err: any) {
          showStatus("Lỗi", err.message || "Không thể xóa", "error");
        } finally {
          setDeleting(false);
        }
      },
      "warning"
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-5"
    >
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.55)]" />
            Kho lưu trữ
          </div>
          <h1 className="mt-2 text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Kho Lưu Trữ Bill
          </h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            Bill đã được lưu trữ từ đơn hàng đã xóa vĩnh viễn
          </p>
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

          {selectedIds.size > 0 && userRole === "ADMIN" && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-3 py-2 sm:px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-rose-700 active:translate-y-0 disabled:opacity-50 whitespace-nowrap"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              Xóa đã chọn ({selectedIds.size})
            </button>
          )}

          {archivedAttempts.length > 0 && userRole === "ADMIN" && selectedIds.size === 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-3 py-2 sm:px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-rose-700 active:translate-y-0 disabled:opacity-50 whitespace-nowrap"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              Xóa tất cả ({archivedAttempts.length})
            </button>
          )}

          {userRole === "ADMIN" && (
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
              {trashCount > 0 && (
                <span className="ml-1 inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white ring-1 ring-white/15 transition-all duration-500 ease-out dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-1 dark:ring-emerald-400/20">
                  {trashCount}
                </span>
              )}
            </Link>
          )}

          <Link
            href="/payments"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-3 py-2 sm:px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-indigo-500 active:translate-y-0 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-1 dark:ring-indigo-400/20 dark:hover:bg-indigo-500/20 whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Quay lại
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 sm:gap-3">
            <div className="rounded-xl p-2 bg-amber-50 dark:bg-amber-900/20 shrink-0">
              <Archive className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span>Đã duyệt khớp lệnh</span>
            <div className="h-2 w-2 shrink-0 rounded-full bg-amber-500 animate-pulse" />
            {archivedAttempts.length > 0 && (
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-[10px] font-black bg-amber-600 text-white shrink-0">
                {archivedAttempts.length}
              </span>
            )}
          </h3>
        </div>

        {error && (
          <div className="p-4 sm:p-8 border-b border-rose-100 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-900/20">
            <p className="text-sm font-bold text-rose-600">{error}</p>
          </div>
        )}

        <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-sm" style={{ minWidth: "640px" }}>
            <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-slate-800/50">
              <tr>
                {userRole === "ADMIN" && (
                  <th className="px-4 sm:px-8 py-4 sm:py-5 text-center w-12">
                    <input
                      type="checkbox"
                      checked={archivedAttempts.length > 0 && selectedIds.size === archivedAttempts.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                )}
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
                  <td colSpan={userRole === "ADMIN" ? 6 : 5} className="py-24 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-400" />
                  </td>
                </tr>
              ) : archivedAttempts.length === 0 ? (
                <tr>
                  <td colSpan={userRole === "ADMIN" ? 6 : 5} className="py-24 text-center">
                    <Archive className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm font-black text-slate-400">CHƯA CÓ BILL NÀO TRONG KHO LƯU TRỮ</p>
                    <p className="mt-1 text-xs text-slate-500">Bill sẽ được lưu trữ khi xóa vĩnh viễn đơn hàng</p>
                  </td>
                </tr>
              ) : (
                archivedAttempts.map((attempt) => (
                  <tr
                    key={attempt.attemptId}
                    className="group transition-colors hover:bg-slate-100/70 dark:hover:bg-white/[0.06]"
                  >
                    {userRole === "ADMIN" && (
                      <td className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(attempt.attemptId)}
                          onChange={(e) => handleSelectOne(attempt.attemptId, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                      <div className="font-black text-slate-900 dark:text-white">
                        {attempt.archivedOrderCode || `ĐH-${attempt.orderId || "N/A"}`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        {formatDate(attempt.archivedAt || undefined)}
                      </div>
                    </td>
                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-center font-black text-indigo-600 text-sm sm:text-lg whitespace-nowrap">
                      {formatVnd(attempt.amount)}
                    </td>
                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                      <div className="flex justify-center">
                        <RiskBadge level={attempt.riskLevel} />
                      </div>
                    </td>
                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black ${
                            attempt.status === "MATCHED"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-900/20 dark:border-rose-800"
                          }`}
                        >
                          {attempt.status === "MATCHED" ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                          {attempt.status === "MATCHED" ? "Đã duyệt khớp lệnh" : "Từ chối"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleViewDetail(attempt)}
                          className="inline-flex cursor-pointer items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-2xl bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:ring-cyan-400/15 dark:hover:shadow-black/30"
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Xem
                        </button>
                        {userRole === "ADMIN" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOne(attempt.attemptId);
                            }}
                            disabled={deleting}
                            className="inline-flex cursor-pointer items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-2xl bg-rose-600 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-md active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Xóa
                          </button>
                        )}
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
                        <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white">Chi tiết Bill</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs sm:text-sm font-bold text-white/70">Đơn hàng:</span>
                          <span className="text-xs sm:text-sm font-black text-indigo-400">
                            {selectedAttempt.archivedOrderCode || (selectedAttempt.orderId ? `ĐH-${selectedAttempt.orderId}` : "ĐH đã xóa")}
                          </span>
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
                        Lưu trữ lúc
                      </div>
                      <div className="mt-1 text-xs sm:text-lg font-black text-white break-words">
                        {formatDate(selectedAttempt.archivedAt || undefined)}
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
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
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

                      {/* Admin Feedback Card */}
                      {(selectedAttempt.status === "MATCHED" || selectedAttempt.status === "REJECTED") && 
                       (selectedAttempt.reviewedAt || selectedAttempt.rejectReason || selectedAttempt.archivedAdminNote) && (
                        <div
                          className={`mb-6 sm:mb-8 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex gap-3 sm:gap-4 ${
                            selectedAttempt.status === "MATCHED"
                              ? "bg-emerald-50/5 border border-emerald-500/20"
                              : "bg-rose-50/5 border border-rose-500/20"
                          }`}
                        >
                          <div
                            className={`p-2 sm:p-3 rounded-2xl h-fit shrink-0 ${
                              selectedAttempt.status === "MATCHED"
                                ? "bg-emerald-500/15"
                                : "bg-rose-500/15"
                            }`}
                          >
                            {selectedAttempt.status === "MATCHED" ? (
                              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                            ) : (
                              <X className="h-4 w-4 sm:h-5 sm:w-5 text-rose-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
                                selectedAttempt.status === "MATCHED" ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              GHI CHÚ CỦA QUẢN TRỊ VIÊN
                            </div>
                            <p className="text-xs sm:text-sm font-medium text-white/90 break-words mb-3">
                              {selectedAttempt.status === "MATCHED" 
                                ? (selectedAttempt.archivedAdminNote || detailOrder?.paymentNote || "Không có ghi chú")
                                : (selectedAttempt.rejectReason || "Không có ghi chú")}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-white/50">
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

                      <div
                        className="mt-auto space-y-6 pt-6"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        {/* Archive status banner */}
                        <div
                          className="p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border flex gap-3 sm:gap-4 items-start sm:items-center bg-amber-50/50 border-amber-100 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400"
                        >
                          <div className="p-2 sm:p-3 rounded-2xl shrink-0 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                            <Archive className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-black uppercase tracking-widest mb-1">
                              BILL ĐÃ LƯU TRỮ
                            </div>
                            <p className="text-xs font-bold leading-relaxed opacity-90 break-words">
                              Bill này được lưu trữ từ đơn hàng đã xóa vĩnh viễn khỏi hệ thống.
                            </p>
                          </div>
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
    </motion.div>
  );
}
