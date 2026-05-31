export type CategoryDto = {
  categoryId: number;
  categoryName: string;
  slug?: string | null;
  categoryDescription?: string | null;
  categoryImages?: string[];
  priceSegments?: Array<{
    priceSegmentId: number;
    segmentName: string;
    minPrice: number | string;
    maxPrice: number | string | null;
  }>;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

export type CategoryCreateUpdatePayload = {
  categoryName: string;
  slug?: string | null;
  categoryDescription?: string | null;
  categoryImages?: string[];
  priceSegmentMin?: number | null;
  priceSegmentMax?: number | null;
};

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
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

export const categoryService = {
  getAll: async (): Promise<CategoryDto[]> => {
    return request<CategoryDto[]>("/categories");
  },

  getById: async (id: number): Promise<CategoryDto> => {
    return request<CategoryDto>(`/categories/${id}`);
  },

  create: async (payload: CategoryCreateUpdatePayload): Promise<CategoryDto> => {
    return request<CategoryDto>("/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update: async (id: number, payload: CategoryCreateUpdatePayload): Promise<CategoryDto> => {
    return request<CategoryDto>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  delete: async (id: number): Promise<void> => {
    await request<void>(`/categories/${id}`, { method: "DELETE" });
  },

  softDelete: async (id: number): Promise<void> => {
    await request<void>(`/categories/${id}/soft-delete`, { method: "PATCH" });
  },

  getTrash: async (): Promise<CategoryDto[]> => {
    return request<CategoryDto[]>("/categories/trash");
  },

  restore: async (id: number): Promise<void> => {
    await request<void>(`/categories/${id}/restore`, { method: "PATCH" });
  },

  deleteForever: async (id: number): Promise<void> => {
    await request<void>(`/categories/${id}/force`, { method: "DELETE" });
  },
};
