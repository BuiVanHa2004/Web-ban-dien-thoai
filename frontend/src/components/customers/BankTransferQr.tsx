"use client";

import React, { useState } from "react";
import { bankTransferService } from "@/services/bankTransferService";
import { Upload, CheckCircle, Image as ImageIcon, Loader2 } from "lucide-react";

type Props = {
  orderId: number;
  orderCode: string;
  amount: number;
  qrUrl: string;
  accountName: string;
  accountNumber: string;
  bankBin: string;
  onSuccess: () => void;
};

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

export default function BankTransferQr({ 
  orderId, 
  orderCode, 
  amount, 
  qrUrl,
  accountName,
  accountNumber,
  onSuccess 
}: Props) {
  const [billImage, setBillImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [transferNote, setTransferNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBillImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleConfirm = async () => {
    if (!billImage) {
      setError("Vui lòng tải lên ảnh minh chứng thanh toán (Bill).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await bankTransferService.customerConfirmPayment(orderId, transferNote, billImage);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi gửi xác nhận.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900">
      <div className="bg-slate-900 p-4 text-center text-white sm:p-6">
        <h2 className="text-lg font-black uppercase tracking-tight sm:text-xl">Thanh toán VietQR</h2>
        <p className="mt-1 text-xs font-bold text-slate-400">Chuyển khoản thủ công & Tải ảnh hóa đơn</p>
      </div>
      
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col items-stretch gap-6 sm:gap-8 lg:flex-row lg:items-start">
          <div className="w-full shrink-0 text-center lg:w-auto">
            <div className="relative mx-auto w-fit max-w-full rounded-2xl border-4 border-slate-100 bg-white p-3 shadow-inner sm:p-4 dark:border-slate-800">
              <img 
                src={qrUrl} 
                alt="Mã QR Thanh Toán" 
                className="h-48 w-48 max-w-[min(100%,12rem)] object-contain sm:h-56 sm:w-56 lg:h-64 lg:w-64"
              />
            </div>
            <div className="mt-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:bg-blue-900/20">
                Ngân hàng Quân Đội (MB)
              </span>
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 space-y-4 w-full">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chủ tài khoản</div>
                <div className="mt-1 break-words text-sm font-black uppercase text-slate-900 dark:text-white">{accountName}</div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Số tài khoản</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="break-all text-sm font-black tracking-wider text-purple-600">{accountNumber}</span>
                  <button onClick={() => navigator.clipboard.writeText(accountNumber)} className="text-[10px] font-bold text-slate-400 hover:text-purple-600">Sao chép</button>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Số tiền</div>
                <div className="mt-1 break-words text-base font-black text-purple-600 sm:text-lg">{formatVnd(amount)}</div>
              </div>
              
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nội dung</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="break-all text-sm font-black tracking-widest text-slate-900 dark:text-white">{orderCode}</span>
                  <button onClick={() => navigator.clipboard.writeText(orderCode)} className="text-[10px] font-bold text-slate-400 hover:text-purple-600">Sao chép</button>
                </div>
              </div>
            </div>

            {/* Bill Upload Section */}
            <div className="mt-6 space-y-4">
              <div className="h-px bg-slate-100 dark:bg-slate-800" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="h-4 w-4" /> Xác nhận đã thanh toán
              </h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tải ảnh hóa đơn (Bill)</label>
                  <label className="relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50">
                    {previewUrl ? (
                      <img src={previewUrl} className="h-full w-full object-contain p-2" alt="Bill Preview" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <ImageIcon className="h-8 w-8 mb-2" />
                        <span className="text-[10px] font-bold">Chọn ảnh từ thiết bị</span>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ghi chú (Tùy chọn)</label>
                  <textarea 
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    placeholder="VD: Tôi đã chuyển từ TK techcombank..."
                    className="h-32 w-full rounded-2xl border-none bg-slate-50 p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-slate-800"
                  />
                </div>
              </div>

              {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}

              <button
                onClick={handleConfirm}
                disabled={loading || !billImage}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-purple-600 py-4 text-sm font-black text-white shadow-xl shadow-purple-500/20 transition hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                {loading ? "Đang xử lý..." : "Tôi đã thanh toán"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
