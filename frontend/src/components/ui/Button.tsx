import type { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.97] enabled:hover:-translate-y-0.5';

  const variantStyles = {
    primary: 'bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-glow hover:from-primary-600 hover:to-primary-700 focus-visible:ring-primary-500',
    secondary: 'bg-white text-gray-800 border border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 focus-visible:ring-gray-400',
    success: 'bg-gradient-to-b from-success-500 to-success-600 text-white shadow-sm hover:to-success-700 focus-visible:ring-success-500',
    warning: 'bg-gradient-to-b from-warning-500 to-warning-600 text-white shadow-sm hover:to-warning-700 focus-visible:ring-warning-500',
    error: 'bg-gradient-to-b from-error-500 to-error-600 text-white shadow-sm hover:to-error-700 focus-visible:ring-error-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-400',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-primary-300 focus-visible:ring-gray-400',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className} disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
    >
      {children}
    </button>
  );
}
