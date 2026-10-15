import { useEffect, useRef, useState } from 'react';
import { Bookmark, BookmarkPlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';

interface SavedFilter {
  id: number;
  name: string;
  filters: Record<string, string>;
}

interface SavedFiltersProps {
  /** Which table the filters belong to, e.g. "orders". */
  page: string;
  current: Record<string, string>;
  onApply: (filters: Record<string, string>) => void;
}

/** Save the current search + filters under a name, and re-apply them later. */
export default function SavedFilters({ page, current, onApply }: SavedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SavedFilter[]>([]);
  const [name, setName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const load = () =>
    api.get('/saved-filters', { params: { page, t: Date.now() } }).then((r) => setItems(r.data?.data || [])).catch(() => undefined);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const hasFilters = Object.values(current).some(Boolean);

  const save = async () => {
    if (!name.trim()) return;
    const res = await api.post('/saved-filters', { page, name: name.trim(), filters: current });
    if (res.data?.success) {
      toast.success(`Saved “${name.trim()}”`);
      setName('');
      load();
    } else {
      toast.error(res.data?.error?.message || 'Could not save the filter');
    }
  };

  const remove = async (id: number) => {
    await api.delete(`/saved-filters/${id}`);
    setItems((list) => list.filter((i) => i.id !== id));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
      >
        <Bookmark className="h-4 w-4" />
        Saved filters
        {items.length > 0 && <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-semibold">{items.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-gray-100 bg-white p-2 shadow-lift animate-pop-in">
          {items.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-gray-500">No saved filters yet. Set some filters, then save them here.</p>
          ) : (
            <ul className="mb-2 max-h-56 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="group flex items-center gap-1">
                  <button
                    onClick={() => {
                      onApply(item.filters);
                      setOpen(false);
                    }}
                    className="flex-1 truncate rounded-lg px-2.5 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {item.name}
                  </button>
                  <button onClick={() => remove(item.id)} className="rounded-lg p-1.5 text-gray-300 opacity-0 transition hover:bg-error-50 hover:text-error-600 group-hover:opacity-100" aria-label={`Delete ${item.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-1.5 border-t border-gray-100 pt-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder={hasFilters ? 'Name this filter…' : 'Set filters first'}
              disabled={!hasFilters}
              className="h-8 flex-1 rounded-lg border border-gray-200 px-2.5 text-xs outline-none focus:border-primary-300 disabled:opacity-50"
            />
            <button
              onClick={save}
              disabled={!hasFilters || !name.trim()}
              className="flex h-8 items-center gap-1 rounded-lg bg-primary-500 px-2.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              <BookmarkPlus className="h-3.5 w-3.5" /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
