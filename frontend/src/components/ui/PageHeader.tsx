import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Parent pages; the current page (title) is added automatically. */
  breadcrumbs?: Crumb[];
  /** Main actions, shown on the right. */
  actions?: ReactNode;
  icon?: ReactNode;
}

/** Consistent page title block: breadcrumbs, title, subtitle and actions. */
export default function PageHeader({ title, subtitle, breadcrumbs = [], actions, icon }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-xs text-gray-500">
          <Link to="/dashboard" className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-gray-100 hover:text-gray-800">
            <Home className="h-3.5 w-3.5" />
            <span className="sr-only">Dashboard</span>
          </Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.label} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-gray-300" />
              {crumb.to ? (
                <Link to={crumb.to} className="rounded-md px-1 py-0.5 hover:bg-gray-100 hover:text-gray-800">{crumb.label}</Link>
              ) : (
                <span className="px-1">{crumb.label}</span>
              )}
            </span>
          ))}
          <ChevronRight className="h-3 w-3 text-gray-300" />
          <span className="px-1 font-medium text-gray-700">{title}</span>
        </nav>
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-glow">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
