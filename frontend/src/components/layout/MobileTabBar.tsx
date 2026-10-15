import { NavLink } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { mobileNavForRole } from '@/config/navigation';
import { useNavBadges } from '@/hooks/useNavBadges';
import { useI18n } from '@/i18n/I18nContext';

/** Bottom tab bar on phones: the role's most-used pages plus a "More" menu. */
export default function MobileTabBar({ onMore }: { onMore: () => void }) {
  const { user } = useAuth();
  const badges = useNavBadges();
  const { t } = useI18n();
  const items = mobileNavForRole(user?.role);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const count = item.badge ? badges[item.badge] : 0;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                  isActive ? 'text-accent-600' : 'text-gray-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`flex h-8 w-12 items-center justify-center rounded-full transition ${isActive ? 'bg-accent-50' : ''}`}>
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="truncate">{t(item.name)}</span>
                  {count > 0 && (
                    <span className="absolute right-[calc(50%-1.4rem)] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
        <button type="button" onClick={onMore} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-gray-500">
          <span className="flex h-8 w-12 items-center justify-center rounded-full">
            <MoreHorizontal className="h-5 w-5" />
          </span>
          {t('More')}
        </button>
      </div>
    </nav>
  );
}
