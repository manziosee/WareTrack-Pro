import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Search, Settings, LogOut, CheckCheck, Menu, User as UserIcon, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { notificationService, type Notification } from '@/services/notificationService';
import { LogoMark } from '../ui/Logo';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '@/i18n/I18nContext';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenMobileNav: () => void;
}

const timeAgo = (date: string) => {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const severityDot: Record<string, string> = {
  error: 'bg-error-500',
  critical: 'bg-error-500',
  warning: 'bg-warning-500',
  success: 'bg-success-500',
  info: 'bg-info-500',
};

function useClickOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}

export default function Header({ onOpenSearch, onOpenMobileNav }: HeaderProps) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useClickOutside(notifRef, () => setShowNotifications(false));
  useClickOutside(userRef, () => setShowUserMenu(false));

  const { data: recent = [] } = useQuery({
    queryKey: ['notifications', 'recent-unread'],
    queryFn: async () => (await notificationService.getNotifications({ limit: 8, unreadOnly: true })).data || [],
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });

  const { data: unread = 0 } = useQuery({
    queryKey: ['badge', 'unreadNotifications'],
    queryFn: async () => Number((await notificationService.getStats())?.unread) || 0,
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });

  const refreshNotifications = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['badge', 'unreadNotifications'] });
  };

  const markAll = async () => {
    await notificationService.markAllAsRead().catch(() => undefined);
    refreshNotifications();
  };

  const markOne = async (n: Notification) => {
    await notificationService.markAsRead(n.id).catch(() => undefined);
    refreshNotifications();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const firstName = (user?.name || '').split(' ')[0];
  const initials = (user?.name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-gray-100 bg-white/80 px-4 backdrop-blur-xl md:px-6">
      {/* Mobile: menu + logo */}
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link to="/dashboard" className="md:hidden">
        <LogoMark className="h-8 w-8" />
      </Link>

      {/* Search trigger */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden h-9 w-full max-w-sm items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 text-sm text-gray-400 transition hover:border-primary-200 hover:text-gray-600 sm:flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">{t('Search orders, items, drivers…')}</span>
        <kbd className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 sm:hidden"
          aria-label="Search"
        >
          <Search className="h-[1.1rem] w-[1.1rem]" />
        </button>

        <LanguageSwitcher />


        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifications((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 transition hover:bg-gray-100"
            aria-label="Notifications"
          >
            <Bell className="h-[1.1rem] w-[1.1rem]" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lift animate-pop-in">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t('Notifications')}</p>
                  <p className="text-xs text-gray-500">{unread} {t('unread')}</p>
                </div>
                {unread > 0 && (
                  <button onClick={markAll} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50">
                    <CheckCheck className="h-3.5 w-3.5" />
                    {t('Mark all read')}
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {recent.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm font-medium text-gray-700">{t("You're all caught up")}</p>
                    <p className="text-xs text-gray-500">New alerts will appear here.</p>
                  </div>
                ) : (
                  recent.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markOne(n)}
                      className="flex w-full gap-3 border-b border-gray-50 px-4 py-3 text-left transition last:border-0 hover:bg-gray-50"
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDot[(n.severity || '').toLowerCase()] || 'bg-gray-400'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900">{n.title}</span>
                        <span className="line-clamp-2 block text-xs text-gray-500">{n.message}</span>
                        <span className="mt-1 block text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
              <Link
                to="/notifications"
                onClick={() => setShowNotifications(false)}
                className="block border-t border-gray-100 bg-gray-50 py-2.5 text-center text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                {t('View all notifications')}
              </Link>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu((v) => !v)}
            className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition hover:bg-gray-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-xs font-bold text-white">
              {initials}
            </span>
            <span className="hidden text-left lg:block">
              <span className="block text-xs font-semibold leading-tight text-gray-900">{firstName}</span>
              <span className="block text-[10px] leading-tight text-gray-500">{(user?.role || '').replace(/_/g, ' ').toLowerCase()}</span>
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-gray-400 lg:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-lift animate-pop-in">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="truncate text-xs text-gray-500">{user?.email}</p>
              </div>
              <div className="my-1 h-px bg-gray-100" />
              <Link to="/profile" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <UserIcon className="h-4 w-4 text-gray-400" /> {t('Profile')}
              </Link>
              <Link to="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <Settings className="h-4 w-4 text-gray-400" /> {t('Settings')}
              </Link>
              <div className="my-1 h-px bg-gray-100" />
              <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-error-600 hover:bg-error-50">
                <LogOut className="h-4 w-4" /> {t('Log out')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
