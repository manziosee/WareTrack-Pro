import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { GripVertical, Eye, EyeOff, ArrowUp, ArrowDown, RotateCcw, Check, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import { insightsService, type DashboardLayout } from '@/services/insightsService';
import { useI18n } from '@/i18n/I18nContext';

export interface DashboardCard {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Columns on large screens (out of 3). */
  span?: 1 | 2 | 3;
  action?: ReactNode;
  render: () => ReactNode;
  /** Render without the card frame (e.g. a row of stat tiles). */
  bare?: boolean;
}

interface DashboardGridProps {
  /** Separate saved layouts per dashboard. */
  storageKey: string;
  cards: DashboardCard[];
  editing: boolean;
}

const spanClass = { 1: 'lg:col-span-1', 2: 'lg:col-span-2', 3: 'lg:col-span-3' };

function readLocal(key: string): DashboardLayout | null {
  try {
    const raw = localStorage.getItem(`waretrack-dash-${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, layout: DashboardLayout) {
  try {
    localStorage.setItem(`waretrack-dash-${key}`, JSON.stringify(layout));
  } catch {
    // Ignore storage failures; the server copy still applies
  }
}

/** Grid of dashboard cards the user can reorder and hide. */
export default function DashboardGrid({ storageKey, cards, editing }: DashboardGridProps) {
  const { t } = useI18n();
  const defaultOrder = useMemo(() => cards.map((c) => c.id), [cards]);
  const [layout, setLayout] = useState<DashboardLayout>(() => readLocal(storageKey) || { order: defaultOrder, hidden: [] });
  const [dragId, setDragId] = useState<string | null>(null);

  // Load the account's saved layout (works across devices)
  useEffect(() => {
    insightsService.getLayout().then((saved) => {
      if (saved?.order?.length) {
        setLayout(saved);
        writeLocal(storageKey, saved);
      }
    }).catch(() => undefined);
  }, [storageKey]);

  const persist = (next: DashboardLayout) => {
    setLayout(next);
    writeLocal(storageKey, next);
    insightsService.saveLayout(next).catch(() => toast.error('Could not save your layout to your account; it is saved on this device.'));
  };

  // Include any new cards that weren't in the saved order
  const ordered = useMemo(() => {
    const known = layout.order.filter((id) => cards.some((c) => c.id === id));
    const missing = cards.map((c) => c.id).filter((id) => !known.includes(id));
    return [...known, ...missing].map((id) => cards.find((c) => c.id === id)!).filter(Boolean);
  }, [layout.order, cards]);

  const move = (id: string, delta: number) => {
    const ids = ordered.map((c) => c.id);
    const from = ids.indexOf(id);
    const to = Math.max(0, Math.min(ids.length - 1, from + delta));
    if (from === to) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    persist({ ...layout, order: ids });
  };

  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = ordered.map((c) => c.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    persist({ ...layout, order: ids });
    setDragId(null);
  };

  const toggleHidden = (id: string) => {
    const hidden = layout.hidden.includes(id) ? layout.hidden.filter((h) => h !== id) : [...layout.hidden, id];
    persist({ ...layout, order: ordered.map((c) => c.id), hidden });
  };

  const reset = () => persist({ order: defaultOrder, hidden: [] });

  const visible = editing ? ordered : ordered.filter((c) => !layout.hidden.includes(c.id));

  return (
    <div>
      {editing && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-accent-300 bg-accent-50 px-4 py-3 text-sm text-accent-800">
          <span className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Drag cards to reorder, or use the arrows. Click the eye to hide or show a card.
          </span>
          <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
            <RotateCcw className="h-3.5 w-3.5" /> Reset layout
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {visible.map((card, index) => {
          const hidden = layout.hidden.includes(card.id);
          return (
            <section
              key={card.id}
              draggable={editing}
              onDragStart={() => setDragId(card.id)}
              onDragOver={(e) => editing && e.preventDefault()}
              onDrop={() => dropOn(card.id)}
              onDragEnd={() => setDragId(null)}
              className={`${spanClass[card.span || 1]} min-w-0 transition-all duration-300 ${
                card.bare && !editing ? '' : 'rounded-2xl border border-gray-100 bg-white p-5 shadow-soft hover:shadow-lift'
              } ${editing ? 'cursor-move ring-2 ring-transparent hover:ring-accent-200' : ''} ${hidden ? 'opacity-40' : ''} ${
                dragId === card.id ? 'scale-[0.98] opacity-60' : ''
              }`}
            >
              {(editing || !card.bare) && (
                <header className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {editing && <GripVertical className="h-4 w-4 shrink-0 text-gray-300" />}
                    {card.icon && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">{card.icon}</span>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-gray-900">{card.title}</h3>
                      {card.subtitle && <p className="truncate text-xs text-gray-500">{card.subtitle}</p>}
                    </div>
                  </div>
                  {editing ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => move(card.id, -1)} disabled={index === 0} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30" title="Move up">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => move(card.id, 1)} disabled={index === visible.length - 1} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30" title="Move down">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => toggleHidden(card.id)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title={hidden ? 'Show' : 'Hide'}>
                        {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ) : (
                    card.action
                  )}
                </header>
              )}
              <div className={editing ? 'pointer-events-none select-none' : ''}>{card.render()}</div>
            </section>
          );
        })}
      </div>

      {editing && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500">
          <Check className="h-3.5 w-3.5 text-success-500" /> {t('Changes are saved automatically')}
        </p>
      )}
    </div>
  );
}
