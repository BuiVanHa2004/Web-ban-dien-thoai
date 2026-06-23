export type BrandDto = {
  brandId: number;
  brandName: string;
  slug?: string | null;
  brandDescription?: string | null;
  brandImages?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

export type BrandCreateUpdatePayload = {
  brandName: string;
  slug?: string | null;
  brandDescription?: string | null;
  brandImages: string[];
};

export type BrandUploadResponse = {
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

export const brandService = {
  getAll: async (): Promise<BrandDto[]> => {
    return request<BrandDto[]>('/brands');
  },

  getTrash: async (): Promise<BrandDto[]> => {
    return request<BrandDto[]>('/brands/trash');
  },

  getById: async (id: number): Promise<BrandDto> => {
    return request<BrandDto>(`/brands/${id}`);
  },

  create: async (payload: BrandCreateUpdatePayload): Promise<BrandDto> => {
    return request<BrandDto>('/brands', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (id: number, payload: BrandCreateUpdatePayload): Promise<BrandDto> => {
    return request<BrandDto>(`/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  softDelete: async (id: number): Promise<void> => {
    await request<void>(`/brands/${id}`, { method: 'DELETE' });
  },

  restore: async (id: number): Promise<void> => {
    await request<void>(`/brands/${id}/restore`, { method: 'PATCH' });
  },

  deleteForever: async (id: number): Promise<void> => {
    await request<void>(`/brands/${id}/force`, { method: 'DELETE' });
  },

  uploadBrandImage: async (file: File): Promise<BrandUploadResponse> => {
    console.log('========== UPLOAD BRAND IMAGE REQUEST ==========');
    console.log('File name:', file.name);
    console.log('File size:', file.size);
    console.log('File type:', file.type);
    console.log('API URL:', `${API_URL}/api/uploads/brands`);
    
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`${API_URL}/api/uploads/brands`, {
      method: 'POST',
      body: form,
    });

    console.log('Response status:', res.status);
    console.log('Response ok:', res.ok);

    if (!res.ok) {
      let message = 'Có lỗi xảy ra.';
      try {
        const data = (await res.json()) as { message?: string };
        message = data?.message || message;
      } catch {
        // ignore
      }
      console.error('Upload failed:', message);
      throw new Error(message);
    }

    const result = (await res.json()) as BrandUploadResponse;
    console.log('Upload success:', result);
    console.log('================================================');
    return result;
  },
};
