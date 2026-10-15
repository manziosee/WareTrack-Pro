import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navForRole } from '@/config/navigation';
import { useNavBadges } from '@/hooks/useNavBadges';
import Logo from '../ui/Logo';
import { useI18n } from '@/i18n/I18nContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onOpenSearch: () => void;
}

function Tooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-700">
      {label}
    </span>
  );
}

export default function Sidebar({ collapsed, onToggle, onOpenSearch }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const badges = useNavBadges();
  const { t } = useI18n();
  const sections = navForRole(user?.role);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className={`relative flex h-full flex-col border-r border-gray-100 bg-white transition-[width] duration-300 ${collapsed ? 'w-[4.5rem]' : 'w-64'}`}>
      {/* Brand */}
      <div className={`flex h-16 items-center border-b border-gray-100 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <Logo collapsed={collapsed} />
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="absolute -right-3 top-[3.25rem] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:text-primary-600"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Search shortcut */}
      <div className={`px-3 pt-4 ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          type="button"
          onClick={onOpenSearch}
          className={`group relative flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 transition hover:border-primary-200 hover:text-gray-700 ${
            collapsed ? 'h-10 w-10 justify-center' : 'w-full px-3 py-2'
          }`}
        >
          <Search className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{t('Search…')}</span>
              <kbd className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">Ctrl K</kbd>
            </>
          )}
          {collapsed && <Tooltip label="Search (Ctrl K)" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">{t(section.title)}</p>
            )}
            {collapsed && <div className="mx-auto mb-2 h-px w-6 bg-gray-100" />}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const count = item.badge ? badges[item.badge] : 0;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={({ isActive }) =>
                      `group relative flex items-center rounded-xl text-sm font-medium transition-all ${
                        collapsed ? 'h-10 justify-center' : 'gap-3 px-3 py-2'
                      } ${
                        isActive
                          ? 'bg-accent-50 text-accent-700 shadow-[inset_3px_0_0_0] shadow-accent-500'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={`h-[1.15rem] w-[1.15rem] shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-accent-600' : ''}`} />
                        {!collapsed && <span className="flex-1 truncate">{t(item.name)}</span>}
                        {count > 0 && (
                          <span
                            className={`flex items-center justify-center rounded-full bg-accent-500 font-semibold text-white ${
                              collapsed ? 'absolute right-1.5 top-1.5 h-4 min-w-4 px-1 text-[9px]' : 'h-5 min-w-5 px-1.5 text-[10px]'
                            }`}
                          >
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                        {collapsed && <Tooltip label={t(item.name)} />}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="border-t border-gray-100 p-3">
        <div className={`flex items-center gap-3 rounded-xl ${collapsed ? 'justify-center' : 'bg-gray-50 p-2'}`}>
          {!collapsed && (
            <>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-xs font-bold text-white">
                {(user?.name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-gray-900">{user?.name}</p>
                <p className="truncate text-[10px] text-gray-500">{(user?.role || '').replace(/_/g, ' ').toLowerCase()}</p>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-error-50 hover:text-error-600"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
            {collapsed && <Tooltip label={t('Log out')} />}
          </button>
        </div>
      </div>
    </div>
  );
}
