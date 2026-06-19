import { getAuthHeader, authenticatedFetch } from "@/utils/authUtils";
import type { CartItemDto } from "@/common/types/cart";

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

export type CartDto = {
  customerId: number;
  items: CartItemDto[];
  totalQuantity: number;
};

type CartUpsertItemRequest = {
  productId: number;
  productColorId?: number | null;
  productVariantId?: number | null;
  quantity?: number | null;
};

async function requestJson<T>(path: string, init: RequestInit, skipAutoLogout = false): Promise<T> {
  const url = `${API_URL}/api${path}`;
  return authenticatedFetch<T>(url, init, skipAutoLogout);
}

export const cartService = {
  getMyCart: async (): Promise<CartDto> => {
    const auth = getAuthHeader();
    if (!auth) throw new Error("Vui lòng đăng nhập.");
    // Skip auto logout to allow graceful fallback to localStorage
    return requestJson<CartDto>("/customer/cart", {
      method: "GET",
    }, true);
  },

  addItem: async (req: CartUpsertItemRequest): Promise<CartDto> => {
    const auth = getAuthHeader();
    if (!auth) throw new Error("Vui lòng đăng nhập.");
    return requestJson<CartDto>("/customer/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  },

  setQuantity: async (req: CartUpsertItemRequest): Promise<CartDto> => {
    const auth = getAuthHeader();
    if (!auth) throw new Error("Vui lòng đăng nhập.");
    return requestJson<CartDto>("/customer/cart/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  },

  removeItem: async (req: CartUpsertItemRequest): Promise<CartDto> => {
    const auth = getAuthHeader();
    if (!auth) throw new Error("Vui lòng đăng nhập.");
    return requestJson<CartDto>("/customer/cart/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  },

  clear: async (): Promise<CartDto> => {
    const auth = getAuthHeader();
    if (!auth) throw new Error("Vui lòng đăng nhập.");
    return requestJson<CartDto>("/customer/cart", {
      method: "DELETE",
    });
  },
};

