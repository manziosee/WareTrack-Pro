import { Package, User, MapPin, Clock, Receipt, Phone, ShoppingCart } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { DetailHero, DetailSection, DetailField, DetailGrid, DetailStat } from '@/components/ui/Detail';
import { formatOrderNumber, formatDate } from '@/utils/formatters';

interface ViewOrderModalProps {
  order: any;
}

const STAGES = ['pending', 'dispatched', 'in_transit', 'delivered'] as const;

const STAGE_LABELS: Record<string, { title: string; hint: string }> = {
  pending: { title: 'Order Created', hint: 'Waiting to be dispatched' },
  dispatched: { title: 'Dispatched', hint: 'Assigned to a driver' },
  in_transit: { title: 'In Transit', hint: 'Out for delivery' },
  delivered: { title: 'Delivered', hint: 'Successfully delivered' },
};

export default function ViewOrderModal({ order }: ViewOrderModalProps) {
  const status = (order.status || 'PENDING').toLowerCase();
  const priority = (order.priority || 'MEDIUM').toLowerCase();

  const getStatusBadgeVariant = (value: string) => {
    switch (value) {
      case 'delivered': return 'success';
      case 'in_transit': return 'info';
      case 'dispatched': return 'warning';
      case 'cancelled': return 'error';
      default: return 'gray';
    }
  };

  const getPriorityBadgeVariant = (value: string) => {
    switch (value) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'gray';
    }
  };

  const items: any[] = order.items || [];
  const itemTotal = (item: any) => Number(item.totalPrice || (item.unitPrice * item.quantity) || 0);
  const orderTotal = Number(order.totalAmount) || items.reduce((sum, item) => sum + itemTotal(item), 0);
  const unitCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const currentStage = status === 'cancelled' ? -1 : STAGES.indexOf(status as typeof STAGES[number]);

  return (
    <div className="space-y-5">
      <DetailHero
        avatar={<Receipt className="w-6 h-6" />}
        title={`Order ${formatOrderNumber(order.id)}`}
        subtitle={`Created ${formatDate(order.createdAt)}`}
        badges={
          <>
            <Badge variant={getStatusBadgeVariant(status)}>
              {status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </Badge>
            <Badge variant={getPriorityBadgeVariant(priority)} size="sm">
              {priority.toUpperCase()} PRIORITY
            </Badge>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DetailStat label="Order Total" value={`RWF ${orderTotal.toLocaleString()}`} icon={<Receipt className="w-4 h-4" />} />
        <DetailStat label="Line Items" value={items.length} icon={<ShoppingCart className="w-4 h-4" />} tone="accent" />
        <DetailStat label="Units" value={unitCount.toLocaleString()} icon={<Package className="w-4 h-4" />} tone="success" />
      </div>

      <DetailSection title="Customer" icon={<User className="w-4 h-4" />}>
        <DetailGrid>
          <DetailField label="Name">{order.customerName || '—'}</DetailField>
          <DetailField label="Contact">
            {order.contactNumber ? (
              <a href={`tel:${order.contactNumber}`} className="inline-flex items-center gap-1.5 text-primary-600 hover:underline">
                <Phone className="w-3.5 h-3.5" />
                {order.contactNumber}
              </a>
            ) : '—'}
          </DetailField>
          <DetailField label="Delivery Address" className="sm:col-span-2">
            <span className="inline-flex items-start gap-1.5">
              <MapPin className="mt-0.5 w-3.5 h-3.5 shrink-0 text-accent-500" />
              {order.deliveryAddress || '—'}
            </span>
          </DetailField>
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Items" icon={<Package className="w-4 h-4" />}>
        {items.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Item</th>
                  <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-4 py-2.5 text-right font-medium">Unit Price</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-primary-50/40">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.itemName || item.name || 'Item'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{item.quantity} {item.unit || 'pcs'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">RWF {Number(item.unitPrice || item.price || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">RWF {itemTotal(item).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary-50/60">
                  <td colSpan={3} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-primary-700">Grand Total</td>
                  <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-primary-700">RWF {orderTotal.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="rounded-xl bg-white p-4 text-center text-sm text-gray-500">No items in this order</p>
        )}
      </DetailSection>

      <DetailSection title="Progress" icon={<Clock className="w-4 h-4" />}>
        {status === 'cancelled' ? (
          <div className="flex items-center gap-3 rounded-xl bg-error-50 p-4 text-sm text-error-700">
            <span className="h-2.5 w-2.5 rounded-full bg-error-500" />
            This order was cancelled.
          </div>
        ) : (
          <ol className="relative grid grid-cols-1 gap-4 sm:grid-cols-4">
            {STAGES.map((stage, index) => {
              const done = index <= currentStage;
              const current = index === currentStage;
              return (
                <li key={stage} className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all ${
                      done ? 'bg-primary-500 text-white shadow-glow' : 'bg-white text-gray-400 ring-1 ring-gray-200'
                    } ${current ? 'ring-4 ring-primary-100' : ''}`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${done ? 'text-gray-900' : 'text-gray-400'}`}>{STAGE_LABELS[stage].title}</p>
                    <p className="text-xs text-gray-500">
                      {stage === 'pending' ? formatDate(order.createdAt) : STAGE_LABELS[stage].hint}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </DetailSection>

      {order.deliveryInstructions && (
        <DetailSection title="Delivery Instructions" icon={<MapPin className="w-4 h-4" />}>
          <p className="rounded-xl border-l-4 border-accent-500 bg-white p-4 text-sm text-gray-700">{order.deliveryInstructions}</p>
        </DetailSection>
      )}
    </div>
  );
}
