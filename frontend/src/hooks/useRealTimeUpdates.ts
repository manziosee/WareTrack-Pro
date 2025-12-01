import { useState, useEffect, useCallback } from 'react';

interface RealTimeUpdate {
  type: 'order_status' | 'inventory_update' | 'dispatch_update' | 'notification';
  data: any;
  timestamp: string;
}

export const useRealTimeUpdates = () => {
  const [updates, setUpdates] = useState<RealTimeUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Simulate WebSocket connection
  useEffect(() => {
    const simulateUpdates = () => {
      const mockUpdates = [
        {
          type: 'order_status' as const,
          data: { orderId: 'ORD-000001', status: 'delivered', location: 'Customer Location' },
          timestamp: new Date().toISOString()
        },
        {
          type: 'inventory_update' as const,
          data: { itemId: 'ITM-001', name: 'Wireless Mouse', quantity: 8, action: 'stock_low' },
          timestamp: new Date().toISOString()
        }
      ];

      setUpdates(prev => [...mockUpdates, ...prev].slice(0, 50));
    };

    setIsConnected(true);
    const interval = setInterval(simulateUpdates, 30000); // Every 30 seconds

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, []);

  const addUpdate = useCallback((update: RealTimeUpdate) => {
    setUpdates(prev => [update, ...prev].slice(0, 50));
  }, []);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  return {
    updates,
    isConnected,
    addUpdate,
    clearUpdates
  };
};