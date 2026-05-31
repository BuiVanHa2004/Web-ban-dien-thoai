const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

export type BankTransactionDto = {
  transactionId: number;
  transactionCode?: string;
  accountNumber?: string;
  bankName?: string;
  amount: number;
  transferContent?: string;
  transferTime?: string;
  rawData?: string;
  isMatched: boolean;
  matchedOrderId?: number | null;
  matchedOrderCode?: string | null;
  matchedByAdminId?: number | null;
  matchedByAdminName?: string | null;
  reconcileStatus?: string;
  createdAt?: string;
  deletedAt?: string;
};

export type SelectableOrderDto = {
  orderId: number;
  orderCode: string;
  receiverName: string;
  totalAmount: number;
  orderStatus?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
};

export type CreateBankTransactionPayload = {
  transactionCode?: string;
  accountNumber?: string;
  bankName?: string;
  amount: number;
  transferContent?: string;
  transferTime?: string;
  rawData?: string;
};

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
  if (!res.ok) {
    let message = "Có lỗi xảy ra.";
    try {
      const data = (await res.json()) as { message?: string; error?: string };
      message = data.message || data.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  
  if (res.status === 204) return null as any;
  const text = await res.text();
  return text ? JSON.parse(text) : (null as any);
}

export const adminBankTransactionService = {
  getAll: (matched?: boolean, trash?: boolean) => {
    const params = new URLSearchParams();
    if (matched !== undefined) params.append("matched", String(matched));
    if (trash !== undefined) params.append("trash", String(trash));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<BankTransactionDto[]>(`/admin/bank-transactions${qs}`);
  },
  create: (payload: CreateBankTransactionPayload) =>
    request<BankTransactionDto>("/admin/bank-transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  autoMatch: () =>
    request<Array<{ transactionId: number; orderId: number; orderCode: string; action: string }>>(
      "/admin/bank-transactions/auto-match",
      { method: "POST" }
    ),
  confirmMatch: (transactionId: number, orderId: number, adminId: number = 1, note?: string) => {
    const params = new URLSearchParams();
    params.append("orderId", String(orderId));
    params.append("adminId", String(adminId));
    if (note) params.append("note", note);
    return request<BankTransactionDto>(`/admin/bank-transactions/${transactionId}/confirm-match?${params.toString()}`, {
      method: "POST",
    });
  },
  reject: (transactionId: number, orderId?: number, adminId?: number, note?: string) => {
    const params = new URLSearchParams();
    if (orderId) params.append("orderId", String(orderId));
    if (adminId) params.append("adminId", String(adminId));
    if (note) params.append("note", note);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<BankTransactionDto>(`/admin/bank-transactions/${transactionId}/reject${qs}`, { method: "POST" });
  },
  delete: (transactionId: number) =>
    request<void>(`/admin/bank-transactions/${transactionId}`, { method: "DELETE" }),
  restore: (transactionId: number) =>
    request<void>(`/admin/bank-transactions/${transactionId}/restore`, { method: "POST" }),
  hardDelete: (transactionId: number) =>
    request<void>(`/admin/bank-transactions/${transactionId}/hard`, { method: "DELETE" }),
  getSelectableOrders: () =>
    request<SelectableOrderDto[]>("/admin/bank-transactions/selectable-orders"),
  reMatch: (transactionId: number, adminId: number, note?: string) => {
    const params = new URLSearchParams();
    params.append("adminId", String(adminId));
    if (note) params.append("note", note);
    return request<BankTransactionDto>(`/admin/bank-transactions/${transactionId}/re-match?${params.toString()}`, {
      method: "POST",
    });
  },
};
