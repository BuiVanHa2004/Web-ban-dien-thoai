import { authenticatedFetch, getAuthHeader } from "@/utils/authUtils";

export type OrderStatus =
  | "PENDING_CONFIRM"
  | "PENDING_PAYMENT_CONFIRMATION"
  | "CONFIRMED"
  | "SHIPPING"
  | "PENDING_PICKUP"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus = "UNPAID" | "PENDING" | "WAITING_CONFIRM" | "PAID" | "FAILED";

export type OrderDto = {
  orderId: number;
  orderCode?: string | null;
  customerId?: number | null;
  customerName?: string | null;
  email?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  shippingAddress?: string | null;
  productName?: string | null;
  orderStatus?: OrderStatus | string | null;
  paymentStatus?: PaymentStatus | string | null;
  paymentMethod?: string | null;
  totalAmount?: number | null;
  items?: Array<{
    orderItemId?: number | null;
    productId?: number | null;
    variantId?: number | null;
    productName?: string | null;
    productPrice?: number | string | null;
    originalPrice?: number | string | null;
    ramGb?: number | string | null;
    storageGb?: number | string | null;
    colorName?: string | null;
    quantity?: number | null;
    imageUrl?: string | null;
  }>;
  rating?: number | null;
  comment?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  waitingConfirm?: boolean;
  adminNote?: string | null;
  adminNoteAuthor?: string | null;
  adminNoteDate?: string | null;
  cancelReasonId?: number | null;
  cancelNote?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  cancelReasonName?: string | null;
  cancelledByAdminId?: number | null;
  cancelledByName?: string | null;
};

export type CreateOrderPayload = {
  customerId: number;
  receiverName: string;
  receiverPhone: string;
  shippingAddress: string;
  items: Array<{
    productId: number;
    productColorId?: number | null;
    productVariantId?: number | null;
    productColor?: string | null; // legacy display field
    quantity: number;
    imageUrl?: string | null;
  }>;
  paymentMethod?: string;
};

export type UpdateOrderStatusPayload = {
  status: OrderStatus | string;
};

export type CancelOrderPayload = {
  customerId: number;
  reasonId: number;
  cancelNote?: string;
};

export type ReasonDto = {
  reasonId: number;
  reasonName: string;
  allowInput: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

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

export const orderService = {
  getAll: async (customerId?: number): Promise<OrderDto[]> => {
    const qs = customerId != null ? `?customerId=${encodeURIComponent(String(customerId))}` : "";
    return request<OrderDto[]>(`/orders${qs}`);
  },

  getTrash: async (customerId?: number): Promise<OrderDto[]> => {
    const qs = customerId != null ? `?customerId=${encodeURIComponent(String(customerId))}` : "";
    return request<OrderDto[]>(`/orders/trash${qs}`);
  },

  getById: async (id: number): Promise<OrderDto> => {
    return request<OrderDto>(`/orders/${id}`);
  },

  create: async (payload: CreateOrderPayload): Promise<OrderDto> => {
    return request<OrderDto>("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  payCod: async (orderId: number, customerId: number): Promise<OrderDto> => {
    return request<OrderDto>(`/orders/${orderId}/pay/cod`, {
      method: "POST",
      body: JSON.stringify({ customerId }),
    });
  },

  payOnline: async (orderId: number, customerId: number): Promise<OrderDto> => {
    return request<OrderDto>(`/orders/${orderId}/pay/online`, {
      method: "POST",
      body: JSON.stringify({ customerId }),
    });
  },

  updateStatus: async (id: number, payload: UpdateOrderStatusPayload): Promise<void> => {
    await request<void>(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  softDelete: async (id: number): Promise<void> => {
    await request<void>(`/orders/${id}`, { method: "DELETE" });
  },

  restore: async (id: number): Promise<void> => {
    await request<void>(`/orders/${id}/restore`, { method: "PATCH" });
  },

  deleteForever: async (id: number): Promise<void> => {
    await request<void>(`/orders/${id}/force`, { method: "DELETE" });
  },

  cancelOrder: async (id: number, payload: CancelOrderPayload): Promise<OrderDto> => {
    return request<OrderDto>(`/orders/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getReasons: async (type: string): Promise<ReasonDto[]> => {
    return request<ReasonDto[]>(`/reasons?type=${encodeURIComponent(type)}`);
  },

  getAdminReasons: async (): Promise<ReasonDto[]> => {
    return request<ReasonDto[]>("/admin/reasons/order-cancel");
  },

  adminCancelOrder: async (id: number, payload: { reasonId: number; cancelNote?: string }): Promise<OrderDto> => {
    return request<OrderDto>(`/admin/orders/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
