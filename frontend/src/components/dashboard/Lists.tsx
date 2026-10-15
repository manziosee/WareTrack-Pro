import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Trophy, Navigation, Phone, PackageX, Plus, Pencil, Trash2, LogIn, CircleDot } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import EmptyState from '../ui/EmptyState';

export function timeAgo(date: string | Date) {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < -1) return 'scheduled';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(date).toLocaleDateString();
}

interface AtRiskItem {
  id: number;
  orderNumber: string;
  customerName: string;
  status: string;
  priority: string;
  hoursLeft: number;
}

const formatHours = (h: number) => {
  const abs = Math.abs(h);
  const text = abs >= 48 ? `${Math.round(abs / 24)}d` : abs >= 1 ? `${Math.round(abs)}h` : `${Math.max(1, Math.round(abs * 60))}m`;
  return h < 0 ? `${text} late` : `${text} left`;
};

/** Open orders close to (or past) their delivery deadline. */
export function AtRiskList({ items }: { items: AtRiskItem[] }) {
  if (!items?.length) return <EmptyState compact variant="delivery" title="Every delivery is on schedule" description="Nothing is close to its deadline." />;
  return (
    <ul className="divide-y divide-gray-50">
      {items.map((o) => {
        const overdue = o.hoursLeft < 0;
        return (
          <li key={o.id}>
            <Link to={`/orders/${o.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-gray-50">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${overdue ? 'bg-error-50 text-error-600' : 'bg-warning-50 text-warning-600'}`}>
                {overdue ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{o.orderNumber}</span>
                <span className="block truncate text-xs text-gray-500">{o.customerName}</span>
              </span>
              <span className="text-right">
                <span className={`block text-xs font-semibold ${overdue ? 'text-error-600' : 'text-warning-600'}`}>
                  {formatHours(o.hoursLeft)}
                </span>
                <StatusBadge status={o.status} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

interface ActivityItem {
  id: number;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  createdAt: string;
}

const actionStyle: Record<string, { icon: typeof Plus; className: string }> = {
  CREATE: { icon: Plus, className: 'bg-success-50 text-success-600' },
  UPDATE: { icon: Pencil, className: 'bg-info-50 text-info-600' },
  DELETE: { icon: Trash2, className: 'bg-error-50 text-error-600' },
  LOGIN: { icon: LogIn, className: 'bg-primary-50 text-primary-600' },
};

/** Who did what, newest first (from the audit log). */
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (!items?.length) return <EmptyState compact title="No activity yet" description="Changes made by your team will appear here." />;
  return (
    <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-gray-100">
      {items.map((a) => {
        const style = actionStyle[a.action] || { icon: CircleDot, className: 'bg-gray-100 text-gray-500' };
        return (
          <li key={a.id} className="relative flex gap-3">
            <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${style.className}`}>
              <style.icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm text-gray-800">{a.summary}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {a.userName || 'System'} · {timeAgo(a.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

interface RestockItem {
  id: number;
  name: string;
  code: string;
  quantity: number;
  minQuantity: number;
  unit?: string;
}

/** Items at or below their minimum stock level. */
export function RestockList({ items }: { items: RestockItem[] }) {
  if (!items?.length) return <EmptyState compact title="Stock levels look healthy" description="No items are below their minimum." />;
  return (
    <ul className="space-y-3">
      {items.map((i) => {
        const ratio = i.minQuantity > 0 ? Math.min(1, i.quantity / i.minQuantity) : 1;
        return (
          <li key={i.id} className="flex items-center gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${i.quantity === 0 ? 'bg-error-50 text-error-600' : 'bg-warning-50 text-warning-600'}`}>
              <PackageX className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium text-gray-800">{i.name}</span>
                <span className="shrink-0 tabular-nums text-gray-500">
                  <b className={i.quantity === 0 ? 'text-error-600' : 'text-gray-900'}>{i.quantity}</b> / {i.minQuantity} {i.unit}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${i.quantity === 0 ? 'bg-error-500' : 'bg-warning-500'}`} style={{ width: `${Math.max(4, ratio * 100)}%` }} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface LeaderRow {
  id: number;
  name: string;
  deliveries: number;
  onTime: number;
  success?: number;
  rating?: number;
  active?: number;
  me?: boolean;
}

/** Driver ranking for the last 30 days. */
export function Leaderboard({ rows, showActive }: { rows: LeaderRow[]; showActive?: boolean }) {
  if (!rows?.length) return <EmptyState compact variant="delivery" title="No deliveries yet" />;
  const max = Math.max(...rows.map((r) => r.deliveries), 1);
  const medal = ['text-accent-500', 'text-gray-400', 'text-warning-700'];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
            <th className="pb-2 font-medium">Driver</th>
            <th className="pb-2 font-medium">Deliveries</th>
            <th className="pb-2 text-right font-medium">On time</th>
            {showActive ? <th className="pb-2 text-right font-medium">Active</th> : <th className="pb-2 text-right font-medium">Rating</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, i) => (
            <tr key={r.id} className={r.me ? 'bg-accent-50/60' : ''}>
              <td className="py-2.5 pr-3">
                <span className="flex items-center gap-2.5">
                  <span className="flex w-5 justify-center">
                    {i < 3 ? <Trophy className={`h-4 w-4 ${medal[i]}`} /> : <span className="text-xs font-semibold text-gray-400">{i + 1}</span>}
                  </span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-[10px] font-bold text-white">
                    {r.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </span>
                  <span className="truncate font-medium text-gray-800">
                    {r.name}
                    {r.me && <span className="ml-1.5 text-xs font-semibold text-accent-600">(you)</span>}
                  </span>
                </span>
              </td>
              <td className="py-2.5 pr-3">
                <span className="flex items-center gap-2">
                  <span className="w-6 text-right font-semibold tabular-nums text-gray-900">{r.deliveries}</span>
                  <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 sm:block">
                    <span className="block h-full rounded-full bg-primary-500" style={{ width: `${(r.deliveries / max) * 100}%` }} />
                  </span>
                </span>
              </td>
              <td className={`py-2.5 text-right font-semibold tabular-nums ${r.onTime >= 90 ? 'text-success-600' : r.onTime >= 75 ? 'text-warning-600' : 'text-error-600'}`}>
                {r.onTime}%
              </td>
              <td className="py-2.5 text-right tabular-nums text-gray-600">{showActive ? r.active ?? 0 : r.rating ? `${r.rating}★` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface RouteStop {
  id: number;
  orderNumber: string;
  customerName: string;
  address: string;
  status: string;
  priority: string;
  slotStart?: string | null;
  slotEnd?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string;
}

const slot = (start?: string | null, end?: string | null) => {
  if (!start) return null;
  const f = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return end ? `${f(start)}–${f(end)}` : f(start);
};

/** A driver's stops in order, with navigation links. */
export function RouteList({ stops }: { stops: RouteStop[] }) {
  if (!stops?.length) return <EmptyState compact variant="delivery" title="No deliveries assigned" description="New stops will appear here when dispatch assigns them." />;
  return (
    <ol className="space-y-2.5">
      {stops.map((s, i) => {
        const nav = s.latitude && s.longitude
          ? `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`;
        return (
          <li key={s.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition hover:border-primary-200 hover:bg-primary-50/30">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-gray-900">{s.customerName}</span>
                <StatusBadge status={s.status} />
              </div>
              <p className="truncate text-xs text-gray-500">{s.address}</p>
              {slot(s.slotStart, s.slotEnd) && <p className="text-[11px] font-medium text-accent-600">{slot(s.slotStart, s.slotEnd)}</p>}
            </div>
            <div className="flex shrink-0 gap-1.5">
              {s.phone && (
                <a href={`tel:${s.phone}`} className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200" title="Call customer">
                  <Phone className="h-4 w-4" />
                </a>
              )}
              <a href={nav} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white shadow-glow hover:bg-primary-600" title="Navigate">
                <Navigation className="h-4 w-4" />
              </a>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
