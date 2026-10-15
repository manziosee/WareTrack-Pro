import { useId, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  SERIES, chartMargin, gridProps, xAxisProps, yAxisProps, lineProps, barProps, tooltipCursor, barCursor, legendProps, compactNumber,
} from './chartConfig';
import { AreaGradient, ChartTooltip, ChartEmpty, DonutCenter, DonutLegend } from './chartTheme';
import { statusHex, statusLabel } from '@/utils/status';

export const formatRWF = (v: number) => `RWF ${compactNumber(Number(v) || 0)}`;

interface SeriesDef {
  key: string;
  name: string;
  color?: string;
  dashed?: boolean;
}

interface TrendProps {
  data: Record<string, any>[];
  xKey?: string;
  series: SeriesDef[];
  height?: number;
  valueFormatter?: (v: number | string) => string;
  /** Show one series at a time with a toggle (for series of different scales). */
  toggle?: boolean;
  area?: boolean;
  yFormatter?: (v: number) => string;
  referenceY?: number;
}

/** Area or line chart over time, with an optional series toggle. */
export function TrendChart({ data, xKey = 'label', series, height = 240, valueFormatter, toggle, area = true, yFormatter, referenceY }: TrendProps) {
  const id = useId().replace(/:/g, '');
  const [active, setActive] = useState(series[0]?.key);
  if (!data?.length) return <ChartEmpty height={height} />;
  const shown = toggle ? series.filter((s) => s.key === active) : series;
  const Chart = area ? AreaChart : LineChart;

  return (
    <div>
      {toggle && series.length > 1 && (
        <div className="mb-2 flex w-fit rounded-lg bg-gray-100 p-0.5 text-[11px] font-medium">
          {series.map((s) => (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`rounded-md px-2.5 py-1 transition ${active === s.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data} margin={chartMargin}>
          <defs>
            {shown.map((s, i) => (
              <AreaGradient key={s.key} id={`${id}-${s.key}`} color={s.color || SERIES[i]} />
            ))}
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey={xKey} {...xAxisProps} minTickGap={18} />
          <YAxis {...yAxisProps} tickFormatter={yFormatter || yAxisProps.tickFormatter} />
          <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} cursor={tooltipCursor} />
          {!toggle && shown.length > 1 && <Legend {...legendProps} />}
          {referenceY !== undefined && <ReferenceLine y={referenceY} stroke="#94A3B8" strokeDasharray="4 4" />}
          {shown.map((s, i) =>
            area ? (
              <Area
                key={s.key}
                {...lineProps}
                dataKey={s.key}
                name={s.name}
                stroke={s.color || SERIES[i]}
                fill={`url(#${id}-${s.key})`}
                strokeDasharray={s.dashed ? '5 4' : undefined}
              />
            ) : (
              <Line key={s.key} {...lineProps} dataKey={s.key} name={s.name} stroke={s.color || SERIES[i]} strokeDasharray={s.dashed ? '5 4' : undefined} />
            )
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

interface BarsProps {
  data: Record<string, any>[];
  xKey?: string;
  series: SeriesDef[];
  height?: number;
  stacked?: boolean;
  valueFormatter?: (v: number | string) => string;
  /** Colour each bar by its status value instead of the series colour. */
  colorByStatus?: boolean;
  highlightMax?: boolean;
}

/** Vertical bar chart (grouped or stacked). */
export function BarsChart({ data, xKey = 'label', series, height = 240, stacked, valueFormatter, colorByStatus, highlightMax }: BarsProps) {
  if (!data?.length) return <ChartEmpty height={height} />;
  const maxValue = highlightMax ? Math.max(...data.map((d) => Number(d[series[0].key]) || 0)) : null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={chartMargin} barGap={2}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} {...xAxisProps} minTickGap={8} interval="preserveStartEnd" />
        <YAxis {...yAxisProps} />
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} cursor={barCursor} />
        {series.length > 1 && <Legend {...legendProps} />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            {...barProps}
            radius={stacked && i < series.length - 1 ? [0, 0, 0, 0] : barProps.radius}
            dataKey={s.key}
            name={s.name}
            fill={s.color || SERIES[i]}
            stackId={stacked ? 'stack' : undefined}
          >
            {(colorByStatus || highlightMax) &&
              data.map((d, idx) => (
                <Cell
                  key={idx}
                  fill={
                    colorByStatus
                      ? statusHex(d[xKey])
                      : Number(d[s.key]) === maxValue
                        ? '#FF8C42'
                        : s.color || SERIES[i]
                  }
                />
              ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface DonutProps {
  data: { name: string; value: number; color?: string }[];
  centerLabel: string;
  /** Use status colours (e.g. order statuses) instead of the categorical palette. */
  statusColors?: boolean;
  height?: number;
  format?: (v: number) => string;
  maxSlices?: number;
}

/** Donut chart with a total in the middle and a list legend beside it. */
export function DonutChart({ data, centerLabel, statusColors, height = 210, format, maxSlices = 6 }: DonutProps) {
  const sorted = [...(data || [])].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  if (!sorted.length) return <ChartEmpty height={height} />;
  const top = sorted.slice(0, maxSlices - 1);
  const rest = sorted.slice(maxSlices - 1).reduce((s, d) => s + d.value, 0);
  const slices = [
    ...top.map((d, i) => ({
      name: statusColors ? statusLabel(d.name) : d.name,
      value: d.value,
      color: d.color || (statusColors ? statusHex(d.name) : SERIES[i]),
    })),
    ...(rest > 0 ? [{ name: 'Other', value: rest, color: '#94A3B8' }] : []),
  ];
  const total = slices.reduce((s, d) => s + d.value, 0);

  return (
    <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="94%" paddingAngle={2} cornerRadius={5} stroke="#fff" strokeWidth={2}>
              {slices.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip valueFormatter={format ? (v) => format(Number(v)) : undefined} />} />
          </PieChart>
        </ResponsiveContainer>
        <DonutCenter total={format ? format(total) : total.toLocaleString()} label={centerLabel} />
      </div>
      <DonutLegend items={slices} format={format} />
    </div>
  );
}

interface BarListProps {
  data: { name: string; value: number; secondary?: string }[];
  format?: (v: number) => string;
  color?: string;
  limit?: number;
  emptyMessage?: string;
}

/** Ranked horizontal bars rendered in HTML: easy to read names, values and proportions. */
export function BarList({ data, format = (v) => v.toLocaleString(), color = '#4682B4', limit = 7, emptyMessage }: BarListProps) {
  const rows = (data || []).slice(0, limit);
  if (!rows.length) return <ChartEmpty height={160} message={emptyMessage} />;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((row, i) => (
        <li key={row.name} className="group">
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-4 shrink-0 text-right font-semibold tabular-nums text-gray-400">{i + 1}</span>
              <span className="truncate font-medium text-gray-700">{row.name}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-gray-900">
              {format(row.value)}
              {row.secondary && <span className="ml-1.5 font-normal text-gray-400">{row.secondary}</span>}
            </span>
          </div>
          <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-700 group-hover:opacity-80"
              style={{ width: `${Math.max(3, (row.value / max) * 100)}%`, background: i === 0 ? '#FF8C42' : color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

interface MeterProps {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  hint?: string;
}

/** Thin progress meter: green when healthy, amber/red when it drops. */
export function Meter({ label, value, max = 100, suffix = '%', hint }: MeterProps) {
  const ratio = Math.max(0, Math.min(1, value / max));
  const color = ratio >= 0.85 ? 'bg-success-500' : ratio >= 0.6 ? 'bg-warning-500' : 'bg-error-500';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600">{label}</span>
        <span className="font-semibold tabular-nums text-gray-900">
          {Math.round(value * 10) / 10}
          {suffix}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${ratio * 100}%` }} />
      </div>
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}
