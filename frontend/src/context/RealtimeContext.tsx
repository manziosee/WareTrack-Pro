import { refreshOperations } from '@/utils/operations';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

interface RealtimeContextType {
  socket: Socket | null;
  connected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType>({ socket: null, connected: false });

const apiBase = (import.meta.env.VITE_API_URL || 'https://waretrack-pro.onrender.com/api').replace(/\/api\/?$/, '');

const EVENT_TEXT: Record<string, (d: any) => string> = {
  'order.created': (d) => `New order ${d.orderNumber} from ${d.customerName}`,
  'dispatch.created': (d) => `${d.orderNumber} dispatched with ${d.driver}`,
  'delivery.completed': (d) => `${d.orderNumber} delivered ✅`,
  'order.failed': (d) => `Delivery failed: ${d.orderNumber}`,
  'return.created': (d) => `Return opened for ${d.orderNumber}`,
  'payment.completed': (d) => `Payment received for ${d.orderNumber}`,
  'stock.low': (d) => `Low stock: ${d.name} (${d.quantity} left)`,
};

/** Socket.IO connection: live notifications, list refreshes, chat and driver positions. */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!isAuthenticated || !token) return;

    const s = io(apiBase, { auth: { token }, transports: ['websocket', 'polling'], reconnectionDelayMax: 15000 });
    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    s.on('notification', (n: any) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['badge', 'unreadNotifications'] });
      toast(n.title, { icon: n.severity === 'ERROR' ? '⚠️' : n.severity === 'WARNING' ? '⏰' : '🔔' });
    });

    s.on('event', (e: { type: string; data: any }) => {
      // Keep lists and dashboards fresh without polling
      if (e.type.startsWith('order') || e.type.startsWith('dispatch') || e.type.startsWith('delivery')) {
        refreshOperations(queryClient);
      }
      if (e.type.startsWith('return')) queryClient.invalidateQueries({ queryKey: ['list', 'returns'] });
      if (e.type.startsWith('payment')) queryClient.invalidateQueries({ queryKey: ['list', 'payments'] });
      if (e.type === 'stock.low' || e.type.startsWith('purchase_order')) queryClient.invalidateQueries({ queryKey: ['list', 'inventory'] });
      const text = EVENT_TEXT[e.type]?.(e.data);
      if (text && user?.role !== 'DRIVER') toast(text, { duration: 3500, icon: '⚡' });
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  return <RealtimeContext.Provider value={{ socket, connected }}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
