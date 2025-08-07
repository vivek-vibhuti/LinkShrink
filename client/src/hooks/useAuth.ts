import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { User } from '../../../shared/schema';

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;
      
      try {
        const response = await apiRequest('GET', '/auth/user');
        return await response.json() as User;
      } catch (error: any) {
        if (error.message.includes('401')) {
          localStorage.removeItem('auth_token');
          queryClient.clear();
        }
        return null;
      }
    },
    retry: false,
  });

  const logout = () => {
    localStorage.removeItem('auth_token');
    queryClient.clear();
    window.location.href = '/';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };
}