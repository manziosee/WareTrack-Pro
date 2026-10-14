import type { ReactNode } from 'react';

/** Shared presentational pieces for Recharts charts. Colours and axis settings live in chartConfig. */


/** Vertical gradient for area fills: a soft wash of the series colour. */
export function AreaGradient({ id, color }: { id: string; color: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.28} />
      <stop offset="100%" stopColor={color} stopOpacity={0.02} />
    </linearGradient>
  );
}

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: any;
  dataKey?: string | number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  valueFormatter?: (value: number | string, name?: string) => string;
}

/** Card-style tooltip: label on top, one row per series with a colour key. */
export function ChartTooltip({ active, payload, label, valueFormatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const format = valueFormatter ?? ((v: number | string) => (typeof v === 'number' ? v.toLocaleString() : String(v)));

  return (
    <div className="min-w-[160px] rounded-xl border border-gray-100 bg-white/95 px-3.5 py-3 shadow-lift backdrop-blur">
      {label !== undefined && label !== '' && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={`${entry.dataKey ?? entry.name}-${i}`} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 text-gray-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color || entry.payload?.fill || entry.payload?.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums text-gray-900">
              {format(entry.value ?? 0, entry.name)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LegendPayload {
  value?: string;
  color?: string;
}

/** Pill legend rendered above the plot; text stays in ink, the dot carries identity. */
export function ChartLegend({ payload }: { payload?: LegendPayload[] }) {
  if (!payload || payload.length < 2) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-1.5">
      {payload.map((entry) => (
        <span key={entry.value} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </span>
      ))}
    </div>
  );
}


interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Card wrapper giving every chart the same header treatment. */
export function ChartCard({ title, subtitle, icon, action, children, className = '' }: ChartCardProps) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-soft transition-shadow duration-300 hover:shadow-lift ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Friendly placeholder when a chart has no rows to draw. */
export function ChartEmpty({ height = 300, message = 'No data for this period yet' }: { height?: number; message?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60 text-sm text-gray-500"
      style={{ height }}
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-soft">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary-400" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 3v18h18" strokeLinecap="round" />
          <path d="M7 15l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {message}
    </div>
  );
}

interface DonutCenterProps {
  total: number | string;
  label: string;
}

/** Overlay for the middle of a donut chart. */
export function DonutCenter({ total, label }: DonutCenterProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-3xl font-bold text-gray-900">{total}</span>
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
    </div>
  );
}

interface DonutLegendItem {
  name: string;
  value: number;
  color: string;
}

/** List legend for donut charts: colour key, name, value and share. */
export function DonutLegend({ items }: { items: DonutLegendItem[] }) {
  const total = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const share = total > 0 ? Math.round((Number(item.value) / total) * 100) : 0;
        return (
          <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-gray-600">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="truncate capitalize">{item.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="font-semibold tabular-nums text-gray-900">{Number(item.value).toLocaleString()}</span>
              <span className="w-10 rounded-md bg-gray-50 px-1.5 py-0.5 text-right text-xs tabular-nums text-gray-500">{share}%</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
