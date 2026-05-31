export type MaintenanceSettingDto = {
  settingId: number;
  maintenanceStart?: string | null;
  maintenanceEnd?: string | null;
  isMaintenance: boolean;
  updatedAt?: string | null;
};

export type UpdateMaintenancePayload = {
  isMaintenance: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
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

export const settingService = {
  getMaintenance: async (): Promise<MaintenanceSettingDto> => {
    return request<MaintenanceSettingDto>("/settings/maintenance");
  },

  updateMaintenance: async (payload: UpdateMaintenancePayload): Promise<MaintenanceSettingDto> => {
    return request<MaintenanceSettingDto>("/admin/settings/maintenance", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};
