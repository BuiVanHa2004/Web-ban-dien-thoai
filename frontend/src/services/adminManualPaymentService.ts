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

function getAuthHeader(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  return token ? `Bearer ${token}` : null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = getAuthHeader();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
      ...(init?.headers || {}),
    },
  });
  
  if (res.status === 204) return {} as T;
  
  if (!res.ok) {
    let message = "Có lỗi xảy ra.";
    try {
      const data = await res.json();
      message = data.message || data.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
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
