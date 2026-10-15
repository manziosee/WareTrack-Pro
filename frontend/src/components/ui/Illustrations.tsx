/**
 * Small inline illustrations in the brand colours. They use currentColor and
 * Tailwind fills so they adapt to dark mode.
 */

interface IllustrationProps {
  className?: string;
}

export function EmptyBoxIllustration({ className = 'h-32 w-32' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 160" className={className} fill="none" aria-hidden="true">
      <circle cx="80" cy="84" r="64" className="fill-primary-50" />
      <ellipse cx="80" cy="132" rx="44" ry="6" className="fill-gray-200" />
      <path d="M40 68l40-18 40 18v46l-40 18-40-18V68z" className="fill-white stroke-primary-300" strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 68l40 18 40-18M80 86v46" className="stroke-primary-300" strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 68l-12 16 40 18 12-16" className="fill-primary-100 stroke-primary-300" strokeWidth="3" strokeLinejoin="round" />
      <path d="M120 68l12 16-40 18-12-16" className="fill-primary-100 stroke-primary-300" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="118" cy="36" r="10" className="fill-accent-400" />
      <path d="M114 36h8M118 32v8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="40" r="4" className="fill-accent-300" />
      <circle cx="132" cy="104" r="3" className="fill-primary-300" />
    </svg>
  );
}

export function SearchIllustration({ className = 'h-32 w-32' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 160" className={className} fill="none" aria-hidden="true">
      <circle cx="80" cy="84" r="64" className="fill-accent-50" />
      <rect x="34" y="44" width="72" height="88" rx="10" className="fill-white stroke-gray-200" strokeWidth="3" />
      <path d="M48 66h44M48 80h32M48 94h40" className="stroke-gray-200" strokeWidth="4" strokeLinecap="round" />
      <circle cx="104" cy="96" r="22" className="fill-white stroke-primary-400" strokeWidth="6" />
      <path d="M120 112l16 16" className="stroke-primary-500" strokeWidth="8" strokeLinecap="round" />
      <path d="M97 96h14" className="stroke-accent-400" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function TruckIllustration({ className = 'h-32 w-32' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 160" className={className} fill="none" aria-hidden="true">
      <circle cx="80" cy="80" r="64" className="fill-primary-50" />
      <path d="M20 118h120" className="stroke-gray-200" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 8" />
      <rect x="28" y="58" width="64" height="48" rx="6" className="fill-primary-500" />
      <path d="M92 72h22l14 16v18H92V72z" className="fill-accent-500" />
      <path d="M100 78h12l8 10h-20V78z" className="fill-white/80" />
      <circle cx="48" cy="108" r="10" className="fill-gray-800 stroke-white" strokeWidth="4" />
      <circle cx="110" cy="108" r="10" className="fill-gray-800 stroke-white" strokeWidth="4" />
      <path d="M40 72h36M40 84h24" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <path d="M8 76h12M4 88h14M10 100h10" className="stroke-accent-300" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LostIllustration({ className = 'h-48 w-48' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <circle cx="100" cy="100" r="80" className="fill-primary-50" />
      <path d="M100 30c-26 0-46 20-46 46 0 34 46 84 46 84s46-50 46-84c0-26-20-46-46-46z" className="fill-accent-500" />
      <circle cx="100" cy="76" r="18" className="fill-white" />
      <text x="100" y="83" textAnchor="middle" className="fill-accent-600" fontSize="20" fontWeight="700" fontFamily="Space Grotesk, sans-serif">?</text>
      <ellipse cx="100" cy="168" rx="40" ry="6" className="fill-gray-200" />
      <path d="M30 150c20-12 40 8 60-4M118 150c16-10 34 6 52-2" className="stroke-primary-200" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 6" />
    </svg>
  );
}

export function ErrorIllustration({ className = 'h-32 w-32' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 160" className={className} fill="none" aria-hidden="true">
      <circle cx="80" cy="80" r="64" className="fill-error-50" />
      <path d="M80 36l46 80H34l46-80z" className="fill-white stroke-error-400" strokeWidth="4" strokeLinejoin="round" />
      <path d="M80 70v22" className="stroke-error-500" strokeWidth="6" strokeLinecap="round" />
      <circle cx="80" cy="104" r="4" className="fill-error-500" />
    </svg>
  );
}
