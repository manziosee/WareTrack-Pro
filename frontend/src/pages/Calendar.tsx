import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Truck, Wrench, Package } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import api from '@/services/api';
import { statusHex, statusLabel } from '@/utils/status';

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const time = (d: string | Date) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalEvent {
  key: string;
  kind: 'delivery' | 'maintenance';
  date: Date;
  title: string;
  subtitle: string;
  status: string;
  link: string;
}

/** Scheduled deliveries and vehicle maintenance by month or week. */
export default function Calendar() {
  const [view, setView] = useState<'month' | 'week'>('month');
  const [cursor, setCursor] = useState(startOfDay(new Date()));
  const [selected, setSelected] = useState<Date>(startOfDay(new Date()));
  const [show, setShow] = useState({ delivery: true, maintenance: true });

  // Visible range
  const range = useMemo(() => {
    if (view === 'week') {
      const start = new Date(cursor.getTime() - ((cursor.getDay() + 6) % 7) * DAY);
      return { start, days: Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY)) };
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first.getTime() - ((first.getDay() + 6) % 7) * DAY);
    return { start, days: Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * DAY)) };
  }, [cursor, view]);

  const from = range.days[0];
  const to = new Date(range.days[range.days.length - 1].getTime() + DAY - 1);

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', from.toISOString(), to.toISOString()],
    queryFn: async () => (await api.get('/calendar', { params: { from: from.toISOString(), to: to.toISOString() } })).data?.data,
  });

  const events: CalEvent[] = useMemo(() => {
    const list: CalEvent[] = [];
    for (const o of data?.orders || []) {
      list.push({
        key: `o${o.id}`, kind: 'delivery', date: new Date(o.timeSlotStart || o.scheduledDate),
        title: `${o.orderNumber} · ${o.customerName}`, subtitle: o.driver?.name || 'Unassigned', status: o.status, link: `/orders?view=${o.id}`,
      });
    }
    for (const m of data?.maintenance || []) {
      list.push({
        key: `m${m.id}`, kind: 'maintenance', date: new Date(m.scheduledDate),
        title: `${m.vehicle.plateNumber} · ${statusLabel(m.type)}`, subtitle: m.description, status: m.completedDate ? 'COMPLETED' : 'SCHEDULED', link: `/vehicles?view=${m.vehicle.id}`,
      });
    }
    return list.filter((e) => show[e.kind]).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data, show]);

  const byDay = (d: Date) => events.filter((e) => sameDay(e.date, d));
  const today = startOfDay(new Date());
  const step = (dir: number) =>
    setCursor((c) => (view === 'week' ? new Date(c.getTime() + dir * 7 * DAY) : new Date(c.getFullYear(), c.getMonth() + dir, 1)));
  const heading = view === 'week'
    ? `${range.days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${range.days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const selectedEvents = byDay(selected);

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Scheduled deliveries and vehicle maintenance" breadcrumbs={[{ label: 'Operations' }]} icon={<CalendarDays className="h-5 w-5" />} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => step(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50" aria-label="Previous"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => { setCursor(today); setSelected(today); }} className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50">Today</button>
          <button onClick={() => step(1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50" aria-label="Next"><ChevronRight className="h-4 w-4" /></button>
          <h2 className="ml-2 text-lg font-bold text-gray-900">{heading}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([['delivery', 'Deliveries', Truck], ['maintenance', 'Maintenance', Wrench]] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))} className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition ${show[key] ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-400'}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
          <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-medium">
            {(['month', 'week'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-lg px-3 py-1.5 capitalize transition ${view === v ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'}`}>{v}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft">
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
            {WEEKDAYS.map((d) => <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">{d}</div>)}
          </div>
          {isLoading ? (
            <Skeleton className="m-3 h-[60vh] rounded-xl" />
          ) : (
            <div className="grid grid-cols-7">
              {range.days.map((day) => {
                const list = byDay(day);
                const outside = view === 'month' && day.getMonth() !== cursor.getMonth();
                const isToday = sameDay(day, today);
                const isSelected = sameDay(day, selected);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelected(day)}
                    className={`flex flex-col gap-1 border-b border-r border-gray-50 p-1.5 text-left align-top transition hover:bg-primary-50/40 ${view === 'week' ? 'min-h-[60vh]' : 'min-h-[6.5rem]'} ${outside ? 'bg-gray-50/60 text-gray-400' : ''} ${isSelected ? 'bg-primary-50/70 ring-2 ring-inset ring-primary-300' : ''}`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? 'bg-accent-500 text-white' : 'text-gray-700'}`}>{day.getDate()}</span>
                    {list.slice(0, view === 'week' ? 14 : 3).map((e) => (
                      <span key={e.key} className="flex w-full items-center gap-1 truncate rounded-md px-1 py-0.5 text-[10px] font-medium text-gray-700" style={{ background: `${e.kind === 'maintenance' ? '#8B5CF6' : statusHex(e.status)}1F` }}>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: e.kind === 'maintenance' ? '#8B5CF6' : statusHex(e.status) }} />
                        <span className="truncate">{time(e.date)} {e.title}</span>
                      </span>
                    ))}
                    {list.length > (view === 'week' ? 14 : 3) && <span className="px-1 text-[10px] font-semibold text-primary-600">+{list.length - (view === 'week' ? 14 : 3)} more</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-gray-100 bg-white shadow-soft">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">{selected.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="text-xs text-gray-500">{selectedEvents.filter((e) => e.kind === 'delivery').length} deliveries · {selectedEvents.filter((e) => e.kind === 'maintenance').length} maintenance</p>
          </div>
          <ul className="max-h-[62vh] divide-y divide-gray-50 overflow-y-auto">
            {selectedEvents.map((e) => (
              <li key={e.key}>
                <Link to={e.link} className="flex items-start gap-3 px-4 py-3 transition hover:bg-gray-50">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${e.kind === 'maintenance' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'bg-primary-50 text-primary-600'}`}>
                    {e.kind === 'maintenance' ? <Wrench className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">{e.title}</span>
                    <span className="block truncate text-xs text-gray-500">{time(e.date)} · {e.subtitle}</span>
                  </span>
                  <StatusBadge status={e.status} />
                </Link>
              </li>
            ))}
            {!selectedEvents.length && <li className="px-4 py-10 text-center text-sm text-gray-500">Nothing scheduled for this day.</li>}
          </ul>
        </aside>
      </div>
    </div>
  );
}
