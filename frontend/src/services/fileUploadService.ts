const API_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:8080';

const requestForm = async <T>(path: string, formData: FormData): Promise<T> => {
  const url = `${API_URL}/api${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error('Không thể upload ảnh. Vui lòng thử lại sau.');
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data && (data as any).message) ||
      (data && typeof data === 'object' && 'error' in data && (data as any).error) ||
      'Không thể upload ảnh. Vui lòng thử lại sau.';
    throw new Error(String(message));
  }

  return data as T;
};

export const fileUploadService = {
  uploadAvatar: async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await requestForm<{ url: string; message?: string }>(
        '/uploads/avatars',
        formData
      );
      return response.url;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Không thể upload ảnh. Vui lòng thử lại sau.');
    }
  },

  uploadImage: async (file: File): Promise<string> => {
    return fileUploadService.uploadAvatar(file);
  },

  uploadCategoryImage: async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await requestForm<{ url: string; message?: string }>(
        '/uploads/categories',
        formData
      );
      return response.url;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Không thể upload ảnh danh mục. Vui lòng thử lại sau.');
    }
  },
};

