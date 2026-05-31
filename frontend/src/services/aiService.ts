export type AiAdviceRequest = {
  message: string;
  topK?: number | null;
};

export type AiCompareRequest = {
  productIds: number[];
  question?: string | null;
};

export type AiResponse = {
  answer: string;
  recommendedProductIds: number[];
  comparedProductIds: number[];
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

export const aiService = {
  advice: async (payload: AiAdviceRequest): Promise<AiResponse> => {
    return request<AiResponse>("/ai/advice", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  compare: async (payload: AiCompareRequest): Promise<AiResponse> => {
    return request<AiResponse>("/ai/compare", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
