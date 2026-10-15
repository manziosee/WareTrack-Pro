import { toneFor, statusLabel, type StatusTone } from '@/utils/status';

const styles: Record<StatusTone, { pill: string; dot: string }> = {
  success: { pill: 'bg-success-50 text-success-700 ring-success-200', dot: 'bg-success-500' },
  info: { pill: 'bg-info-50 text-info-700 ring-info-200', dot: 'bg-info-500' },
  warning: { pill: 'bg-warning-50 text-warning-700 ring-warning-200', dot: 'bg-warning-500' },
  error: { pill: 'bg-error-50 text-error-700 ring-error-200', dot: 'bg-error-500' },
  gray: { pill: 'bg-gray-50 text-gray-700 ring-gray-200', dot: 'bg-gray-400' },
  primary: { pill: 'bg-primary-50 text-primary-700 ring-primary-200', dot: 'bg-primary-500' },
  accent: { pill: 'bg-accent-50 text-accent-700 ring-accent-200', dot: 'bg-accent-500' },
};

interface StatusBadgeProps {
  status?: string | null;
  size?: 'sm' | 'md';
  className?: string;
  pulse?: boolean;
}

/** Badge whose colour is decided by the status value itself. */
export default function StatusBadge({ status, size = 'sm', className = '', pulse }: StatusBadgeProps) {
  const tone = toneFor(status);
  const live = pulse ?? ['IN_TRANSIT', 'ON_DUTY'].includes((status || '').toUpperCase());
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset ${styles[tone].pill} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      } ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {live && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${styles[tone].dot}`} />}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${styles[tone].dot}`} />
      </span>
      {statusLabel(status)}
    </span>
  );
}
