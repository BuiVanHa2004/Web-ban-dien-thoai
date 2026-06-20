"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { orderService, type OrderDto } from "@/services/orderService";
import { bankTransferService, type BankTransferStatusDto } from "@/services/bankTransferService";
import { adminManualPaymentService } from "@/services/adminManualPaymentService";
import { adminBankTransactionService } from "@/services/adminBankTransactionService";
import { productService, type ProductDto } from "@/services/productService";
import {
  ArrowLeft, Image as ImageIcon, Loader2, X, Check,
  User, Phone, MapPin, Shield
} from "lucide-react";
import { motion } from "framer-motion";
import { translatePaymentStatus } from "@/services/paymentStatusLabels";
import StatusModal, { type ModalType } from "@/components/admins/StatusModal";
import ConfirmModal from "@/components/admins/ConfirmModal";
import { resolveImageUrl } from "@/common/resolveImageUrl";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

function formatDate(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("vi-VN");
}

export default function PaymentId() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const id = Number(pathname.split("/").pop());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<BankTransferStatusDto | null>(null);
  const [productMap, setProductMap] = useState<Record<number, ProductDto>>({});
  const [adminNote, setAdminNote] = useState("");
  const [generalNote, setGeneralNote] = useState("");
  const [currentUser, setCurrentUser] = useState<{ id: string; adminId: number; name: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);

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

  const showStatus = (title: string, message: string, type: ModalType = "info") => {
    setModalConfig({ isOpen: true, title, message, type });
  };

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

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: "danger" | "warning" | "info" = "warning") => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, type });
  };

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const [orderData, paymentData] = await Promise.all([
        orderService.getById(id),
        bankTransferService.getStatus(id)
      ]);
      setOrder(orderData);
      setPaymentInfo(paymentData);
      setGeneralNote(orderData.adminNote || "");
      setAdminNote(orderData.adminNote || "");

      // Fetch unique products to resolve color images
      const uniqueIds = Array.from(
        new Set((orderData.items || []).map(it => Number(it.productId)).filter(id => id > 0))
      );
      if (uniqueIds.length > 0) {
        const pairs = await Promise.all(
          uniqueIds.map(async (pid) => {
            try {
              const p = await productService.getById(pid);
              return [pid, p] as const;
            } catch {
              return null;
            }
          })
        );
        const nextMap: Record<number, ProductDto> = {};
        pairs.forEach(pair => {
          if (pair) nextMap[pair[0]] = pair[1];
        });
        setProductMap(nextMap);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Removed fetchNotes as we now use database notes

  useEffect(() => {
    if (id) {
      fetchDetail();
    }

    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser({
          ...user,
          adminId: Number(user.adminId || user.id || 0)
        });
      }
    }
  }, [id]);


  const handleSaveGeneralNote = async () => {
    if (!currentUser || !order) return;
    setIsProcessing(true);
    try {
      await adminManualPaymentService.updateOrderNote(order.orderId, generalNote, currentUser.name);
      setIsEditingNote(false);
      // Refresh order data to sync
      fetchDetail();
      showStatus("Thành công", "Đã lưu ghi chú vào hệ thống!", "success");
    } catch (err: any) {
      showStatus("Lỗi", "Lỗi khi lưu ghi chú: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (order) {
      document.title = `Thanh toán ${order.orderCode} | Admin Dashboard`;
    }
  }, [order]);

  const handleApprove = async () => {
    if (!paymentInfo?.latestAttempt) {
      showStatus("Lưu ý", "Không tìm thấy minh chứng để duyệt.", "warning");
      return;
    }

    const executeApprove = async () => {
      setIsProcessing(true);
      try {
        await adminManualPaymentService.approve(
          paymentInfo.latestAttempt!.attemptId,
          currentUser?.adminId || 0,
          adminNote
        );
        showStatus("Thành công", "Đã duyệt thành công!", "success");
        fetchDetail();
      } catch (err: any) {
        showStatus("Lỗi", "Lỗi: " + err.message, "error");
      } finally {
        setIsProcessing(false);
      }
    };

    showConfirm("Xác nhận duyệt", "Xác nhận duyệt thanh toán cho đơn hàng này?", executeApprove, "info");
  };

  const handleReject = async () => {
    if (!adminNote) {
      showStatus("Thiếu thông tin", "Vui lòng nhập lý do từ chối vào phần ghi chú.", "warning");
      return;
    }
    if (!paymentInfo?.latestAttempt) {
      showStatus("Lưu ý", "Không tìm thấy minh chứng để từ chối.", "warning");
      return;
    }

    const executeReject = async () => {
      setIsProcessing(true);
      try {
        const noteToUse = adminNote || "Bị từ chối bởi quản trị viên";
        
        // 2. Reject the payment attempt
        await adminManualPaymentService.reject(
          paymentInfo.latestAttempt!.attemptId,
          currentUser?.adminId || 0,
          noteToUse
        );
        showStatus("Thành công", "Đã từ chối thanh toán và hủy đơn hàng.", "success");
        fetchDetail();
      } catch (err: any) {
        showStatus("Lỗi", "Lỗi: " + err.message, "error");
      } finally {
        setIsProcessing(false);
      }
    };

    showConfirm("Xác nhận từ chối", "Xác nhận từ chối thanh toán này?", executeReject, "danger");
  };

  const handleRejectMatchedTransaction = async () => {
    if (!paymentInfo?.matchedTransaction) return;

    const executeRejectTx = async () => {
      setIsProcessing(true);
      try {
        const noteToUse = generalNote || adminNote || "Giao dịch ngân hàng bị từ chối";

        // 2. Reject the transaction
        await adminBankTransactionService.reject(
          paymentInfo.matchedTransaction!.transactionId,
          order?.orderId,
          currentUser?.adminId || 0,
          noteToUse
        );
        showStatus("Thành công", "Đã từ chối giao dịch và hủy đơn hàng thành công!", "success");
        fetchDetail();
      } catch (err: any) {
        showStatus("Lỗi", "Lỗi: " + err.message, "error");
      } finally {
        setIsProcessing(false);
      }
    };

    showConfirm("Xác nhận từ chối", "Xác nhận từ chối giao dịch ngân hàng này? Đơn hàng sẽ chuyển sang trạng thái Đã hủy.", executeRejectTx, "danger");
  };

  const handleReMatchTransaction = async () => {
    if (!paymentInfo?.matchedTransaction) return;

    const executeReMatch = async () => {
      setIsProcessing(true);
      try {
        await adminBankTransactionService.reMatch(
          paymentInfo.matchedTransaction!.transactionId,
          currentUser?.adminId || 0,
          generalNote || adminNote // Pass current note to preserve it
        );
        showStatus("Thành công", "Đã khớp lệnh thành công!", "success");
        fetchDetail();
      } catch (err: any) {
        showStatus("Lỗi", "Lỗi: " + err.message, "error");
      } finally {
        setIsProcessing(false);
      }
    };

    showConfirm("Xác nhận khớp lệnh", "Xác nhận chuyển giao dịch này sang Khớp lệnh? Đơn hàng sẽ chuyển sang trạng thái Đã xác nhận / Đã thanh toán.", executeReMatch, "info");
  };

  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
    </div>
  );

  if (error || !order) return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center dark:bg-rose-900/20">
      <p className="font-black text-rose-600">{error || "Không tìm thấy đơn hàng"}</p>
      <Link href="/payments" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
      </Link>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-5"
      id="payment-detail-root"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Thanh toán
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button
              id="btn-back-to-list"
              onClick={() => router.back()}
              className="rounded-2xl bg-white p-2.5 sm:p-3 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:ring-slate-700 transition-all shrink-0"
              aria-label="Quay lại trang danh sách"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <h1 className="text-base sm:text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight truncate">Thanh toán {order.orderCode}</h1>
          </div>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">Xem và xác nhận minh chứng chuyển khoản từ khách hàng.</p>
        </div>
        <div className={`self-start rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-black uppercase tracking-widest whitespace-nowrap ${
          order.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" 
          : order.paymentStatus === "FAILED" ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30"
          : "bg-amber-100 text-amber-600 dark:bg-amber-900/30"
          }`}>
          {translatePaymentStatus(order.paymentStatus)}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Left Column: Proof */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-4 sm:p-6 dark:border-slate-800">
              <h2 className="flex items-center gap-2 text-base sm:text-lg font-black text-slate-900 dark:text-white">
                <ImageIcon className="h-5 w-5 text-indigo-500 shrink-0" /> Minh chứng chuyển khoản
              </h2>
            </div>
            <div className="p-4 sm:p-8">
              <div className="relative aspect-[9/16] w-full max-w-xs sm:max-w-sm mx-auto overflow-hidden rounded-3xl border-4 sm:border-8 border-slate-50 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
                {paymentInfo?.latestAttempt?.transferImageUrl ? (
                  <img
                    src={paymentInfo.latestAttempt.transferImageUrl}
                    className="h-full w-full object-contain"
                    alt={`Minh chứng chuyển khoản đơn hàng ${order.orderCode}`}
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="h-12 w-12 sm:h-16 sm:w-16 mb-4 opacity-20" />
                    <p className="font-bold text-sm text-center px-4">Khách hàng chưa tải ảnh minh chứng</p>
                  </div>
                )}
              </div>

              {paymentInfo?.latestAttempt && (
                <>
                  <div className="mt-4 sm:mt-8 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-3 sm:p-4 dark:bg-slate-800">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ghi chú của khách</p>
                      <p className="mt-1 text-sm font-medium italic break-words">"{paymentInfo.latestAttempt?.transferNote || "Không có ghi chú"}"</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3 sm:p-4 dark:bg-slate-800">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Thời gian gửi</p>
                      <p className="mt-1 text-sm font-bold">{formatDate(paymentInfo.latestAttempt?.customerConfirmedAt || paymentInfo.latestAttempt?.createdAt)}</p>
                    </div>
                  </div>

                  {/* Admin Feedback Card for Payment Attempt */}
                  {(paymentInfo.latestAttempt.status === "MATCHED" || paymentInfo.latestAttempt.status === "REJECTED") && 
                   (paymentInfo.latestAttempt.reviewedAt || paymentInfo.latestAttempt.rejectReason) && (
                    <div
                      className={`mt-4 sm:mt-6 p-4 sm:p-6 rounded-2xl flex gap-3 sm:gap-4 ${
                        paymentInfo.latestAttempt.status === "MATCHED"
                          ? "bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-500/20"
                          : "bg-rose-50 border border-rose-200 dark:bg-rose-900/10 dark:border-rose-500/20"
                      }`}
                    >
                      <div
                        className={`p-2 sm:p-3 rounded-xl h-fit shrink-0 ${
                          paymentInfo.latestAttempt.status === "MATCHED"
                            ? "bg-emerald-100 dark:bg-emerald-500/15"
                            : "bg-rose-100 dark:bg-rose-500/15"
                        }`}
                      >
                        {paymentInfo.latestAttempt.status === "MATCHED" ? (
                          <Check className={`h-4 w-4 sm:h-5 sm:w-5 ${paymentInfo.latestAttempt.status === "MATCHED" ? "text-emerald-600 dark:text-emerald-400" : ""}`} />
                        ) : (
                          <X className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 dark:text-rose-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
                            paymentInfo.latestAttempt.status === "MATCHED" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          PHẢN HỒI QUẢN TRỊ VIÊN
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 break-words mb-3">
                          {paymentInfo.latestAttempt.status === "MATCHED" 
                            ? (paymentInfo.latestAttempt.rejectReason || "Thanh toán đã được xác nhận. Giao dịch hợp lệ.")
                            : (paymentInfo.latestAttempt.rejectReason || "Minh chứng không hợp lệ.")}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {paymentInfo.latestAttempt.reviewedByAdminId && (
                            <span>Người xử lý: Admin #{paymentInfo.latestAttempt.reviewedByAdminId}</span>
                          )}
                          {paymentInfo.latestAttempt.reviewedAt && (
                            <span>Thời gian: {formatDate(paymentInfo.latestAttempt.reviewedAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Product Items */}
          <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white">Sản phẩm trong đơn</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {order.items?.map((item, idx) => {
                const product = productMap[Number(item.productId)];
                let resolvedImg = resolveImageUrl(item.imageUrl);

                // Try to find color-specific image if product data is available
                if (product && item.colorName) {
                  const matchedColor = product.productColors?.find(
                    c => c.colorName?.toLowerCase() === item.colorName?.toLowerCase()
                  );
                  if (matchedColor && matchedColor.images && matchedColor.images.length > 0) {
                    resolvedImg = resolveImageUrl(matchedColor.images[0]);
                  }
                }

                return (
                  <div key={idx} className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
                    <div className="aspect-[9/16] w-14 sm:w-20 flex-shrink-0 overflow-hidden rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <img
                        src={resolvedImg || ""}
                        className="h-full w-full object-cover"
                        alt={item.productName || "Sản phẩm"}
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{item.productName}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5 sm:gap-2">
                        <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 whitespace-nowrap">
                          {item.colorName}
                        </span>
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap">
                          SL: {item.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-indigo-600 text-xs sm:text-sm">{formatVnd(Number(item.productPrice) * (item.quantity || 0))}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-slate-50 p-4 sm:p-6 dark:bg-slate-800/50">
              <div className="flex items-center justify-between sm:justify-end sm:gap-4">
                <span className="text-sm font-bold text-slate-500">Tổng tiền:</span>
                <span className="text-xl sm:text-2xl font-black text-indigo-600">{formatVnd(order.totalAmount || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Info & Approval */}
        <div className="space-y-4 sm:space-y-6">
          {/* Order Status Card */}
          <div className="rounded-[2rem] bg-indigo-600 p-5 sm:p-8 text-white shadow-xl shadow-indigo-500/30">
            <h3 className="text-xs font-black uppercase tracking-widest opacity-70">Trạng thái đơn hàng</h3>
            <div className="mt-2 text-xl sm:text-2xl font-black">{translatePaymentStatus(order.orderStatus)}</div>
            <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-70">Thanh toán</span>
                <span className="font-black whitespace-nowrap">{translatePaymentStatus(order.paymentStatus)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-70">Phương thức</span>
                <span className="font-black whitespace-nowrap">{translatePaymentStatus(order.paymentMethod)}</span>
              </div>
            </div>
          </div>

          {/* Customer Info Card */}
          <div className="rounded-[2rem] bg-white p-5 sm:p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 sm:mb-6">Thông tin khách hàng</h3>
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800 shrink-0"><User className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase text-slate-400">Người nhận</p>
                  <p className="text-sm font-bold break-words">{order.receiverName || order.customerName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800 shrink-0"><Phone className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase text-slate-400">Số điện thoại</p>
                  <p className="text-sm font-bold">{order.receiverPhone || "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800 shrink-0"><MapPin className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase text-slate-400">Địa chỉ giao hàng</p>
                  <p className="text-xs font-medium leading-relaxed break-words">{order.shippingAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Comment Card */}
          {order.comment && (
            <div className="rounded-[2rem] bg-indigo-50 p-5 sm:p-8 shadow-sm ring-1 ring-indigo-200 dark:bg-indigo-900/10 dark:ring-indigo-500/20">
              <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-3 sm:mb-4">Nội dung khách hàng nhập</h3>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic break-words">
                "{order.comment}"
              </p>
            </div>
          )}

          {/* Admin Note Card */}
          {order.adminNote && (
            <div className="rounded-[2rem] bg-amber-50 p-5 sm:p-8 shadow-sm ring-1 ring-amber-200 dark:bg-amber-900/10 dark:ring-amber-500/20">
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 mb-3 sm:mb-4 break-words">Ghi chú - {order.adminNoteAuthor || "Hệ thống"}</h3>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic break-words">
                "{order.adminNote}"
              </p>
            </div>
          )}

          {/* General Note from PaymentPage (Editable & Shared) */}
          <div className="rounded-[2rem] bg-white p-5 sm:p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex flex-col min-w-0">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Ghi chú chung của Admin</h3>
                <span className="text-[10px] font-bold text-emerald-500 mt-0.5 break-words">
                  Người cập nhật: {order?.adminNoteAuthor || "Chưa có"} 
                  {order?.adminNoteDate && ` (${formatDate(order.adminNoteDate)})`}
                </span>
              </div>
              {!isEditingNote ? (
                <button
                  onClick={() => setIsEditingNote(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-[10px] font-black text-white hover:bg-amber-600 transition shadow-sm whitespace-nowrap shrink-0"
                >
                  SỬA GHI CHÚ
                </button>
              ) : (
                <button
                  onClick={handleSaveGeneralNote}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-[10px] font-black text-white hover:bg-indigo-700 transition shadow-sm whitespace-nowrap shrink-0"
                >
                  <Check className="h-3 w-3" /> LƯU GHI CHÚ
                </button>
              )}
            </div>

            {isEditingNote ? (
              <textarea
                value={generalNote}
                onChange={(e) => setGeneralNote(e.target.value)}
                placeholder="Nhập ghi chú chung riêng của bạn..."
                className="w-full h-32 rounded-3xl bg-slate-50 p-5 text-xs font-medium border-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:bg-slate-800 transition-all mb-4 shadow-inner"
              />
            ) : (
              <div className="w-full min-h-[8rem] rounded-3xl bg-slate-100/30 backdrop-blur-md p-6 text-xs font-medium border border-white/40 dark:bg-slate-900/30 dark:border-white/10 transition-all mb-4 relative shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
                <p className="text-slate-900 dark:text-slate-100 italic whitespace-pre-wrap leading-relaxed relative z-10">
                  {generalNote || "Bạn chưa có ghi chú chung nào. Nhấn 'Sửa' để bắt đầu."}
                </p>
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-transparent pointer-events-none" />
              </div>
            )}
          </div>

          {/* Final Payment Status Banner & Manual Actions */}
          {(() => {
            const txStatus = paymentInfo?.matchedTransaction?.reconcileStatus;
            const txAdminName = paymentInfo?.matchedTransaction?.matchedByAdminName;
            const effectiveStatus = txStatus === "MATCHED" ? "MATCHED" 
              : txStatus === "REJECTED" ? "REJECTED"
              : order.paymentStatus === "PAID" ? "MATCHED"
              : order.paymentStatus === "FAILED" ? "REJECTED"
              : "PENDING";

            return (
                <div className="space-y-4 sm:space-y-6">
                <div className="rounded-[2rem] bg-white p-5 sm:p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 sm:mb-6">Kết quả đối soát</h3>
                  {effectiveStatus === "MATCHED" ? (
                    <div className="flex flex-col items-center justify-center py-4 sm:py-6 gap-3 sm:gap-4 text-emerald-500">
                      <div className="rounded-full bg-emerald-100 p-3 sm:p-4 dark:bg-emerald-900/30">
                        <Check className="h-6 w-6 sm:h-8 sm:w-8" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black uppercase tracking-widest">Đã thanh toán</div>
                      {(txAdminName || order.adminNoteAuthor) && (
                        <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50/50 border border-emerald-100/50">
                          <span className="text-[10px] font-black uppercase text-slate-400">Bởi:</span>
                          <span className="text-[10px] font-black text-indigo-600 break-all">{txAdminName || order.adminNoteAuthor}</span>
                        </div>
                      )}
                      <p className="text-xs font-bold text-slate-500 text-center">Giao dịch đã được xác nhận khớp với đơn hàng.</p>
                    </div>
                  ) : effectiveStatus === "REJECTED" ? (
                    <div className="flex flex-col items-center justify-center py-4 sm:py-6 gap-3 sm:gap-4 text-rose-500">
                      <div className="rounded-full bg-rose-100 p-3 sm:p-4 dark:bg-rose-900/30">
                        <X className="h-6 w-6 sm:h-8 sm:w-8" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black uppercase tracking-widest">Thất bại</div>
                      {(txAdminName || order.adminNoteAuthor) && (
                        <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-50/50 border border-rose-100/50">
                          <span className="text-[10px] font-black uppercase text-slate-400">Bởi:</span>
                          <span className="text-[10px] font-black text-indigo-600 break-all">{txAdminName || order.adminNoteAuthor}</span>
                        </div>
                      )}
                      <p className="text-xs font-bold text-slate-500 text-center">Minh chứng hoặc giao dịch đã bị từ chối.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 sm:py-6 gap-3 sm:gap-4 text-amber-500">
                      <div className="rounded-full bg-amber-100 p-3 sm:p-4 dark:bg-amber-900/30">
                        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
                      </div>
                      <div className="text-base sm:text-lg font-black uppercase tracking-widest">ĐANG CHỜ ĐỐI SOÁT</div>
                      <p className="text-xs font-bold text-slate-500 text-center">Vui lòng thực hiện xử lý bên dưới.</p>
                    </div>
                  )}
                </div>

                {/* Manual Approval Section for Attempts */}
                {paymentInfo?.latestAttempt && effectiveStatus === "PENDING" && (
                  <div className="rounded-[2rem] bg-white p-5 sm:p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 sm:mb-6 flex items-center gap-2">
                      <Shield className="h-4 w-4 shrink-0" /> Thao tác xử lý phê duyệt
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Ghi chú xử lý / Lý do từ chối</p>
                        <textarea
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          placeholder="Nhập lý do nếu từ chối hoặc ghi chú phê duyệt..."
                          className="w-full h-24 rounded-2xl bg-slate-50 p-4 text-xs font-medium border-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:bg-slate-800 transition-all shadow-inner"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <button
                          onClick={handleApprove}
                          disabled={isProcessing}
                          className="rounded-2xl bg-indigo-600 py-3 text-xs font-black text-white hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} DUYỆT
                        </button>
                        <button
                          onClick={handleReject}
                          disabled={isProcessing}
                          className="rounded-2xl bg-rose-50 py-3 text-xs font-black text-rose-600 hover:bg-rose-100 transition-all disabled:opacity-50 border border-rose-100 flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} TỪ CHỐI
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                </div>
            );
          })()}

          {/* Bank Transaction Details & Actions */}
          {paymentInfo?.matchedTransaction && (
            <div className={`rounded-[2rem] p-5 sm:p-8 shadow-sm ring-1 mt-4 sm:mt-6 ${
              paymentInfo.matchedTransaction.reconcileStatus === "MATCHED"
                ? "bg-emerald-50 ring-emerald-200 dark:bg-emerald-900/10 dark:ring-emerald-500/20"
                : "bg-rose-50 ring-rose-200 dark:bg-rose-900/10 dark:ring-rose-500/20"
            }`}>
              <h3 className={`text-xs font-black uppercase tracking-widest mb-4 sm:mb-6 flex items-center gap-2 ${
                paymentInfo.matchedTransaction.reconcileStatus === "MATCHED" ? "text-emerald-600" : "text-rose-600"
              }`}>
                <ImageIcon className="h-4 w-4 shrink-0" />
                Chi tiết giao dịch ngân hàng
              </h3>
              <div className="space-y-3 sm:space-y-4">
                <div className={`rounded-2xl bg-white p-3 sm:p-4 dark:bg-slate-900 shadow-sm border ${
                  paymentInfo.matchedTransaction.reconcileStatus === "MATCHED" 
                    ? "border-emerald-100 dark:border-emerald-500/20" 
                    : "border-rose-100 dark:border-rose-500/20"
                }`}>
                  <p className="text-[10px] font-black uppercase text-slate-400">Mã giao dịch</p>
                  <p className="text-sm font-black text-indigo-600 break-all">{paymentInfo.matchedTransaction.transactionCode}</p>
                </div>
                <div className={`rounded-2xl bg-white p-3 sm:p-4 dark:bg-slate-900 shadow-sm border ${
                  paymentInfo.matchedTransaction.reconcileStatus === "MATCHED" 
                    ? "border-emerald-100 dark:border-emerald-500/20" 
                    : "border-rose-100 dark:border-rose-500/20"
                }`}>
                  <p className="text-[10px] font-black uppercase text-slate-400">Số tiền</p>
                  <p className={`text-sm font-black ${
                    paymentInfo.matchedTransaction.reconcileStatus === "MATCHED" ? "text-emerald-600" : "text-rose-600"
                  }`}>{formatVnd(paymentInfo.matchedTransaction.amount)}</p>
                </div>

                {/* Toggle buttons */}
                {paymentInfo.matchedTransaction.reconcileStatus === "MATCHED" ? (
                  <button
                    onClick={handleRejectMatchedTransaction}
                    disabled={isProcessing}
                    className="w-full rounded-2xl bg-rose-600 py-3 sm:py-4 text-sm font-black text-white hover:bg-rose-700 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />} CHUYỂN SANG TỪ CHỐI
                  </button>
                ) : (
                  <button
                    onClick={handleReMatchTransaction}
                    disabled={isProcessing}
                    className="w-full rounded-2xl bg-indigo-600 py-3 sm:py-4 text-sm font-black text-white hover:bg-indigo-700 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} CHUYỂN SANG KHỚP LỆNH
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
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
