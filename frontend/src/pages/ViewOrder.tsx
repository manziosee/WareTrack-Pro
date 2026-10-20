import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, User, MapPin, Clock, Truck, Copy, Loader2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { ordersService } from '@/services/ordersService';
import api from '@/services/api';
import { printInvoice } from '@/utils/invoice';
import { formatOrderNumber, formatDate } from '@/utils/formatters';

export default function ViewOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [repeating, setRepeating] = useState(false);
  const [communicationChannel, setCommunicationChannel] = useState<'CALL' | 'EMAIL' | 'NOTE'>('NOTE');
  const [communicationMessage, setCommunicationMessage] = useState('');
  const [sendingCommunication, setSendingCommunication] = useState(false);
  const queryClient = useQueryClient();
  const timeline = useQuery({
    queryKey: ['order-timeline', id],
    queryFn: async () => {
      const response = await api.get(`/orders/${id}/timeline`, { params: { t: Date.now() } });
      if (!response.data?.success) throw new Error(response.data?.error?.message || 'Could not load order timeline');
      return response.data.data as { at: string; type: string; title: string; detail?: string; actor?: string }[];
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (id) {
          const orderData = await ordersService.getOrderById(Number(id));
          if (!orderData || typeof orderData !== 'object' || Array.isArray(orderData)) {
            throw new Error('The order response was incomplete. Please refresh and try again.');
          }
          setOrder(orderData);
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
        setError(error instanceof Error ? error.message : 'Could not load this order.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'delivered': return 'success';
      case 'in_transit': return 'info';
      case 'dispatched': return 'warning';
      case 'pending': return 'gray';
      case 'cancelled': return 'error';
      default: return 'gray';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'gray';
      default: return 'gray';
    }
  };

  if (loading || !order) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">{loading ? 'Loading order…' : error || 'Order not found'}</p>
          <Button variant="secondary" onClick={() => navigate('/orders')} className="mt-4">
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  const status = String(order.status || 'PENDING').toLowerCase();
  const items = Array.isArray(order.items) ? order.items : [];

  const repeatOrder = async () => {
    if (repeating) return;
    setRepeating(true);
    try {
      const result = await ordersService.createOrder({
        accountId: order.accountId || undefined,
        customerName: order.customerName,
        customerEmail: order.customerEmail || undefined,
        customerPhone: order.contactNumber || undefined,
        contactNumber: order.contactNumber || undefined,
        deliveryAddress: order.deliveryAddress,
        deliveryInstructions: order.deliveryInstructions || undefined,
        priority: order.priority,
        orderType: order.orderType || 'Delivery',
        paymentMethod: order.paymentMethod,
        items: items.map((item: any) => ({
          itemId: item.itemId,
          quantity: item.packagingId ? item.packQuantity : item.quantity,
          packagingId: item.packagingId || undefined,
        })),
      });
      if (!result?.success) throw new Error(result?.error?.message || 'Could not repeat this order');
      toast.success(`New order ${result.data?.orderNumber || ''} created with current prices and stock checked.`);
      navigate(`/orders/${result.data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not repeat this order');
    } finally {
      setRepeating(false);
    }
  };

  const logCommunication = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!communicationMessage.trim() || sendingCommunication) return;
    setSendingCommunication(true);
    try {
      const response = await api.post(`/orders/${id}/communications`, { channel: communicationChannel, message: communicationMessage.trim() });
      if (!response.data?.success) throw new Error(response.data?.error?.message || 'Could not save communication');
      toast.success(communicationChannel === 'EMAIL' ? (response.data.data?.sent ? 'Customer email sent and logged' : 'Email attempt logged; mail service did not confirm sending') : 'Communication added to the order timeline');
      setCommunicationMessage('');
      await queryClient.invalidateQueries({ queryKey: ['order-timeline', id] });
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || e?.message || 'Could not save communication');
    } finally { setSendingCommunication(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/orders')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-heading text-3xl font-bold text-gray-900">
              Order {order.orderNumber || formatOrderNumber(order.id)}
            </h1>
            <p className="text-gray-600 mt-1">View order details and tracking information</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getStatusBadgeVariant(status)} size="lg">
            {status.replace('_', ' ').toUpperCase()}
          </Badge>
          <Badge variant={getPriorityBadgeVariant(order.priority)}>
            {order.priority ? `${order.priority.toUpperCase()} priority` : 'MEDIUM priority'}
          </Badge>
        </div>
      </div>

      <Card className="p-4">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Customer communication</h2>
        <p className="mb-3 text-xs text-gray-500">Log a call or note, or email the delivery update to {order.customerEmail || 'the customer'}.</p>
        <form onSubmit={logCommunication} className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {(['NOTE', 'CALL', 'EMAIL'] as const).map((channel) => <button key={channel} type="button" onClick={() => setCommunicationChannel(channel)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${communicationChannel === channel ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'bg-gray-100 text-gray-600'}`}>{channel === 'NOTE' ? 'Note' : channel === 'CALL' ? 'Call log' : 'Email update'}</button>)}
          </div>
          <textarea value={communicationMessage} onChange={(e) => setCommunicationMessage(e.target.value)} maxLength={2000} rows={2} required placeholder={communicationChannel === 'CALL' ? 'Who spoke, what was agreed, and any follow-up…' : communicationChannel === 'EMAIL' ? 'Write the delivery update for the customer…' : 'Add an internal communication note…'} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-300" />
          <div className="flex justify-end"><Button type="submit" size="sm" disabled={sendingCommunication || !communicationMessage.trim() || (communicationChannel === 'EMAIL' && !order.customerEmail)}>{sendingCommunication ? 'Saving…' : communicationChannel === 'EMAIL' ? 'Send email & log' : 'Add to timeline'}</Button></div>
        </form>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium text-gray-900">{order.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact</p>
                <p className="font-medium text-gray-900">{order.contactNumber}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Delivery Address</p>
                <p className="font-medium text-gray-900">{order.deliveryAddress}</p>
              </div>
            </div>
          </Card>

          {/* Order Items */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
            </div>
            <div className="space-y-3">
            {items.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.itemName || item.item?.name || item.name || 'Item'}</p>
                    <p className="text-sm text-gray-600">Code: {item.item?.code || item.code || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{item.quantity} {item.unit}</p>
                    <p className="text-sm text-gray-600">RWF {Number(item.totalPrice ?? item.unitPrice ?? item.price) ? Number(item.totalPrice ?? item.unitPrice ?? item.price).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Delivery Instructions */}
          {order.deliveryInstructions && (
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900">Delivery Instructions</h3>
              </div>
              <p className="text-gray-700">{order.deliveryInstructions}</p>
            </Card>
          )}
        </div>

        {/* Order Timeline & Status */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number</span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">{order.orderNumber || formatOrderNumber(order.id)}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span className="text-gray-900">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Scheduled</span>
                <span className="text-gray-900">
                  {order.scheduledDate ? formatDate(order.scheduledDate) : 'Not scheduled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Items</span>
                <span className="text-gray-900">{items.length} item{items.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          </Card>

          {/* Order Timeline */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Order Timeline</h3>
            </div>
            {timeline.isLoading ? <p className="text-sm text-gray-500">Loading order activity…</p> : timeline.isError ? <button onClick={() => void timeline.refetch()} className="text-sm text-error-600">Could not load the timeline. Retry.</button> : (
              <ol className="space-y-4">
                {timeline.data?.map((event, index) => <li key={`${event.type}-${event.at}-${index}`} className="relative flex items-start gap-3">
                  {index < (timeline.data?.length || 0) - 1 && <span className="absolute left-[3px] top-3 h-full w-px bg-gray-200" />}
                  <span className={`relative mt-1.5 h-2 w-2 shrink-0 rounded-full ${event.type === 'PAYMENT' || event.type === 'CASH' ? 'bg-success-500' : event.type === 'STOCK' || event.type === 'ALLOCATION' ? 'bg-accent-500' : event.type === 'RETURN' ? 'bg-warning-500' : 'bg-primary-500'}`} />
                  <div className="min-w-0"><p className="text-sm font-medium text-gray-900">{event.title}</p>{event.detail && <p className="mt-0.5 text-xs text-gray-500">{event.detail}</p>}<p className="mt-0.5 text-[11px] text-gray-400">{new Date(event.at).toLocaleString()}{event.actor ? ` · ${event.actor}` : ''}</p></div>
                </li>)}
                {!timeline.data?.length && <li className="text-sm text-gray-500">No recorded activity yet.</li>}
              </ol>
            )}
          </Card>

          {/* Actions */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              <Button variant="success" size="lg" className="min-h-[52px] w-full" disabled={repeating || items.length === 0} onClick={() => void repeatOrder()}>
                {repeating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                {repeating ? 'Checking stock…' : 'Repeat order'}
              </Button>
              <p className="text-xs text-gray-500">Creates a new pending order using today’s item prices. Stock is checked before anything is saved.</p>
              <Button variant="primary" size="lg" className="min-h-[52px] w-full" onClick={() => navigate(`/orders/${order.id}/edit`)}>
                Edit Order
              </Button>
              {status === 'pending' && (
                <Button variant="secondary" className="w-full">
                  <Truck className="w-4 h-4 mr-2" />
                  Assign to Dispatch
                </Button>
              )}
              <Button variant="outline" size="lg" className="min-h-[52px] w-full" onClick={() => void printInvoice(Number(order.id))}>
                <Printer className="mr-2 h-5 w-5" /> Print order PDF
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
