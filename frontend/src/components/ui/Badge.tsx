import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Badge({ children, variant = 'primary', size = 'md', className = '' }: BadgeProps) {
  const baseStyles = 'inline-flex items-center gap-1.5 font-medium rounded-full ring-1 ring-inset whitespace-nowrap';

  const variantStyles = {
    primary: 'bg-primary-50 text-primary-700 ring-primary-200',
    success: 'bg-success-50 text-success-700 ring-success-200',
    warning: 'bg-warning-50 text-warning-700 ring-warning-200',
    error: 'bg-error-50 text-error-700 ring-error-200',
    info: 'bg-info-50 text-info-700 ring-info-200',
    gray: 'bg-gray-50 text-gray-700 ring-gray-200',
  };

  const dotStyles = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    info: 'bg-info-500',
    gray: 'bg-gray-400',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[variant]}`} aria-hidden="true" />
      {children}
    </span>
  );
}
