import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/health`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        setBackendStatus(response.ok ? 'online' : 'offline');
      } catch {
        setBackendStatus('offline');
      }
    };

    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (isOnline && backendStatus === 'online') {
    return null; // Don't show anything when everything is working
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg max-w-sm">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <WifiOff className="w-5 h-5 text-red-600" />
          ) : backendStatus === 'offline' ? (
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          ) : (
            <Wifi className="w-5 h-5 text-green-600" />
          )}
          
          <div>
            <p className="font-medium text-sm text-gray-900">
              {!isOnline ? 'No Internet Connection' : 'Backend Service Unavailable'}
            </p>
            <p className="text-xs text-gray-600">
              {!isOnline 
                ? 'Check your internet connection' 
                : 'Some features may not work properly'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}