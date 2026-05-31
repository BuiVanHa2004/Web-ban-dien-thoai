export type ProductEvaluateStatDto = {
  productId: number;
  productName: string;
  reviewCount: number | string;
  totalStars: number | string;
  productImageUrl?: string | null;
};

export type ProductEvaluateDetailDto = {
  id: number;
  productId: number;
  customerName?: string | null;
  customerEmail?: string | null;
  rating: number;
  content?: string | null;
  createdAt?: string | null;
  adminReply?: string | null;
  adminRepliedAt?: string | null;
  productName?: string | null;
  colorName?: string | null;
  ramGb?: number | null;
  storageGb?: number | null;
  quantity?: number | null;
};

export type ReplyEvaluatePayload = {
  reply: string;
};

export type EvaluateImageDto = {
  evaluateImageId: number;
  imageUrl: string;
  createdAt?: string | null;
};

export type CustomerEvaluateDto = {
  evaluateId: number;
  orderItemId: number;
  productId: number;
  rating: number;
  content?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  images?: EvaluateImageDto[];
  adminReply?: string | null;
  adminRepliedAt?: string | null;
};

export type ProductEvaluateCommentDto = {
  evaluateId: number;
  productId: number;
  orderItemId: number;
  customerName?: string | null;
  rating: number;
  content?: string | null;
  adminReply?: string | null;
  adminRepliedAt?: string | null;
  createdAt?: string | null;
  images?: EvaluateImageDto[];
  productName?: string | null;
  colorName?: string | null;
  ramGb?: number | null;
  storageGb?: number | null;
  quantity?: number | null;
};

export type UpsertCustomerEvaluatePayload = {
  customerId: number;
  productId: number;
  rating: number;
  content?: string | null;
  images?: File[];
  existingImageUrls?: string[];
};

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let message = "Có lỗi xảy ra.";
    try {
      const data = (await res.json()) as { message?: string };
      message = data?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const evaluateService = {
  getByProductIdForCustomerView: async (
    productId: number
  ): Promise<ProductEvaluateCommentDto[]> => {
    return request<ProductEvaluateCommentDto[]>(`/evaluates/products/${productId}`);
  },

  getByProductIdWithImages: async (
    productId: number
  ): Promise<ProductEvaluateCommentDto[]> => {
    return request<ProductEvaluateCommentDto[]>(`/evaluates/products/${productId}/with-images`);
  },

  getByOrderIdForCustomer: async (
    orderId: number,
    customerId: number
  ): Promise<CustomerEvaluateDto[]> => {
    return request<CustomerEvaluateDto[]>(
      `/evaluates/orders/${orderId}?customerId=${encodeURIComponent(String(customerId))}`
    );
  },

  upsertByOrderItemForCustomer: async (
    orderItemId: number,
    payload: UpsertCustomerEvaluatePayload
  ): Promise<CustomerEvaluateDto> => {
    const formData = new FormData();
    formData.append("customerId", String(payload.customerId));
    formData.append("productId", String(payload.productId));
    formData.append("rating", String(payload.rating));
    if (payload.content) formData.append("content", payload.content);
    if (payload.existingImageUrls && payload.existingImageUrls.length > 0) {
      payload.existingImageUrls.forEach((url) => formData.append("existingImageUrls", url));
    }
    if (payload.images && payload.images.length > 0) {
      payload.images.forEach((img) => formData.append("images", img));
    }

    const res = await fetch(`${API_URL}/api/evaluates/order-items/${orderItemId}`, {
      method: "PUT",
      body: formData,
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "Unknown error");
      throw new Error(err || "Failed to save evaluate");
    }
    return res.json();
  },

  deleteByOrderItemForCustomer: async (
    orderItemId: number,
    customerId: number
  ): Promise<void> => {
    await request<void>(
      `/evaluates/order-items/${orderItemId}?customerId=${encodeURIComponent(String(customerId))}`,
      { method: "DELETE" }
    );
  },

  getProductStats: async (): Promise<ProductEvaluateStatDto[]> => {
    return request<ProductEvaluateStatDto[]>("/admin/evaluates/products");
  },

  getByProductId: async (productId: number): Promise<ProductEvaluateDetailDto[]> => {
    return request<ProductEvaluateDetailDto[]>(`/admin/evaluates/products/${productId}`);
  },

  deleteComment: async (evaluateId: number): Promise<void> => {
    await request<void>(`/admin/evaluates/${evaluateId}`, { method: "DELETE" });
  },

  reply: async (evaluateId: number, payload: ReplyEvaluatePayload): Promise<void> => {
    await request<void>(`/admin/evaluates/${evaluateId}/reply`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteReply: async (evaluateId: number): Promise<void> => {
    await request<void>(`/admin/evaluates/${evaluateId}/reply`, {
      method: "DELETE",
    });
  },
};
