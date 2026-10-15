import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import CountUp from './CountUp';
import Sparkline from '../charts/Sparkline';

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'info';

const toneStyles: Record<Tone, { icon: string; spark: string }> = {
  primary: { icon: 'bg-primary-50 text-primary-600', spark: '#4682B4' },
  accent: { icon: 'bg-accent-50 text-accent-600', spark: '#FF8C42' },
  success: { icon: 'bg-success-50 text-success-600', spark: '#10B981' },
  warning: { icon: 'bg-warning-50 text-warning-600', spark: '#F59E0B' },
  error: { icon: 'bg-error-50 text-error-600', spark: '#EF4444' },
  info: { icon: 'bg-info-50 text-info-600', spark: '#3B82F6' },
};

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: Tone;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  compact?: boolean;
  /** Percentage change versus the previous period. */
  change?: number | null;
  changeLabel?: string;
  /** Set when a rise is bad news (e.g. alerts, late deliveries). */
  invertChange?: boolean;
  trend?: number[];
  to?: string;
}

/** Stat tile with an animated value, change indicator and a sparkline. */
export default function StatCard({
  label, value, icon, tone = 'primary', prefix, suffix, decimals, compact,
  change, changeLabel = 'vs last week', invertChange, trend, to,
}: StatCardProps) {
  const hasChange = typeof change === 'number' && Number.isFinite(change);
  const good = hasChange && (invertChange ? change! < 0 : change! > 0);
  const flat = hasChange && change === 0;

  const content = (
    <div className="group h-full rounded-2xl border border-gray-100 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">
            <CountUp value={value} prefix={prefix} suffix={suffix} decimals={decimals} compact={compact} />
          </p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${toneStyles[tone].icon}`}>
          {icon}
        </div>
      </div>
      {trend && trend.length > 1 && (
        <div className="mt-3 -mx-1">
          <Sparkline data={trend} color={toneStyles[tone].spark} height={32} />
        </div>
      )}
      {hasChange && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold ${
              flat ? 'bg-gray-100 text-gray-600' : good ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700'
            }`}
          >
            {flat ? <Minus className="h-3 w-3" /> : change! > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {change! > 0 ? '+' : ''}{change}%
          </span>
          <span className="text-gray-400">{changeLabel}</span>
        </div>
      )}
    </div>
  );

  return to ? <Link to={to} className="block h-full">{content}</Link> : content;
}
