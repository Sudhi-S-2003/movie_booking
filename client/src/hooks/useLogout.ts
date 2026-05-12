import { useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { authApi } from '../services/api/index.js';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to handle user logout.
 * Calls the logout API and then clears the local auth state.
 */
export const useLogout = () => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      // 1. Call API to invalidate session on server
      await authApi.logout();
    } catch (err) {
      console.error('Logout API failed:', err);
      // Even if API fails, we should still clear local state to avoid getting stuck
    } finally {
      setIsLoading(false);
      // 2. Clear local state
      logout();
      // 3. Redirect to login
      navigate('/login');
    }
  };

  return { logout: handleLogout, isLoading };
};
