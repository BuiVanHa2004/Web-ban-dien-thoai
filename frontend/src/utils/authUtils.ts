/**
 * Authentication Utilities
 * 
 * Provides centralized auth token handling and automatic logout on token expiration
 */

// Global error handler function - will be set by AppNotificationProvider
let globalErrorHandler: ((message: string) => void) | null = null;

/**
 * Set global error handler (called from AppNotificationProvider)
 */
export function setGlobalErrorHandler(handler: (message: string) => void): void {
  globalErrorHandler = handler;
}

/**
 * Get current auth token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Get Authorization header value
 */
export function getAuthHeader(): string | null {
  const token = getAuthToken();
  return token ? `Bearer ${token}` : null;
}

/**
 * Clear authentication data and redirect to login
 */
export function clearAuthAndRedirect(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Dispatch custom event so other components can react
  window.dispatchEvent(new CustomEvent('auth:logout'));
  
  // Redirect to login
  window.location.href = '/login';
}

/**
 * Enhanced fetch wrapper that handles 401 automatically and shows error toasts
 * 
 * @param url - API endpoint URL
 * @param init - Fetch options
 * @param skipAutoLogout - Skip automatic logout on 401 (default: false)
 * @param skipErrorToast - Skip automatic error toast display (default: false)
 * @returns Promise with response data
 */
export async function authenticatedFetch<T>(
  url: string,
  init?: RequestInit,
  skipAutoLogout = false,
  skipErrorToast = false
): Promise<T> {
  const authHeader = getAuthHeader();
  
  // Check if body is FormData - don't set Content-Type for multipart uploads
  const isFormData = init?.body instanceof FormData;
  
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        // Only set Content-Type if not FormData (let browser set it for multipart)
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(init?.headers || {}),
      },
    });

    // Handle 401 Unauthorized
    if (response.status === 401 && !skipAutoLogout) {
      clearAuthAndRedirect();
      const errorMsg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      if (!skipErrorToast && globalErrorHandler) {
        globalErrorHandler(errorMsg);
      }
      throw new Error(errorMsg);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length');
    const isJson = contentType.includes('application/json');
    
    // If no content or content-length is 0, return undefined
    if (contentLength === '0' || (!contentType && !contentLength)) {
      return undefined as T;
    }

    // Try to parse JSON if content type indicates JSON
    let data = null;
    if (isJson) {
      const text = await response.text();
      // If response body is empty, return undefined
      if (!text || text.trim() === '') {
        return undefined as T;
      }
      try {
        data = JSON.parse(text);
      } catch {
        // If JSON parsing fails, return undefined for empty/invalid JSON
        if (!response.ok) {
          const errorMsg = 'Có lỗi xảy ra khi xử lý dữ liệu từ server.';
          if (!skipErrorToast && globalErrorHandler) {
            globalErrorHandler(errorMsg);
          }
          throw new Error(errorMsg);
        }
        return undefined as T;
      }
    }

    if (!response.ok) {
      const message =
        (data && typeof data === 'object' && 'message' in data && (data as any).message) ||
        (data && typeof data === 'object' && 'error' in data && (data as any).error) ||
        'Có lỗi xảy ra.';
      
      // Show error toast automatically
      if (!skipErrorToast && globalErrorHandler) {
        globalErrorHandler(String(message));
      }
      
      throw new Error(String(message));
    }

    return data as T;
  } catch (error: any) {
    // Re-throw if it's already our error (already handled above)
    if (error.message) {
      throw error;
    }
    
    // Handle network errors or unexpected errors
    const errorMsg = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
    if (!skipErrorToast && globalErrorHandler) {
      globalErrorHandler(errorMsg);
    }
    throw new Error(errorMsg);
  }
}

/**
 * Verify token validity by calling /auth/me
 * Returns user info if valid, null if invalid
 */
export async function verifyCurrentToken(): Promise<{
  userId: number;
  userType: string;
  role: string;
  name: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
} | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_URL || 'http://localhost:8080'}/api/auth/me`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch {
    return null;
  }
}

/**
 * Initialize auth state on app startup
 * Verifies token and updates localStorage with fresh user data
 * Returns true if authenticated, false otherwise
 */
export async function initializeAuth(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) {
    return false;
  }

  const userData = await verifyCurrentToken();
  if (!userData) {
    clearAuthAndRedirect();
    return false;
  }

  // Update localStorage with fresh data
  const updatedUser = {
    id: userData.userId.toString(),
    email: userData.email,
    name: userData.name,
    avatarUrl: userData.avatarUrl || null,
    userType: userData.userType.toLowerCase(),
    role: userData.role,
  };

  localStorage.setItem('user', JSON.stringify(updatedUser));
  return true;
}

/**
 * Check if user is authenticated (has valid token in localStorage)
 * Note: This only checks localStorage, doesn't verify with backend
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  const token = getAuthToken();
  const userStr = localStorage.getItem('user');
  
  return !!(token && userStr);
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  userType: 'admin' | 'customer';
  role: string;
} | null {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}
