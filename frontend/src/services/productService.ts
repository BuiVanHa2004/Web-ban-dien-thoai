export type ProductType = "NEW" | "BEST_SELLER" | "SALE";
export type DiscountType = "NONE" | "AMOUNT" | "PERCENT";

export type ProductColorDto = {
  productColorId: number;
  colorName: string;
  colorCode: string | null;
  quantity?: number;
  images?: string[];
  variants?: ProductVariantDto[];
};

export type ProductVariantDto = {
  variantId: number;
  ramGb: number | null;
  storageGb: number | null;
  quantity?: number;
  originalPrice?: number | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  finalPrice?: number | null;
};

export type ProductImageDto = {
  productImageId: number;
  imageUrl: string;
  isThumbnail?: boolean | null;
  sortOrder?: number;
  createdAt?: string | null;
};

export type ProductColorUpsertRequest = {
  productColorId?: number | null;
  colorName: string;
  colorCode?: string | null;
  quantity?: number;
  images?: string[];
  variants?: ProductVariantUpsertRequest[];
};

export type ProductVariantUpsertRequest = {
  variantId?: number | null;
  ramGb?: number | null;
  storageGb?: number | null;
  quantity?: number;
  originalPrice?: number | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  finalPrice?: number | null;
};

export type ProductSpecUpsertRequest = {
  version?: string | null;
  chip?: string | null;
  cameraFront?: string | null;
  cameraRear?: string | null;
  screen?: string | null;
  battery?: string | null;
  refreshRate?: string | null;
  fastCharge?: string | null;
  support5g?: boolean | null;
  nfc?: boolean | null;
  operatingSystem?: string | null;
  size?: string | null;
  weight?: string | null;
  material?: string | null;
  waterResistance?: string | null;
  chargingPort?: string | null;
  sim?: string | null;
  warranty?: string | null;
};

export type ProductSpecDto = {
  specId: number;
  version?: string;
  chip?: string | null;
  cameraFront?: string | null;
  cameraRear?: string | null;
  screen?: string | null;
  battery?: string | null;
  refreshRate?: string | null;
  fastCharge?: string | null;
  support5g?: boolean | null;
  nfc?: boolean | null;
  operatingSystem?: string | null;
  size?: string | null;
  weight?: string | null;
  material?: string | null;
  waterResistance?: string | null;
  chargingPort?: string | null;
  sim?: string | null;
  warranty?: string | null;
} | null;

export type ProductDto = {
  productId: number;
  productName: string;
  slug?: string | null;
  productMainImage: string | null;
  productImages?: ProductImageDto[];
  productColors?: ProductColorDto[];
  productSpecs?: ProductSpecDto[];
  categoryId: number | null;
  categoryName: string | null;
  brandId: number | null;
  brandName: string | null;
  productType: ProductType | null;
  basePrice: number;
  originalBasePrice?: number | null;
  discountType: DiscountType | null;
  discountValue: number | null;
  currentPrice: number;
  productDescribe: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

export type ProductCreateUpdatePayload = {
  productName: string;
  slug?: string | null;
  productMainImage?: string | null;
  productImages?: string[];
  productColors?: ProductColorUpsertRequest[];
  productSpec?: ProductSpecUpsertRequest | null;
  categoryId: number;
  brandId?: number | null;
  productType: ProductType;
  productDescribe?: string | null;
};

export type ProductFilterParams = {
  q?: string;
  categoryId?: number | null;
};

export type ProductUploadResponse = {
  url: string;
  objectName: string;
};

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}/api${path}`;
  console.log("[API Request]", init?.method || "GET", url, init?.body ? JSON.parse(init.body as string) : null);
  
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let message = "Có lỗi xảy ra.";
    let bodyText = "";
    try {
      bodyText = await res.text();
      const data = JSON.parse(bodyText) as { message?: string };
      message = data?.message || message;
    } catch {
      message = bodyText || `HTTP ${res.status}: ${res.statusText}`;
    }
    console.error("[API Error]", res.status, message);
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const productService = {
  getAll: async (): Promise<ProductDto[]> => {
    return request<ProductDto[]>("/products");
  },

  getAllFiltered: async (filters: ProductFilterParams): Promise<ProductDto[]> => {
    const params = new URLSearchParams();

    if (filters.q) params.set("q", filters.q);
    if (filters.categoryId != null) params.set("categoryId", String(filters.categoryId));
    const query = params.toString();
    return request<ProductDto[]>(query ? `/products?${query}` : "/products");
  },

  getTrash: async (): Promise<ProductDto[]> => {
    return request<ProductDto[]>("/products/trash");
  },

  getById: async (id: number): Promise<ProductDto> => {
    return request<ProductDto>(`/products/${id}`);
  },

  getByIds: async (ids: number[]): Promise<ProductDto[]> => {
    if (ids.length === 0) return [];
    const params = new URLSearchParams();
    ids.forEach((id) => params.append("ids", String(id)));
    return request<ProductDto[]>(`/products/batch?${params.toString()}`);
  },

  create: async (payload: ProductCreateUpdatePayload): Promise<ProductDto> => {
    return request<ProductDto>("/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update: async (id: number, payload: ProductCreateUpdatePayload): Promise<ProductDto> => {
    return request<ProductDto>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  softDelete: async (id: number): Promise<void> => {
    await request<void>(`/products/${id}`, { method: "DELETE" });
  },

  restore: async (id: number): Promise<void> => {
    await request<void>(`/products/${id}/restore`, { method: "PATCH" });
  },

  deleteForever: async (id: number): Promise<void> => {
    await request<void>(`/products/${id}/force`, { method: "DELETE" });
  },

  uploadProductImage: async (file: File): Promise<ProductUploadResponse> => {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${API_URL}/api/uploads/products`, {
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

    return (await res.json()) as ProductUploadResponse;
  },

  deleteProductImage: async (imageUrl: string): Promise<void> => {
    const res = await fetch(`${API_URL}/api/uploads/products/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: imageUrl }),
    });

    if (!res.ok) {
      let message = "Có lỗi xảy ra khi xóa ảnh.";
      try {
        const data = (await res.json()) as { message?: string };
        message = data?.message || message;
      } catch {
        // ignore
      }
      throw new Error(message);
    }
  },
};
