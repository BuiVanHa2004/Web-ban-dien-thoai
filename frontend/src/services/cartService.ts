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

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const url = `${API_URL}/api${path}`;
  const res = await fetch(url, init);
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && (data as any).message) ||
      (data && typeof data === "object" && "error" in data && (data as any).error) ||
      "Đã xảy ra lỗi.";
    throw new Error(String(message));
  }
  return data as T;
}

function getAuthHeader(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  return token ? `Bearer ${token}` : null;
}

export const cartService = {
  getMyCart: async (): Promise<CartDto> => {
    const auth = getAuthHeader();
    if (!auth) throw new Error("Vui lòng đăng nhập.");
    return requestJson<CartDto>("/customer/cart", {
      method: "GET",
      headers: { Authorization: auth },
    });
  },

  addItem: async (req: CartUpsertItemRequest): Promise<CartDto> => {
    const auth = getAuthHeader();
    if (!auth) throw new Error("Vui lòng đăng nhập.");
    return requestJson<CartDto>("/customer/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(req),
    });
  },

  setQuantity: async (req: CartUpsertItemRequest): Promise<CartDto> => {
    const auth = getAuthHeader();
    if (!auth) throw new Error("Vui lòng đăng nhập.");
    return requestJson<CartDto>("/customer/cart/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(req),
    });
  },

  removeItem: async (req: CartUpsertItemRequest): Promise<CartDto> => {
    const auth = getAuthHeader();
    if (!auth) throw new Error("Vui lòng đăng nhập.");
    return requestJson<CartDto>("/customer/cart/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(req),
    });
  },

  clear: async (): Promise<CartDto> => {
    const auth = getAuthHeader();
    if (!auth) throw new Error("Vui lòng đăng nhập.");
    return requestJson<CartDto>("/customer/cart", {
      method: "DELETE",
      headers: { Authorization: auth },
    });
  },
};

