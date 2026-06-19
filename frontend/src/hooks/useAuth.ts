/**
 * Custom React Hook for Authentication
 * 
 * Provides easy access to auth state and token verification
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getAuthToken, 
  getCurrentUser, 
  isAuthenticated, 
  verifyCurrentToken, 
  clearAuthAndRedirect 
} from '@/utils/authUtils';

type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  userType: 'admin' | 'customer';
  role: string;
};

type UseAuthOptions = {
  required?: boolean;
  redirectTo?: string;
  userType?: 'admin' | 'customer';
};

export function useAuth(options: UseAuthOptions = {}) {
  const { required = false, redirectTo = '/login', userType } = options;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const verifyAndSetUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        setUser(null);
        if (required) {
          router.replace(redirectTo);
        }
        return;
      }

      // Get user from localStorage first (fast)
      const localUser = getCurrentUser();
      if (localUser) {
        setUser(localUser);
      }

      // Verify with backend
      const verifiedUser = await verifyCurrentToken();
      if (!verifiedUser) {
        setUser(null);
        if (required) {
          clearAuthAndRedirect();
        }
        return;
      }

      // Check userType if specified
      if (userType && verifiedUser.userType.toLowerCase() !== userType) {
        setError(`Access denied. Expected ${userType} user.`);
        setUser(null);
        router.replace(redirectTo);
        return;
      }

      // Update user state with verified data
      const updatedUser: User = {
        id: verifiedUser.userId.toString(),
        email: verifiedUser.email,
        name: verifiedUser.name,
        avatarUrl: verifiedUser.avatarUrl || null,
        userType: verifiedUser.userType.toLowerCase() as 'admin' | 'customer',
        role: verifiedUser.role,
      };

      setUser(updatedUser);

      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('Auth verification failed:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setUser(null);
      if (required) {
        clearAuthAndRedirect();
      }
    } finally {
      setLoading(false);
    }
  }, [required, redirectTo, userType, router]);

  useEffect(() => {
    verifyAndSetUser();

    // Listen for auth logout events
    const handleLogout = () => {
      setUser(null);
      if (required) {
        router.replace(redirectTo);
      }
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, [verifyAndSetUser, required, redirectTo, router]);

  const logout = useCallback(() => {
    clearAuthAndRedirect();
  }, []);

  const refreshUser = useCallback(() => {
    return verifyAndSetUser();
  }, [verifyAndSetUser]);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    logout,
    refreshUser,
  };
}

/**
 * Hook for protected routes (requires authentication)
 */
export function useRequireAuth(userType?: 'admin' | 'customer') {
  return useAuth({ required: true, userType });
}

/**
 * Hook for optional authentication (doesn't redirect if not authenticated)
 */
export function useOptionalAuth() {
  return useAuth({ required: false });
}
