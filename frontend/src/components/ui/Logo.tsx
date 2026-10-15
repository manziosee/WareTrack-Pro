import { useId } from 'react';

interface LogoMarkProps {
  className?: string;
}

/** The WareTrack mark: a parcel with a route arrow, on the brand gradient. */
export function LogoMark({ className = 'h-9 w-9' }: LogoMarkProps) {
  // Each copy needs its own gradient id; a shared id breaks when one copy is hidden
  const gradientId = `wt-logo-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4682B4" />
          <stop offset="100%" stopColor="#FF8C42" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />
      <path d="M32 13l17 9v20l-17 9-17-9V22l17-9z" fill="white" fillOpacity="0.95" />
      <path d="M15 22l17 9 17-9M32 31v20" stroke="#2F5778" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
      <path d="M23.5 17.5l17 9" stroke="#FF8C42" strokeWidth="3" strokeLinecap="round" />
      <path d="M41 40.5l4 2.5-4 2.5" stroke="#FF8C42" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export default function Logo({ collapsed, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-9 w-9 shrink-0 drop-shadow-sm" />
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-base font-bold tracking-tight text-gray-900">WareTrack</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-500">Pro</p>
        </div>
      )}
    </div>
  );
}
