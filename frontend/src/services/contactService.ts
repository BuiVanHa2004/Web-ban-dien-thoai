export type ContactDto = {
  contactId: number;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  subject?: string | null;
  message?: string | null;
  createdAt?: string | null;
  deletedAt?: string | null;
  imageUrls?: string[] | null;
  customerId?: number | null;
  currentFullName?: string | null;
  currentEmail?: string | null;
  currentPhone?: string | null;
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

export const contactService = {
  getAllAdmin: async (): Promise<ContactDto[]> => {
    return request<ContactDto[]>("/admin/contacts");
  },

  getDetailAdmin: async (id: number): Promise<ContactDto> => {
    return request<ContactDto>(`/admin/contacts/${id}`);
  },

  getTrashAdmin: async (): Promise<ContactDto[]> => {
    return request<ContactDto[]>("/admin/contacts/trash");
  },

  softDeleteAdmin: async (id: number): Promise<void> => {
    await request<void>(`/admin/contacts/${id}`, { method: "DELETE" });
  },

  restoreAdmin: async (id: number): Promise<void> => {
    await request<void>(`/admin/contacts/${id}/restore`, { method: "PATCH" });
  },

  deleteForeverAdmin: async (id: number): Promise<void> => {
    await request<void>(`/admin/contacts/${id}/force`, { method: "DELETE" });
  },

  createReplyAdmin: async (payload: {
    contactId: number;
    adminId?: number | null;
    replyContent: string;
    images?: File[];
  }): Promise<any> => {
    const form = new FormData();
    form.append("contact_id", String(payload.contactId));
    if (payload.adminId != null) form.append("admin_id", String(payload.adminId));
    form.append("reply_content", payload.replyContent);
    for (const f of payload.images || []) {
      if (f) form.append("images", f);
    }

    const res = await fetch(`${API_URL}/api/contact-replies`, {
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

    if (res.status === 204) return undefined;
    return (await res.json()) as any;
  },

  getRepliesByContactId: async (contactId: number): Promise<
    Array<{
      replyId: number;
      contactId: number;
      adminId?: number | null;
      replyContent: string;
      isRead?: boolean | null;
      createdAt?: string | null;
      updatedAt?: string | null;
      imageUrls?: string[] | null;
    }>
  > => {
    return request(`/contact-replies?contact_id=${encodeURIComponent(String(contactId))}`);
  },

  getContactsByEmail: async (email: string): Promise<ContactDto[]> => {
    const key = (email || "").trim();
    if (!key) return [];
    const res = await fetch(`${API_URL}/api/contacts?email=${encodeURIComponent(key)}`);
    if (!res.ok) {
      throw new Error("Không thể tải lịch sử liên hệ.");
    }
    return (await res.json()) as ContactDto[];
  },

  deleteReplyAdmin: async (id: number): Promise<void> => {
    await request<void>(`/contact-replies/${id}`, { method: "DELETE" });
  },

  updateReplyAdmin: async (payload: {
    replyId: number;
    replyContent: string;
    images?: File[];
    existingImageUrls?: string[];
  }): Promise<any> => {
    const form = new FormData();
    form.append("reply_content", payload.replyContent);
    for (const f of payload.images || []) {
      if (f) form.append("images", f);
    }
    if (payload.existingImageUrls) {
      for (const url of payload.existingImageUrls) {
        form.append("existingImageUrls", url);
      }
    }

    const res = await fetch(`${API_URL}/api/contact-replies/${payload.replyId}`, {
      method: "PATCH",
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

    if (res.status === 204) return undefined;
    return (await res.json()) as any;
  },
};
