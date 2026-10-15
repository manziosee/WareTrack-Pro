import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Buttons pinned to the bottom of the panel. */
  footer?: ReactNode;
  width?: 'md' | 'lg' | 'xl';
  children: ReactNode;
}

const widths = { md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-3xl' };

/** Side panel that slides in from the right; the list stays visible behind it. */
export default function Drawer({ open, onClose, title, subtitle, icon, footer, width = 'lg', children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-primary-900/15 animate-fade-in" onClick={onClose} />
      <aside
        role="dialog"
        aria-label={title}
        className={`absolute inset-y-0 right-0 flex w-full ${widths[width]} flex-col bg-white shadow-lift ring-1 ring-black/5 animate-slide-in-right`}
      >
        <div className="h-1 shrink-0 bg-gradient-to-r from-primary-500 via-primary-400 to-accent-500" />
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white shadow-glow">{icon}</span>}
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-gray-900">{title}</h2>
              {subtitle && <p className="truncate text-xs text-gray-500">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:rotate-90 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">{footer}</footer>}
      </aside>
    </div>
  );
}
