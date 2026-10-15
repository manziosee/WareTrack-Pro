import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Trash2, AlertTriangle, Info, CheckCircle2, XCircle, Package, Clock, Activity, ShoppingCart, MessageSquare, FileText } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import FilterChip from '@/components/table/FilterChip';
import api from '@/services/api';
import { notificationService } from '@/services/notificationService';
import { timeAgo } from '@/components/dashboard/Lists';

const SEVERITY: Record<string, { icon: typeof Info; className: string }> = {
  ERROR: { icon: XCircle, className: 'bg-error-50 text-error-600' },
  WARNING: { icon: AlertTriangle, className: 'bg-warning-50 text-warning-600' },
  SUCCESS: { icon: CheckCircle2, className: 'bg-success-50 text-success-600' },
  INFO: { icon: Info, className: 'bg-info-50 text-info-600' },
};
const TYPE: Record<string, { label: string; icon: typeof Info }> = {
  LOW_STOCK: { label: 'Stock', icon: Package },
  ORDER_UPDATE: { label: 'Orders', icon: ShoppingCart },
  DELIVERY_COMPLETE: { label: 'Deliveries', icon: CheckCircle2 },
  SLA_RISK: { label: 'Deadlines', icon: Clock },
  ANOMALY: { label: 'Anomalies', icon: Activity },
  PURCHASE_ORDER: { label: 'Purchasing', icon: FileText },
  MESSAGE: { label: 'Messages', icon: MessageSquare },
  SYSTEM: { label: 'System', icon: Bell },
  WELCOME: { label: 'Welcome', icon: Bell },
};

function dayGroup(date: string) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (Date.now() - d.getTime() < 7 * 86400000) return 'This week';
  return 'Earlier';
}

/** Notification center: grouped by day, filterable, updates live. */
export default function Notifications() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [type, setType] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'center', tab],
    queryFn: async () => (await api.get('/notifications', { params: { limit: 200, unreadOnly: tab === 'unread' || undefined, t: Date.now() } })).data?.data || [],
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['badge', 'unreadNotifications'] });
  };

  const items: any[] = useMemo(() => (data || []).filter((n: any) => !type || n.type === type), [data, type]);
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const n of items) map.set(dayGroup(n.createdAt), [...(map.get(dayGroup(n.createdAt)) || []), n]);
    return Array.from(map.entries());
  }, [items]);
  const unread = (data || []).filter((n: any) => !n.read).length;

  const markRead = async (n: any) => {
    if (n.read) return;
    queryClient.setQueryData(['notifications', 'center', tab], (old: any[] = []) => old.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    await notificationService.markAsRead(n.id).catch(() => undefined);
    refresh();
  };
  const remove = async (n: any) => {
    queryClient.setQueryData(['notifications', 'center', tab], (old: any[] = []) => old.filter((x) => x.id !== n.id));
    await notificationService.deleteNotification(n.id).catch(() => undefined);
    refresh();
  };
  const markAll = async () => {
    await notificationService.markAllAsRead().catch(() => undefined);
    refresh();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread` : 'You are all caught up'}
        breadcrumbs={[{ label: 'Communication' }]}
        icon={<Bell className="h-5 w-5" />}
        actions={unread > 0 ? <Button size="sm" variant="secondary" onClick={markAll}><CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read</Button> : undefined}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-medium">
          {([['all', 'All'], ['unread', 'Unread']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-3 py-1.5 transition ${tab === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>{label}</button>
          ))}
        </div>
        <FilterChip label="Type" value={type} onChange={setType} options={Object.entries(TYPE).map(([k, v]) => ({ value: k, label: v.label }))} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : !items.length ? (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-soft"><EmptyState title={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'} description="Alerts about orders, stock and deliveries will appear here." /></div>
      ) : (
        <div className="space-y-6">
          {groups.map(([group, list]) => (
            <section key={group}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{group}</h2>
              <ul className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft">
                {list.map((n) => {
                  const sev = SEVERITY[n.severity] || SEVERITY.INFO;
                  const t = TYPE[n.type];
                  return (
                    <li key={n.id} onClick={() => markRead(n)} className={`group flex cursor-pointer gap-3 border-b border-gray-50 px-4 py-3.5 transition last:border-0 hover:bg-gray-50 ${n.read ? '' : 'bg-primary-50/40'}`}>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${sev.className}`}><sev.icon className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className={`text-sm ${n.read ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</p>
                          <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                        {t && <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500"><t.icon className="h-3 w-3" /> {t.label}</span>}
                      </div>
                      <div className="flex shrink-0 flex-col items-center gap-2">
                        {!n.read && <span className="h-2 w-2 rounded-full bg-accent-500" />}
                        <button onClick={(e) => { e.stopPropagation(); remove(n); }} className="rounded-lg p-1 text-gray-300 opacity-0 transition hover:bg-error-50 hover:text-error-600 group-hover:opacity-100" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
