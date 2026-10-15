import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, LayoutGrid, Check } from 'lucide-react';
import { insightsService } from '@/services/insightsService';
import { useI18n } from '@/i18n/I18nContext';

interface DashboardToolbarProps {
  editing: boolean;
  onToggleEditing: () => void;
  updatedAt?: number;
}

/** Customize / Done and Refresh buttons shown beside the greeting. */
export default function DashboardToolbar({ editing, onToggleEditing, updatedAt }: DashboardToolbarProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const data = await insightsService.getDashboard(true);
      queryClient.setQueryData(['insights', 'dashboard'], data);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      {updatedAt ? (
        <span className="hidden text-[11px] text-gray-400 md:inline">
          Updated {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ) : null}
      <button
        onClick={refresh}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">{t('Refresh')}</span>
      </button>
      <button
        onClick={onToggleEditing}
        className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-sm transition ${
          editing ? 'bg-accent-500 text-white hover:bg-accent-600' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        {editing ? <Check className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
        {editing ? t('Done') : t('Customize')}
      </button>
    </>
  );
}
