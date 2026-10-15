import type { ReactNode } from 'react';

/** Building blocks for the read-only "view details" modals. */

interface DetailHeroProps {
  avatar: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
}

export function DetailHero({ avatar, title, subtitle, badges }: DetailHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#2F5778_0%,#3A6D96_45%,#4682B4_100%)] p-5 text-white shadow-glow">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 right-16 h-32 w-32 rounded-full bg-[#FF8C42]/30 blur-2xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold ring-1 ring-white/30 backdrop-blur">
            {avatar}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold">{title}</h3>
            {subtitle && <div className="truncate text-sm text-white/80">{subtitle}</div>}
          </div>
        </div>
        {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
      </div>
    </div>
  );
}

interface DetailStatProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
}

const toneStyles = {
  primary: 'bg-primary-50 text-primary-600',
  accent: 'bg-accent-50 text-accent-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  error: 'bg-error-50 text-error-600',
};

export function DetailStat({ label, value, hint, icon, tone = 'primary' }: DetailStatProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
        {icon && <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneStyles[tone]}`}>{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

interface DetailSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function DetailSection({ title, icon, children }: DetailSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-primary-600 shadow-sm">
            {icon}
          </span>
        )}
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{title}</h4>
      </div>
      {children}
    </section>
  );
}

interface DetailFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function DetailField({ label, children, className = '' }: DetailFieldProps) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-gray-900">{children}</dd>
    </div>
  );
}

export function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>;
}
