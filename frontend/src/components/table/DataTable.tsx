import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowUp, ArrowDown, ArrowUpDown, Columns, AlignJustify, StretchHorizontal, Search, X, ChevronLeft, ChevronRight, Check,
} from 'lucide-react';
import { SkeletonTable } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';

export interface Column<T> {
  id: string;
  header: string;
  /** Value used for sorting and search. */
  accessor?: (row: T) => string | number | Date | null | undefined;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  /** Hidden until the user turns it on. */
  defaultHidden?: boolean;
  /** Can't be hidden (e.g. the main name column). */
  required?: boolean;
  className?: string;
}

type Density = 'compact' | 'comfortable';

interface DataTableProps<T> {
  /** Used to remember column choices, density and page size per table. */
  storageKey: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  /** Buttons shown when hovering a row. */
  rowActions?: (row: T) => ReactNode;
  /** Actions for the selected rows; receives the rows and a function to clear the selection. */
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  /** Filter controls shown next to the search box. */
  filters?: ReactNode;
  /** Buttons on the right of the toolbar (export, saved filters…). */
  toolbarRight?: ReactNode;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  initialSort?: { id: string; dir: 'asc' | 'desc' };
  empty?: ReactNode;
  /** Highlight a row, e.g. the one open in a side panel. */
  activeKey?: string | number | null;
}

function readPrefs(key: string) {
  try {
    return JSON.parse(localStorage.getItem(`waretrack-table-${key}`) || '{}');
  } catch {
    return {};
  }
}

function writePrefs(key: string, prefs: Record<string, unknown>) {
  try {
    localStorage.setItem(`waretrack-table-${key}`, JSON.stringify(prefs));
  } catch {
    // Ignore storage failures
  }
}

const compare = (a: unknown, b: unknown) => {
  if (a === b) return 0;
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;
  if (a instanceof Date || b instanceof Date) return new Date(a as any).getTime() - new Date(b as any).getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).trim() !== '' && String(b).trim() !== '') return na - nb;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * Feature-rich table: sticky header, sorting, column show/hide, density,
 * multi-select with bulk actions, hover actions and client-side paging.
 */
