import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, X, Pencil, Trash2, Tags } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

export interface InventoryCategory {
  id: number | null;
  name: string;
  description?: string | null;
  items: number;
  units: number;
}

const KEY = ['inventory-categories'];

/** All categories: managed ones plus any name already used by an item. */
export function useCategories() {
  return useQuery<InventoryCategory[]>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.get('/inventory/categories', { params: { t: Date.now() } });
      const list = res.data?.data;
      return Array.isArray(list) ? list.map((c: any) => (typeof c === 'string' ? { id: null, name: c, items: 0, units: 0 } : c)) : [];
    },
    staleTime: 30_000,
  });
}

async function call(method: 'post' | 'put' | 'delete', body: any) {
  const res = method === 'delete'
    ? await api.delete('/inventory/categories', { params: body })
    : await api[method]('/inventory/categories', body);
  if (res.data?.success === false) throw new Error(res.data?.error?.message || 'Something went wrong');
  return res.data?.data;
}

const fieldClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500';

/**
 * Category picker for item forms. Lists every category, always keeps the
 * item's current one (even if it's not in the list yet), and can add a new one.
 */
export function CategorySelect({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  const { data = [], isLoading } = useCategories();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const names = data.map((c) => c.name);
  if (value && !names.some((n) => n.toLowerCase() === value.toLowerCase())) names.push(value);
  names.sort((a, b) => a.localeCompare(b));

  const add = async () => {
    const clean = name.trim();
    if (clean.length < 2) return toast.error('Category name must be at least 2 characters');
    setSaving(true);
    try {
      const created = await call('post', { name: clean });
      await queryClient.invalidateQueries({ queryKey: KEY });
      onChange(created?.name || clean);
      setAdding(false);
      setName('');
      toast.success(`Category "${created?.name || clean}" added`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (adding) {
    return (
      <div className="flex gap-1.5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } if (e.key === 'Escape') setAdding(false); }}
          placeholder="New category name"
          className={fieldClass}
        />
        <button type="button" onClick={add} disabled={saving} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50" title="Add"><Check className="h-4 w-4" /></button>
        <button type="button" onClick={() => setAdding(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50" title="Cancel"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <select
        value={value}
        onChange={(e) => (e.target.value === '__new' ? setAdding(true) : onChange(e.target.value))}
        className={fieldClass}
        required={required}
      >
        <option value="">{isLoading ? 'Loading categories…' : 'Select category'}</option>
        {names.map((n) => <option key={n} value={n}>{n}</option>)}
        <option value="__new">+ New category…</option>
      </select>
      <button type="button" onClick={() => setAdding(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50" title="New category"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

/** Manage categories: add, rename (also renames items) and delete (moving items elsewhere). */
export function CategoryManager({ onChanged }: { onChanged?: () => void }) {
  const { data = [], isLoading } = useCategories();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [rename, setRename] = useState('');
  const [deleting, setDeleting] = useState<InventoryCategory | null>(null);
  const [moveTo, setMoveTo] = useState('');
  const [busy, setBusy] = useState(false);

  const done = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: KEY });
    onChanged?.();
    toast.success(message);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (error: any) { toast.error(error.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); if (newName.trim()) run(async () => { await call('post', { name: newName.trim() }); setNewName(''); await done('Category added'); }); }}
        className="flex gap-2"
      >
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category, e.g. Beverages" className={fieldClass} />
        <Button size="sm" type="submit" disabled={busy || newName.trim().length < 2}><Plus className="mr-1 h-4 w-4" /> Add</Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : !data.length ? (
        <EmptyState compact title="No categories yet" description="Add your first category above." />
      ) : (
        <ul className="max-h-[50vh] divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100">
          {data.map((c) => (
            <li key={c.name} className="px-3 py-2.5">
              {editing === c.name ? (
                <div className="flex gap-1.5">
                  <input autoFocus value={rename} onChange={(e) => setRename(e.target.value)} className={fieldClass} />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(async () => { const r = await call('put', { from: c.name, to: rename.trim() }); setEditing(null); await done(`Renamed${r?.itemsUpdated ? ` (${r.itemsUpdated} items updated)` : ''}`); })}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-white hover:bg-primary-600"
                    title="Save"
                  ><Check className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setEditing(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500" title="Cancel"><X className="h-4 w-4" /></button>
                </div>
              ) : deleting?.name === c.name ? (
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">
                    Delete <b>{c.name}</b>?{c.items ? ` Its ${c.items} item${c.items === 1 ? '' : 's'} will move to:` : ''}
                  </p>
                  <div className="flex gap-1.5">
                    {c.items > 0 && (
                      <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className={fieldClass}>
                        <option value="">Choose a category</option>
                        {data.filter((o) => o.name !== c.name).map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
                      </select>
                    )}
                    <button
                      type="button"
                      disabled={busy || (c.items > 0 && !moveTo)}
                      onClick={() => run(async () => { await call('delete', { name: c.name, moveTo }); setDeleting(null); setMoveTo(''); await done('Category deleted'); })}
                      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-error-500 px-3 text-xs font-semibold text-white hover:bg-error-600 disabled:opacity-50"
                    ><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                    <button type="button" onClick={() => setDeleting(null)} className="h-9 shrink-0 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-900">{c.name}</span>
                    <span className="text-xs text-gray-500">{c.items} item{c.items === 1 ? '' : 's'} · {Number(c.units || 0).toLocaleString()} units</span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => { setEditing(c.name); setRename(c.name); setDeleting(null); }} className="action-btn action-btn-edit" title="Rename"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => { setDeleting(c); setEditing(null); setMoveTo(''); }} className="action-btn action-btn-delete" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="flex items-center gap-1.5 text-xs text-gray-500"><Tags className="h-3.5 w-3.5" /> Renaming a category also renames it on all its items.</p>
    </div>
  );
}
