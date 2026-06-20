import { getAuthHeader, authenticatedFetch } from "@/utils/authUtils";

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

export interface PaymentAttempt {
  attemptId: number;
  orderId: number;
  paymentMethod: string;
  status: string;
  qrContent: string;
  transferImageUrl: string;
  transferNote: string;
  customerConfirmedAt: string;
  amount: number;
  riskLevel: string;
  isSuspicious: boolean;
  processingByAdminId: number | null;
  processingByAdminName: string | null;
  lockExpiresAt: string | null;
  createdAt: string;
  reviewedByAdminId: number | null;
  reviewedByAdminName: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
}

export interface PaymentLog {
  logId: number;
  orderId: number;
  actionType: string;
  oldStatus: string;
  newStatus: string;
  note: string;
  adminId: number;
  adminName: string | null;
  createdAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return authenticatedFetch<T>(`${API_URL}/api${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

export const adminManualPaymentService = {
  getAttempts: (status?: string) =>
    request<PaymentAttempt[]>(`/admin/payments/bank-transfer/attempts${status ? `?status=${status}` : ""}`),

  lock: (attemptId: number, adminId: number) =>
    request<void>(`/admin/payments/bank-transfer/lock/${attemptId}?adminId=${adminId}`, { method: "POST" }),

  release: (attemptId: number, adminId: number) =>
    request<void>(`/admin/payments/bank-transfer/release/${attemptId}?adminId=${adminId}`, { method: "POST" }),

  approve: (attemptId: number, adminId: number, note: string) =>
    request<void>(`/admin/payments/bank-transfer/approve/${attemptId}?adminId=${adminId}`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),

  reject: (attemptId: number, adminId: number, note: string) =>
    request<void>(`/admin/payments/bank-transfer/reject/${attemptId}?adminId=${adminId}`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),

  logView: (attemptId: number, adminId: number) =>
    request<void>(`/admin/payments/bank-transfer/log-view/${attemptId}?adminId=${adminId}`, { method: "POST" }),

  getLogs: (orderId: number) =>
    request<PaymentLog[]>(`/admin/payments/bank-transfer/logs/${orderId}`),

  updateOrderNote: (orderId: number, note: string, authorName: string) =>
    request<void>(`/admin/payments/bank-transfer/order/${orderId}/note`, {
      method: "PATCH",
      body: JSON.stringify({ note, authorName }),
    }),
};
