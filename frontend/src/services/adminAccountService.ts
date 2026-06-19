export type RoleDto = {
  roleId: number;
  roleName: "ADMIN" | "STAFF" | string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminAccountDto = {
  accountId: number;
  fullName: string;
  username: string;
  password: string;
  roleId: number | null;
  roleName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

export type AdminAccountCreateUpdatePayload = {
  fullName: string;
  username: string;
  password?: string | null;
  roleId: number;
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

export const roleService = {
  getAll: async (): Promise<RoleDto[]> => {
    return request<RoleDto[]>("/roles");
  },
};

export const adminAccountService = {
  getAll: async (): Promise<AdminAccountDto[]> => {
    return request<AdminAccountDto[]>("/admin-accounts");
  },

  getTrash: async (): Promise<AdminAccountDto[]> => {
    return request<AdminAccountDto[]>("/admin-accounts/trash");
  },

  getById: async (id: number): Promise<AdminAccountDto> => {
    return request<AdminAccountDto>(`/admin-accounts/${id}`);
  },

  create: async (payload: AdminAccountCreateUpdatePayload): Promise<AdminAccountDto> => {
    return request<AdminAccountDto>("/admin-accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update: async (id: number, payload: AdminAccountCreateUpdatePayload): Promise<AdminAccountDto> => {
    return request<AdminAccountDto>(`/admin-accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  softDelete: async (id: number): Promise<void> => {
    await request<void>(`/admin-accounts/${id}`, { method: "DELETE" });
  },

  restore: async (id: number): Promise<void> => {
    await request<void>(`/admin-accounts/${id}/restore`, { method: "PATCH" });
  },

  deleteForever: async (id: number): Promise<void> => {
    await request<void>(`/admin-accounts/${id}/force`, { method: "DELETE" });
  },
};
