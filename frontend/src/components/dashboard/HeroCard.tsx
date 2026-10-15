import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import CountUp from '../ui/CountUp';
import Sparkline from '../charts/Sparkline';

interface HeroCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  compact?: boolean;
  change?: number | null;
  caption?: string;
  series?: number[];
  icon?: ReactNode;
  /** Small key figures shown on the right. */
  extras?: { label: string; value: ReactNode }[];
}

/** The one big number each dashboard leads with. */
export default function HeroCard({ label, value, prefix, suffix, compact, change, caption, series, icon, extras }: HeroCardProps) {
  const hasChange = typeof change === 'number' && Number.isFinite(change);
  return (
    <div className="relative mb-5 overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#23415A_0%,#2F5778_35%,#3A6D96_70%,#4682B4_100%)] p-5 text-white shadow-glow sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#FF8C42]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      {series && series.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 opacity-40">
          <Sparkline data={series} color="#FFD8B8" height={90} />
        </div>
      )}
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-white/70">
            {icon}
            {label}
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <p className="text-4xl font-bold tracking-tight sm:text-5xl">
              <CountUp value={value} prefix={prefix} suffix={suffix} compact={compact} />
            </p>
            {hasChange && (
              <span className={`mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${change! >= 0 ? 'bg-[#10B981]/25 text-[#D1FAE5]' : 'bg-[#EF4444]/30 text-[#FEE2E2]'}`}>
                {change! >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {change! > 0 ? '+' : ''}{change}% vs previous period
              </span>
            )}
          </div>
          {caption && <p className="mt-1.5 text-sm text-white/75">{caption}</p>}
        </div>
        {extras && extras.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
            {extras.map((x) => (
              <div key={x.label} className="min-w-[7.5rem] rounded-2xl bg-white/10 px-3.5 py-2.5 ring-1 ring-white/15 backdrop-blur">
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">{x.label}</p>
                <p className="mt-0.5 text-lg font-bold">{x.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
