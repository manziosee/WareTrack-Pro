import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Package, Car, UserCheck, CornerDownLeft, Moon, Sun, LogOut, Plus, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { NAV_SECTIONS } from '@/config/navigation';

interface CommandItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const asList = (res: any): any[] => {
  const data = res?.data?.data ?? res?.data ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

/** Ctrl+K palette: jump to pages, run quick actions and search records. */
export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [records, setRecords] = useState<CommandItem[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const go = (path: string) => () => {
    navigate(path);
    onClose();
  };

  const role = user?.role;

  const staticItems = useMemo<CommandItem[]>(() => {
    if (!role) return [];
    const pages = NAV_SECTIONS.flatMap((s) => s.items)
      .filter((item) => item.roles.includes(role))
      .map((item) => ({
        id: `page-${item.href}`,
        group: 'Pages',
        label: item.name,
        hint: item.keywords,
        icon: item.icon,
        run: go(item.href),
      }));

    const actions: CommandItem[] = [];
    if (['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER'].includes(role)) {
      actions.push({ id: 'new-order', group: 'Actions', label: 'Create order', hint: 'new add', icon: Plus, run: go('/orders?new=1') });
    }
    if (['ADMIN', 'WAREHOUSE_STAFF'].includes(role)) {
      actions.push({ id: 'new-item', group: 'Actions', label: 'Add inventory item', hint: 'new stock product', icon: Plus, run: go('/inventory?new=1') });
    }
    actions.push(
      { id: 'theme', group: 'Actions', label: isDark ? 'Switch to light mode' : 'Switch to dark mode', hint: 'theme dark light', icon: isDark ? Sun : Moon, run: () => { toggle(); onClose(); } },
      { id: 'logout', group: 'Actions', label: 'Log out', hint: 'sign out exit', icon: LogOut, run: async () => { onClose(); await logout(); navigate('/'); } },
    );
    return [...pages, ...actions];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, isDark]);

  // Search records as the user types (debounced)
  useEffect(() => {
    if (!open || query.trim().length < 2 || !role) {
      setRecords([]);
      return;
    }
    const q = query.trim();
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      const canSee = (roles: string[]) => roles.includes(role);
      const safeGet = (url: string, enabled: boolean) =>
        enabled ? api.get(url, { params: { search: q, limit: 5 } }).catch(() => null) : Promise.resolve(null);
      const [orders, items, drivers, vehicles] = await Promise.all([
        safeGet('/orders', canSee(['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER'])),
        safeGet('/inventory', canSee(['ADMIN', 'WAREHOUSE_STAFF'])),
        safeGet('/drivers', canSee(['ADMIN', 'DISPATCH_OFFICER', 'DRIVER'])),
        safeGet('/vehicles', canSee(['ADMIN', 'DISPATCH_OFFICER', 'DRIVER'])),
      ]);
      if (cancelled) return;
      const match = (text: string) => text.toLowerCase().includes(q.toLowerCase());
      const found: CommandItem[] = [
        ...asList(orders).filter((o) => match(`${o.orderNumber} ${o.customerName}`)).slice(0, 5).map((o) => ({
          id: `order-${o.id}`, group: 'Orders', label: o.orderNumber || `Order #${o.id}`, hint: o.customerName, icon: ShoppingCart, run: go(`/orders/${o.id}`),
        })),
        ...asList(items).filter((i) => match(`${i.name} ${i.code}`)).slice(0, 5).map((i) => ({
          id: `item-${i.id}`, group: 'Inventory', label: i.name, hint: i.code, icon: Package, run: go(`/inventory?view=${i.id}`),
        })),
        ...asList(drivers).filter((d) => match(`${d.name} ${d.licenseNumber}`)).slice(0, 4).map((d) => ({
          id: `driver-${d.id}`, group: 'Drivers', label: d.name, hint: d.licenseNumber, icon: UserCheck, run: go(`/drivers?view=${d.id}`),
        })),
        ...asList(vehicles).filter((v) => match(`${v.plateNumber} ${v.type}`)).slice(0, 4).map((v) => ({
          id: `vehicle-${v.id}`, group: 'Vehicles', label: v.plateNumber, hint: v.type, icon: Car, run: go(`/vehicles?view=${v.id}`),
        })),
      ];
      setRecords(found);
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? staticItems.filter((item) => `${item.label} ${item.hint || ''} ${item.group}`.toLowerCase().includes(q))
      : staticItems;
    return [...base, ...records];
  }, [query, staticItems, records]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[active]?.run();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  let lastGroup = '';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-primary-900/40 p-4 pt-[12vh] backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-black/5 animate-pop-in" role="dialog" aria-label="Command palette">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4">
          {searching ? <Loader2 className="h-4 w-4 animate-spin text-primary-500" /> : <Search className="h-4 w-4 text-gray-400" />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, actions, orders, items, drivers…"
            className="h-12 flex-1 border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0 dark:bg-transparent"
            style={{ background: 'transparent', border: 0 }}
          />
          <kbd className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">Esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 && !searching && (
            <p className="px-3 py-8 text-center text-sm text-gray-500">No results for “{query}”</p>
          )}
          {filtered.map((item, index) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {header && <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{header}</p>}
                <button
                  data-index={index}
                  onMouseEnter={() => setActive(index)}
                  onClick={item.run}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                    index === active ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                  }`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${index === active ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <item.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.label}</span>
                    {item.hint && item.group !== 'Pages' && item.group !== 'Actions' && (
                      <span className="block truncate text-xs text-gray-500">{item.hint}</span>
                    )}
                  </span>
                  {index === active && <CornerDownLeft className="h-3.5 w-3.5 text-primary-400" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 border-t border-gray-100 bg-gray-50 px-4 py-2 text-[11px] text-gray-500">
          <span><kbd className="font-semibold">↑↓</kbd> navigate</span>
          <span><kbd className="font-semibold">Enter</kbd> open</span>
          <span><kbd className="font-semibold">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
