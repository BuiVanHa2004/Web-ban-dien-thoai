export type NewsDto = {
  newsId: number;
  newsTitle: string;
  slug?: string | null;
  newsDescribe: string | null;
  newsImages?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

export type NewsCreateUpdatePayload = {
  newsTitle: string;
  slug?: string | null;
  newsDescribe?: string | null;
  newsImages?: string[];
};

export type NewsUploadResponse = {
  url: string;
  objectName: string;
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

export const newsService = {
  getAll: async (): Promise<NewsDto[]> => {
    return request<NewsDto[]>("/news");
  },

  getTrash: async (): Promise<NewsDto[]> => {
    return request<NewsDto[]>("/news/trash");
  },

  getById: async (id: number): Promise<NewsDto> => {
    return request<NewsDto>(`/news/${id}`);
  },

  create: async (payload: NewsCreateUpdatePayload): Promise<NewsDto> => {
    return request<NewsDto>("/news", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update: async (id: number, payload: NewsCreateUpdatePayload): Promise<NewsDto> => {
    return request<NewsDto>(`/news/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  softDelete: async (id: number): Promise<void> => {
    await request<void>(`/news/${id}`, { method: "DELETE" });
  },

  restore: async (id: number): Promise<void> => {
    await request<void>(`/news/${id}/restore`, { method: "PATCH" });
  },

  deleteForever: async (id: number): Promise<void> => {
    await request<void>(`/news/${id}/force`, { method: "DELETE" });
  },

  uploadNewsImage: async (file: File): Promise<NewsUploadResponse> => {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${API_URL}/api/uploads/news`, {
      method: "POST",
      body: form,
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

    return (await res.json()) as NewsUploadResponse;
  },
};
