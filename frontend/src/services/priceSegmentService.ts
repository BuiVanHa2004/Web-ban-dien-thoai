export type PriceSegmentDto = {
  priceSegmentId: number;
  segmentName: string;
  minPrice: number | string;
  maxPrice: number | string | null;
  segmentDescription?: string | null;
  sortOrder?: number | null;
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

export const priceSegmentService = {
  getAll: async (): Promise<PriceSegmentDto[]> => {
    return request<PriceSegmentDto[]>("/price-segments");
  },

  create: async (payload: {
    segmentName: string;
    minPrice: number;
    maxPrice?: number | null;
    segmentDescription?: string | null;
    sortOrder?: number | null;
  }): Promise<PriceSegmentDto> => {
    return request<PriceSegmentDto>("/price-segments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
