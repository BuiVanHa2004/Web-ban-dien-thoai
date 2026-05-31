export type BannerPosition = 'SLIDER' | 'TOP' | 'MIDDLE' | 'BOTTOM';

export type BannerImageDto = {
  bannerImageId?: number;
  imageUrl: string;
  title?: string | null;
  subtitle?: string | null;
  linkUrl?: string | null;
  sortOrder?: number;
};

export type BannerDto = {
  bannerId: number;
  position: BannerPosition;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  bannerImages: BannerImageDto[];
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

export type BannerCreateUpdatePayload = {
  position: BannerPosition;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  bannerImages: {
    imageUrl: string;
    title?: string | null;
    subtitle?: string | null;
    linkUrl?: string | null;
    sortOrder?: number;
  }[];
};

export type BannerUploadResponse = {
  url: string;
  objectName: string;
};

const API_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:8080';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let message = 'Có lỗi xảy ra.';
    try {
      const data = await res.json();
      console.error("[API Error Details]", data);
      message = data?.message || message;
    } catch {
      // If not JSON, try text
      const text = await res.text();
      console.error("[API Error Raw]", text);
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const bannerService = {
  getAll: async (): Promise<BannerDto[]> => {
    return request<BannerDto[]>('/banners');
  },

  getTrash: async (): Promise<BannerDto[]> => {
    return request<BannerDto[]>('/banners/trash');
  },

  getById: async (id: number): Promise<BannerDto> => {
    return request<BannerDto>(`/banners/${id}`);
  },

  create: async (payload: BannerCreateUpdatePayload): Promise<BannerDto> => {
    return request<BannerDto>('/banners', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (id: number, payload: BannerCreateUpdatePayload): Promise<BannerDto> => {
    return request<BannerDto>(`/banners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  softDelete: async (id: number): Promise<void> => {
    await request<void>(`/banners/${id}`, { method: 'DELETE' });
  },

  restore: async (id: number): Promise<void> => {
    await request<void>(`/banners/${id}/restore`, { method: 'POST' });
  },

  deleteForever: async (id: number): Promise<void> => {
    await request<void>(`/banners/${id}/forever`, { method: 'DELETE' });
  },

  uploadBannerImage: async (file: File): Promise<BannerUploadResponse> => {
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`${API_URL}/api/uploads/banners`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      let message = 'Có lỗi xảy ra.';
      try {
        const data = (await res.json()) as { message?: string };
        message = data?.message || message;
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    return (await res.json()) as BannerUploadResponse;
  },
};
