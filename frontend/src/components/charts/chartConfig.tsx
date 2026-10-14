import { ChartLegend } from './chartTheme';

/**
 * Shared chart styling for every Recharts chart in the app.
 *
 * SERIES is the categorical palette, derived from the brand steel blue and
 * orange and validated for colour-blind separation. Assign it in fixed order
 * and never cycle it. STATUS colours are reserved for order/delivery states.
 */
export const SERIES = ['#3B7DC4', '#FF8C42', '#2A9D8F', '#8B5CF6', '#E0578A', '#B8860B'];

export const STATUS = {
  good: '#10B981',
  warning: '#F59E0B',
  critical: '#EF4444',
  info: '#3B82F6',
  neutral: '#9CA3AF',
};

const INK_MUTED = '#6B7280';
const GRID = '#EEF1F5';

export const chartMargin = { top: 8, right: 12, left: -8, bottom: 0 };

export const gridProps = {
  stroke: GRID,
  vertical: false,
};

export const xAxisProps = {
  tick: { fontSize: 12, fill: INK_MUTED },
  tickLine: false,
  axisLine: { stroke: GRID },
  tickMargin: 10,
};

export const yAxisProps = {
  tick: { fontSize: 12, fill: INK_MUTED },
  tickLine: false,
  axisLine: false,
  tickMargin: 6,
  width: 56,
  allowDecimals: false,
  tickFormatter: (v: number) => compactNumber(v),
};

export const lineProps = {
  type: 'monotone' as const,
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  dot: false,
  activeDot: { r: 5, strokeWidth: 2, stroke: '#fff' },
};

export const barProps = {
  radius: [6, 6, 0, 0] as [number, number, number, number],
  maxBarSize: 28,
};

export const tooltipCursor = { stroke: '#C1D6E7', strokeWidth: 1 };
export const barCursor = { fill: 'rgba(70, 130, 180, 0.06)' };

export function compactNumber(value: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return String(value ?? '');
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export const legendProps = {
  verticalAlign: 'top' as const,
  align: 'right' as const,
  content: <ChartLegend />,
};
