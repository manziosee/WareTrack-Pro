import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileTabBar from './MobileTabBar';
import CommandPalette from './CommandPalette';
import OfflineIndicator from '../ui/OfflineIndicator';
import { LogoMark } from '../ui/Logo';

interface MainLayoutProps {
  children: ReactNode;
}

const COLLAPSE_KEY = 'waretrack-sidebar-collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1');
      } catch {
        // Ignore storage failures
      }
      return !value;
    });
  };

  // Ctrl/Cmd + K opens the command palette from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close the phone menu after navigating
  useEffect(() => {
    setMobileNavOpen(false);
    document.getElementById('main-content')?.focus();
  }, [location.pathname]);

  const openPalette = useCallback(() => setPaletteOpen(true), []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <LogoMark className="h-12 w-12 animate-pulse" />
        <p className="text-sm text-gray-500">Loading your workspace…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <a href="#main-content" className="sr-only z-[100] rounded bg-white px-4 py-3 text-primary-900 shadow focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to main content
      </a>
      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 md:block">
        <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} onOpenSearch={openPalette} />
      </aside>

      {/* Phone slide-out menu */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default bg-primary-900/40 backdrop-blur-sm animate-fade-in" aria-label="Close navigation menu" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 animate-[slide-in-left_0.25s_ease-out]">
            <Sidebar collapsed={false} onToggle={() => setMobileNavOpen(false)} onOpenSearch={() => { setMobileNavOpen(false); openPalette(); }} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onOpenSearch={openPalette} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          <div key={location.pathname} className="mx-auto w-full max-w-[1600px] p-4 pb-24 animate-page-in md:p-6 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      <MobileTabBar onMore={() => setMobileNavOpen(true)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <OfflineIndicator />
    </div>
  );
}
