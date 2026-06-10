import { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ForgotPasswordIdentifyRequest,
  ForgotPasswordIdentifyResponse,
  ForgotPasswordVerifyCodeRequest,
  ForgotPasswordVerifyCodeResponse,
  ForgotPasswordResetRequest,
  ForgotPasswordResetResponse,
  GoogleAuthRequest,
  GoogleAuthResult,
  LinkGoogleRequest,
  User 
} from '@/common/types/auth';

const API_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:8080';

type ApiErrorShape = {
  response: {
    data: {
      message: string;
    };
  };
};

const toApiError = (message: string): ApiErrorShape => ({
  response: {
    data: {
      message,
    },
  },
});

const requestJson = async <T>(path: string, init: RequestInit): Promise<T> => {
  const url = `${API_URL}/api${path}`;

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw toApiError('Không thể kết nối đến server. Vui lòng thử lại sau.');
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data && (data as any).message) ||
      (data && typeof data === 'object' && 'error' in data && (data as any).error) ||
      'Đã xảy ra lỗi.';
    throw toApiError(String(message));
  }

  return data as T;
};

const toLoginResponse = (data: {
  token: string;
  userId: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  userType: string;
}): { token: string; user: User } => {
  const user: User = {
    id: data.userId.toString(),
    email: data.email,
    name: data.name,
    avatarUrl: data.avatarUrl || null,
    userType: data.userType.toLowerCase() as 'admin' | 'customer',
    role: data.role,
  };
  return { token: data.token, user };
};

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      const data = await requestJson<{
        token: string;
        userId: number;
        name: string;
        email: string;
        avatarUrl?: string | null;
        role: string;
        userType: string;
        issuedAt: string;
        expiresAt: string;
      }>('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      return toLoginResponse(data);
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in (error as any)) {
        throw error;
      }
      throw toApiError('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    }
  },

  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    try {
      const res = await requestJson<{
        token: string;
        userId: number;
        name: string;
        email: string;
        avatarUrl?: string | null;
        role: string;
        userType: string;
        issuedAt: string;
        expiresAt: string;
      }>('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      return toLoginResponse(res);
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in (error as any)) {
        throw error;
      }
      throw toApiError('Đăng ký thất bại, vui lòng thử lại.');
    }
  },

  googleAuth: async (payload: GoogleAuthRequest): Promise<GoogleAuthResult> => {
    const data = await requestJson<{
      status: 'SUCCESS' | 'LINK_REQUIRED' | 'PROFILE_REQUIRED';
      message: string;
      auth: {
        token: string;
        userId: number;
        name: string;
        email: string;
          avatarUrl?: string | null;
        role: string;
        userType: string;
      } | null;
      email?: string;
      fullName?: string;
      username?: string;
      requiresProfileCompletion?: boolean;
    }>('/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return {
      status: data.status,
      message: data.message,
      auth: data.auth ? toLoginResponse(data.auth) : null,
      email: data.email,
      fullName: data.fullName,
      username: data.username,
      requiresProfileCompletion: data.requiresProfileCompletion,
    };
  },

  linkGoogle: async (payload: LinkGoogleRequest): Promise<GoogleAuthResult> => {
    const data = await requestJson<{
      status: 'SUCCESS' | 'LINK_REQUIRED' | 'PROFILE_REQUIRED';
      message: string;
      auth: {
        token: string;
        userId: number;
        name: string;
        email: string;
          avatarUrl?: string | null;
        role: string;
        userType: string;
      } | null;
      email?: string;
      fullName?: string;
      username?: string;
      requiresProfileCompletion?: boolean;
    }>('/auth/link-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return {
      status: data.status,
      message: data.message,
      auth: data.auth ? toLoginResponse(data.auth) : null,
      email: data.email,
      fullName: data.fullName,
      username: data.username,
      requiresProfileCompletion: data.requiresProfileCompletion,
    };
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    try {
      const response = await requestJson<{ message?: string }>(
        '/auth/forgot-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );
      return {
        message: response.message || 'Email đã được gửi thành công',
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in (error as any)) {
        throw error;
      }
      throw toApiError('Không thể gửi email. Vui lòng thử lại sau.');
    }
  },

  forgotPasswordIdentify: async (
    data: ForgotPasswordIdentifyRequest
  ): Promise<ForgotPasswordIdentifyResponse> => {
    try {
      const response = await requestJson<{ message?: string }>('/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.usernameOrEmail,
          usernameOrEmail: data.usernameOrEmail,
        }),
      });

      return {
        message: response.message || 'Mã xác thực đã được gửi thành công',
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in (error as any)) {
        throw error;
      }
      throw toApiError('Không thể gửi mã xác thực. Vui lòng thử lại sau.');
    }
  },

  forgotPasswordVerifyCode: async (
    data: ForgotPasswordVerifyCodeRequest
  ): Promise<ForgotPasswordVerifyCodeResponse> => {
    try {
      const response = await requestJson<{ message?: string }>(
        '/auth/forgot-password/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      return {
        message: response.message || 'Mã xác thực hợp lệ',
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in (error as any)) {
        throw error;
      }
      throw toApiError('Mã xác thực không hợp lệ.');
    }
  },

  forgotPasswordReset: async (data: ForgotPasswordResetRequest): Promise<ForgotPasswordResetResponse> => {
    try {
      const response = await requestJson<{ message?: string }>(
        '/auth/forgot-password/reset',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      return {
        message: response.message || 'Đặt lại mật khẩu thành công',
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in (error as any)) {
        throw error;
      }
      throw toApiError('Không thể đặt lại mật khẩu. Vui lòng thử lại sau.');
    }
  },

  uploadAvatar: async (file: File, token: string): Promise<{ url: string; objectName: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/uploads/avatars`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Không thể upload avatar');
    }

    return response.json();
  },

  updateAvatar: async (avatarUrl: string, token: string): Promise<{ message: string; avatarUrl: string }> => {
    const response = await fetch(`${API_URL}/api/auth/avatar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ avatarUrl }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Update failed' }));
      throw new Error(error.message || 'Không thể cập nhật avatar');
    }

    return response.json();
  },
};

