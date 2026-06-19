import { authenticatedFetch } from "@/utils/authUtils";

export type TopProductSoldDto = {
  productId: number;
  productName: string;
  quantitySold: number | string;
};

export type SummaryStatisticalDto = {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  paymentStatusDistribution: Record<string, number>;
  paymentMethodDistribution: Record<string, number>;
};

export type MonthlyRevenueDto = {
  month: string;
  revenue: number;
  orderCount: number;
};

export type OrderStatusCountDto = {
  status: string;
  count: number;
};

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

type StatisticalFilterParams = {
  brandId?: number;
  categoryId?: number;
  paymentMethod?: string;
  startDate?: string; // Format: YYYY-MM-DD
  endDate?: string;   // Format: YYYY-MM-DD
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return authenticatedFetch<T>(`${API_URL}/api${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

export const statisticalService = {
  getTopProductsSold: async (limit = 5, filters: StatisticalFilterParams = {}): Promise<TopProductSoldDto[]> => {
    const search = new URLSearchParams({
      limit: String(limit),
    });
    if (typeof filters.brandId === "number") search.set("brandId", String(filters.brandId));
    if (typeof filters.categoryId === "number") search.set("categoryId", String(filters.categoryId));
    if (filters.paymentMethod) search.set("paymentMethod", filters.paymentMethod);
    if (filters.startDate) search.set("startDate", filters.startDate);
    if (filters.endDate) search.set("endDate", filters.endDate);
    const qs = `?${search.toString()}`;
    return request<TopProductSoldDto[]>(`/admin/statistical/top-products${qs}`);
  },

  getSummary: async (filters: StatisticalFilterParams = {}): Promise<SummaryStatisticalDto> => {
    const search = new URLSearchParams();
    if (typeof filters.brandId === "number") search.set("brandId", String(filters.brandId));
    if (typeof filters.categoryId === "number") search.set("categoryId", String(filters.categoryId));
    if (filters.paymentMethod) search.set("paymentMethod", filters.paymentMethod);
    if (filters.startDate) search.set("startDate", filters.startDate);
    if (filters.endDate) search.set("endDate", filters.endDate);
    const qs = search.toString();
    return request<SummaryStatisticalDto>(`/admin/statistical/summary${qs ? `?${qs}` : ""}`);
  },

  getMonthlyRevenue: async (months = 6, filters: StatisticalFilterParams = {}): Promise<MonthlyRevenueDto[]> => {
    const search = new URLSearchParams({
      months: String(months),
    });
    if (typeof filters.brandId === "number") search.set("brandId", String(filters.brandId));
    if (typeof filters.categoryId === "number") search.set("categoryId", String(filters.categoryId));
    if (filters.paymentMethod) search.set("paymentMethod", filters.paymentMethod);
    if (filters.startDate) search.set("startDate", filters.startDate);
    if (filters.endDate) search.set("endDate", filters.endDate);
    const qs = `?${search.toString()}`;
    return request<MonthlyRevenueDto[]>(`/admin/statistical/monthly-revenue${qs}`);
  },

  getStatusDistribution: async (filters: StatisticalFilterParams = {}): Promise<OrderStatusCountDto[]> => {
    const search = new URLSearchParams();
    if (typeof filters.brandId === "number") search.set("brandId", String(filters.brandId));
    if (typeof filters.categoryId === "number") search.set("categoryId", String(filters.categoryId));
    if (filters.paymentMethod) search.set("paymentMethod", filters.paymentMethod);
    if (filters.startDate) search.set("startDate", filters.startDate);
    if (filters.endDate) search.set("endDate", filters.endDate);
    const qs = search.toString();
    return request<OrderStatusCountDto[]>(`/admin/statistical/status-distribution${qs ? `?${qs}` : ""}`);
  },
};
