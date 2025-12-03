import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface RefreshButtonProps {
  onRefresh: () => Promise<void> | void;
  className?: string;
}

export default function RefreshButton({ onRefresh, className = '' }: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 ${className}`}
      title="Refresh data"
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );
}