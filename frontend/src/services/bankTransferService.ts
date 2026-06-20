import { getAuthHeader, authenticatedFetch } from "@/utils/authUtils";
import { type BankTransactionDto } from "./adminBankTransactionService";

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

export type PaymentAttemptDto = {
  attemptId: number;
  orderId: number;
  paymentMethod: string;
  status: "PENDING" | "WAITING_CONFIRM" | "SUCCESS" | "FAILED" | string;
  qrContent: string;
  amount: number;
  transferImageUrl?: string;
  transferNote?: string;
  customerConfirmedAt?: string;
  processingByAdminId?: number | null;
  processingByAdminName?: string | null;
  createdAt: string;
  reviewedByAdminId?: number | null;
  reviewedAt?: string | null;
  rejectReason?: string | null;
  riskLevel?: string;
  isSuspicious?: boolean;
};

export type PaymentQRResponse = {
  qrUrl: string;
  orderCode: string;
  amount: number;
  accountName: string;
  accountNumber: string;
  bankBin: string;
};

export type BankTransferStatusDto = {
  orderId: number;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  latestAttempt?: PaymentAttemptDto | null;
  matchedTransaction?: BankTransactionDto;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return authenticatedFetch<T>(`${API_URL}/api${path}`, {
    ...init,
    cache: "no-store",
  });
}

export const bankTransferService = {
  getQRInfo: (orderId: number) =>
    request<PaymentQRResponse>(`/payments/bank-transfer/orders/${orderId}/qr-info`),

  customerConfirmPayment: (orderId: number, transferNote: string, billImage?: File) => {
    const formData = new FormData();
    formData.append("orderId", orderId.toString());
    if (transferNote) formData.append("transferNote", transferNote);
    if (billImage) formData.append("billImage", billImage);

    return request<PaymentAttemptDto>(`/payments/bank-transfer/confirm-transfer`, {
      method: "POST",
      body: formData,
    });
  },

  getStatus: (orderId: number) =>
    request<BankTransferStatusDto>(`/payments/bank-transfer/orders/${orderId}/status`),

  confirmPayment: (orderId: number) =>
    request<void>(`/admin/payments/bank-transfer/confirm`, {
      method: "POST",
      body: JSON.stringify({ orderId }),
      headers: {
        "Content-Type": "application/json",
      },
    }),
};
