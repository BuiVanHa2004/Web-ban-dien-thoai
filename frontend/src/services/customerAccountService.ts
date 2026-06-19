export type CustomerAccountDto = {
  customerId: number;
  fullName: string;
  username: string;
  password: string;
  email: string;
  googleId?: string | null;
  phone: string | null;
  address: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

export type CustomerAccountCreateUpdatePayload = {
  fullName: string;
  username: string;
  password?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
};
import { authenticatedFetch } from "@/utils/authUtils";

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return authenticatedFetch<T>(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

export const customerAccountService = {
  getAll: async (): Promise<CustomerAccountDto[]> => {
    return request<CustomerAccountDto[]>("/customers");
  },

  getTrash: async (): Promise<CustomerAccountDto[]> => {
    return request<CustomerAccountDto[]>("/customers/trash");
  },

  getById: async (id: number): Promise<CustomerAccountDto> => {
    return request<CustomerAccountDto>(`/customers/${id}`);
  },

  create: async (payload: CustomerAccountCreateUpdatePayload): Promise<CustomerAccountDto> => {
    return request<CustomerAccountDto>("/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update: async (id: number, payload: CustomerAccountCreateUpdatePayload): Promise<CustomerAccountDto> => {
    return request<CustomerAccountDto>(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  changePassword: async (id: number, currentPassword: string, newPassword: string): Promise<void> => {
    await request<void>(`/customers/${id}/password`, {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  softDelete: async (id: number): Promise<void> => {
    await request<void>(`/customers/${id}`, { method: "DELETE" });
  },

  restore: async (id: number): Promise<void> => {
    await request<void>(`/customers/${id}/restore`, { method: "PATCH" });
  },

  deleteForever: async (id: number): Promise<void> => {
    await request<void>(`/customers/${id}/force`, { method: "DELETE" });
  },
};
