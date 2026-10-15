import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { usersService } from '@/services/usersService';
import { notificationService } from '@/services/notificationService';
import api from '@/services/api';

export interface NavBadges {
  pendingUsers: number;
  unreadNotifications: number;
  unreadMessages: number;
}

/** Counts shown as badges in the sidebar and phone tab bar, refreshed every minute. */
export function useNavBadges(): NavBadges {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const pending = useQuery({
    queryKey: ['badge', 'pendingUsers'],
    queryFn: async () => {
      const res = await usersService.getUsers({ status: 'PENDING', limit: 1 });
      return Number(res?.pagination?.total) || 0;
    },
    enabled: isAdmin,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const unread = useQuery({
    queryKey: ['badge', 'unreadNotifications'],
    queryFn: async () => {
      const stats = await notificationService.getStats();
      return Number(stats?.unread) || 0;
    },
    enabled: Boolean(user),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const messages = useQuery({
    queryKey: ['badge', 'unreadMessages'],
    queryFn: async () => Number((await api.get('/chat/conversations', { params: { t: Math.floor(Date.now() / 20000) } })).data?.unreadTotal) || 0,
    enabled: Boolean(user),
    refetchInterval: 60_000,
    staleTime: 20_000,
  });

  return {
    pendingUsers: pending.data ?? 0,
    unreadNotifications: unread.data ?? 0,
    unreadMessages: messages.data ?? 0,
  };
}
