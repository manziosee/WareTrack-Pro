import { WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  // Only show when actually offline
  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg max-w-sm">
        <div className="flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-red-600" />
          
          <div>
            <p className="font-medium text-sm text-gray-900">
              No Internet Connection
            </p>
            <p className="text-xs text-gray-600">
              Check your internet connection
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}