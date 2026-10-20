import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search } from 'lucide-react';
import api from '@/services/api';
import { formatDateTime } from '@/utils/formatters';

export default function InventoryMovementHistory({ itemId }: { itemId: number }) {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory-history', itemId, search],
    queryFn: async () => {
      const response = await api.get(`/inventory/${itemId}/history`, { params: { limit: 25, search: search || undefined } });
      if (response.data?.success === false) throw new Error(response.data?.error?.message || 'Could not load movements');
      return response.data?.data || [];
    },
    enabled: Number.isInteger(itemId) && itemId > 0,
  });

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-gray-900">Stock movement history</h3>
      </div>
      <label className="relative mb-3 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input aria-label="Search stock movements" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reason, order, or staff…" className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100" />
      </label>
      {isLoading ? <p className="py-4 text-sm text-gray-500">Loading movements…</p>
        : isError ? <p role="alert" className="py-4 text-sm text-error-700">Could not load stock movements. Try again.</p>
          : !data?.length ? <p className="py-4 text-sm text-gray-500">No recorded stock movements match this search.</p>
            : <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
              {data.map((movement: any) => (
                <li key={movement.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium text-gray-800">{String(movement.action).replaceAll('_', ' ')}</span>
                    <span className="block truncate text-xs text-gray-500">{movement.notes || 'Stock updated'}{movement.order?.orderNumber ? ` · ${movement.order.orderNumber}` : ''}</span>
                    <span className="text-xs text-gray-400">{movement.performedByUser?.name || 'System'} · {formatDateTime(movement.performedAt)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold text-gray-900">{movement.previousQuantity} → {movement.newQuantity}</span>
                    <span className="text-xs text-gray-500">{movement.quantity} {movement.quantity === 1 ? 'unit' : 'units'}</span>
                  </span>
                </li>
              ))}
            </ul>}
    </section>
  );
}
