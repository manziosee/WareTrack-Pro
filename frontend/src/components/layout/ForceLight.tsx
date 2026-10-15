import { useLayoutEffect, type ReactNode } from 'react';
import { useTheme } from '@/context/ThemeContext';

/** Public marketing pages are designed for light backgrounds; keep them light. */
export default function ForceLight({ children }: { children: ReactNode }) {
  const { isDark } = useTheme();
  useLayoutEffect(() => {
    document.documentElement.classList.remove('dark');
    return () => {
      document.documentElement.classList.toggle('dark', isDark);
    };
  }, [isDark]);
  return <>{children}</>;
}