export default function DataTable<T>({
  storageKey, rows, columns, rowKey, loading, onRowClick, rowActions, bulkActions, filters, toolbarRight,
  search: controlledSearch, onSearchChange, searchPlaceholder = 'Search…', initialSort, empty, activeKey,
}: DataTableProps<T>) {
  const saved = useMemo(() => readPrefs(storageKey), [storageKey]);
  const [hidden, setHidden] = useState<string[]>(saved.hidden ?? columns.filter((c) => c.defaultHidden).map((c) => c.id));
  const [density, setDensity] = useState<Density>(saved.density ?? 'comfortable');
  const [pageSize, setPageSize] = useState<number>(saved.pageSize ?? 25);
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(saved.sort ?? initialSort ?? null);
  const [internalSearch, setInternalSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [showColumns, setShowColumns] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);

  const search = controlledSearch ?? internalSearch;
  const setSearch = onSearchChange ?? setInternalSearch;

  useEffect(() => writePrefs(storageKey, { hidden, density, pageSize, sort }), [storageKey, hidden, density, pageSize, sort]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) setShowColumns(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const visibleColumns = columns.filter((c) => !hidden.includes(c.id));

  const processed = useMemo(() => {
    let list = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((row) =>
        columns.some((c) => {
          const v = c.accessor?.(row);
          return v !== null && v !== undefined && String(v instanceof Date ? v.toLocaleDateString() : v).toLowerCase().includes(q);
        })
      );
    }
    if (sort) {
      const col = columns.find((c) => c.id === sort.id);
      if (col?.accessor) {
        list = [...list].sort((a, b) => compare(col.accessor!(a), col.accessor!(b)) * (sort.dir === 'asc' ? 1 : -1));
      }
    }
    return list;
  }, [rows, columns, search, sort]);

  useEffect(() => setPage(1), [search, rows.length, pageSize]);

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageRows = processed.slice((current - 1) * pageSize, current * pageSize);

  const selectedRows = rows.filter((r) => selected.has(rowKey(r)));
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(rowKey(r)));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allOnPageSelected) pageRows.forEach((r) => next.delete(rowKey(r)));
    else pageRows.forEach((r) => next.add(rowKey(r)));
    setSelected(next);
  };
  const toggleOne = (key: string | number) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };
  const clearSelection = () => setSelected(new Set());

  // Drop selections for rows that no longer exist (e.g. after delete)
  useEffect(() => {
    setSelected((prev) => {
      const keys = new Set(rows.map(rowKey));
      const next = new Set([...prev].filter((k) => keys.has(k)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const toggleSort = (col: Column<T>) => {
    if (!col.sortable && !col.accessor) return;
    setSort((s) => (s?.id !== col.id ? { id: col.id, dir: 'asc' } : s.dir === 'asc' ? { id: col.id, dir: 'desc' } : null));
  };

  const cellPad = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3.5';
  const selectable = Boolean(bulkActions);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-gray-100 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm outline-none transition focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-700" aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {filters}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbarRight}
          <button
            onClick={() => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact'))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
            title={density === 'compact' ? 'Comfortable rows' : 'Compact rows'}
          >
            {density === 'compact' ? <StretchHorizontal className="h-4 w-4" /> : <AlignJustify className="h-4 w-4" />}
          </button>
          <div className="relative" ref={columnsRef}>
            <button
              onClick={() => setShowColumns((v) => !v)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              <Columns className="h-4 w-4" /> Columns
            </button>
            {showColumns && (
              <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-lift animate-pop-in">
                <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Show columns</p>
                {columns.map((c) => {
                  const on = !hidden.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      disabled={c.required}
                      onClick={() => setHidden((h) => (on ? [...h, c.id] : h.filter((x) => x !== c.id)))}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {c.header || c.id}
                      <span className={`flex h-4 w-4 items-center justify-center rounded border ${on ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-300'}`}>
                        {on && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectable && selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-accent-100 bg-accent-50 px-4 py-2 text-sm animate-fade-in">
          <span className="font-semibold text-accent-800">{selectedRows.length} selected</span>
          <div className="flex flex-wrap items-center gap-2">{bulkActions!(selectedRows, clearSelection)}</div>
          <button onClick={clearSelection} className="ml-auto text-xs font-medium text-accent-700 hover:underline">Clear selection</button>
        </div>
      )}

      {loading ? (
        <div className="p-3"><SkeletonTable rows={8} columns={Math.min(visibleColumns.length, 6)} /></div>
      ) : processed.length === 0 ? (
        empty || <EmptyState variant={search ? 'search' : 'empty'} title={search ? `No results for “${search}”` : 'Nothing here yet'} description={search ? 'Try a different search or clear the filters.' : undefined} />
      ) : (
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur">
              <tr className="border-b border-gray-100">
                {selectable && (
                  <th className="w-10 px-3 py-2.5">
                    <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-500 focus:ring-primary-400" aria-label="Select all on this page" />
                  </th>
                )}
                {visibleColumns.map((c) => {
                  const sortable = c.sortable ?? Boolean(c.accessor);
                  const active = sort?.id === c.id;
                  return (
                    <th
                      key={c.id}
                      onClick={() => sortable && toggleSort(c)}
                      className={`whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 ${sortable ? 'cursor-pointer select-none hover:text-gray-800' : ''} ${
                        c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      <span className={`inline-flex items-center gap-1 ${c.align === 'right' ? 'flex-row-reverse' : ''}`}>
                        {c.header}
                        {sortable &&
                          (active ? (
                            sort!.dir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary-500" /> : <ArrowDown className="h-3 w-3 text-primary-500" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                          ))}
                      </span>
                    </th>
                  );
                })}
                {rowActions && <th className="w-px px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageRows.map((row) => {
                const key = rowKey(row);
                const isSelected = selected.has(key);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={`group transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${
                      key === activeKey ? 'bg-primary-50/70' : isSelected ? 'bg-accent-50/50' : 'hover:bg-gray-50/80'
                    }`}
                  >
                    {selectable && (
                      <td className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(key)} className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-500 focus:ring-primary-400" aria-label="Select row" />
                      </td>
                    )}
                    {visibleColumns.map((c) => (
                      <td
                        key={c.id}
                        className={`${cellPad} ${c.align === 'right' ? 'text-right tabular-nums' : c.align === 'center' ? 'text-center' : ''} ${c.className || ''}`}
                      >
                        {c.cell ? c.cell(row) : String(c.accessor?.(row) ?? '—')}
                      </td>
                    ))}
                    {rowActions && (
                      <td className={`${cellPad} w-px whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 opacity-60 transition-opacity group-hover:opacity-100">{rowActions(row)}</div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer / paging */}
      {!loading && processed.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-2.5 text-xs text-gray-500 sm:flex-row">
          <span>
            Showing <b className="text-gray-800">{(current - 1) * pageSize + 1}–{Math.min(current * pageSize, processed.length)}</b> of{' '}
            <b className="text-gray-800">{processed.length}</b>
            {processed.length !== rows.length && <> (filtered from {rows.length})</>}
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5">
              Rows
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-7 rounded-lg border border-gray-200 bg-white px-1.5 text-xs"
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={current === 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40" aria-label="Previous page">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[4.5rem] text-center">Page {current} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={current === totalPages} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40" aria-label="Next page">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
