/**
 * Authentication Utilities
 * 
 * Provides centralized auth token handling and automatic logout on token expiration
 */

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
 * Enhanced fetch wrapper that handles 401 automatically
 * 
 * @param url - API endpoint URL
 * @param init - Fetch options
 * @param skipAutoLogout - Skip automatic logout on 401 (default: false)
 * @returns Promise with response data
 */
export async function authenticatedFetch<T>(
  url: string,
  init?: RequestInit,
  skipAutoLogout = false
): Promise<T> {
  const authHeader = getAuthHeader();
  
  // Check if body is FormData - don't set Content-Type for multipart uploads
  const isFormData = init?.body instanceof FormData;
  
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
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data && (data as any).message) ||
      (data && typeof data === 'object' && 'error' in data && (data as any).error) ||
      'Có lỗi xảy ra.';
    throw new Error(String(message));
  }

  return data as T;
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
