import type { ReactNode } from 'react';
import { EmptyBoxIllustration, SearchIllustration, TruckIllustration, ErrorIllustration } from './Illustrations';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** The next step, e.g. a "Create your first order" button. */
  action?: ReactNode;
  variant?: 'empty' | 'search' | 'delivery' | 'error';
  compact?: boolean;
  className?: string;
}

const illustrations = {
  empty: EmptyBoxIllustration,
  search: SearchIllustration,
  delivery: TruckIllustration,
  error: ErrorIllustration,
};

/** Friendly placeholder with an illustration and a clear next step. */
export default function EmptyState({ title, description, action, variant = 'empty', compact, className = '' }: EmptyStateProps) {
  const Illustration = illustrations[variant];
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-14'} ${className}`}>
      <Illustration className={compact ? 'h-20 w-20' : 'h-32 w-32'} />
      <h3 className={`mt-4 font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
