import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import api from '@/services/api';
import { ActivityFeed } from '../dashboard/Lists';
import { Skeleton } from './Skeleton';

interface ActivityTimelineProps {
  entityType: string;
  entityId: string | number;
}

/** "Who changed what and when" for one record, from the audit log. */
export default function ActivityTimeline({ entityType, entityId }: ActivityTimelineProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['audit', entityType, String(entityId)],
    queryFn: async () => (await api.get(`/audit/entity/${entityType}/${entityId}`, { params: { t: Date.now() } })).data?.data || [],
  });

  return (
    <section className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-primary-600 shadow-sm">
          <History className="h-4 w-4" />
        </span>
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Activity</h4>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <ActivityFeed items={data} />
      )}
    </section>
  );
}
