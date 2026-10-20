import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import EditOrderForm from '@/components/forms/EditOrderForm';
import { ordersService } from '@/services/ordersService';
import { formatOrderNumber } from '@/utils/formatters';

export default function EditOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    ordersService.getOrderById(Number(id))
      .then((data) => { if (active) setOrder(data); })
      .catch((e: any) => { if (active) setError(e?.response?.data?.error?.message || e?.message || 'Could not load this order.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const save = async (data: any) => {
    setSaving(true);
    try {
      const items = (data.items || []).map((item: any) => ({ itemId: Number(item.inventoryId), quantity: Number(item.quantity), unit: item.unit, unitPrice: Number(item.price) }));
      const originalItems = (order.items || []).map((item: any) => ({ itemId: Number(item.itemId), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }));
      const changedItems = JSON.stringify(items.map(({ itemId, quantity, unitPrice }: any) => ({ itemId, quantity, unitPrice }))) !== JSON.stringify(originalItems);
      const payload: any = {
        customerName: data.customerName,
        customerEmail: data.customerEmail || order.customerEmail || undefined,
        contactNumber: data.contactNumber,
        deliveryAddress: data.deliveryAddress,
        priority: String(data.priority).toUpperCase(),
        scheduledDate: data.scheduledDate || undefined,
        deliveryInstructions: data.deliveryInstructions || '',
        orderType: data.orderType,
        paymentMethod: data.paymentMethod,
      };
      if (changedItems) payload.items = items;
      const result = await ordersService.updateOrder(Number(id), payload);
      if (result?.success === false) throw new Error(result?.error?.message || 'Could not update this order');
      toast.success('Order updated');
      navigate(`/orders/${id}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || e?.message || 'Could not update this order');
      throw e;
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title={order ? `Edit order ${order.orderNumber || formatOrderNumber(order.id)}` : 'Edit order'} subtitle="Your existing customer and item details are loaded below. Changes are saved to the order." breadcrumbs={[{ label: 'Operations' }, { label: 'Orders' }]} icon={<ShoppingCart className="h-5 w-5" />} actions={<Button variant="secondary" size="sm" onClick={() => navigate(order ? `/orders/${id}` : '/orders')}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>} />
      <Card className="p-5">
        {loading ? <div className="animate-pulse space-y-3"><div className="h-10 rounded-lg bg-gray-100" /><div className="h-10 rounded-lg bg-gray-100" /><div className="h-28 rounded-lg bg-gray-100" /></div> : error ? <div className="py-8 text-center"><p className="text-sm text-error-700">{error}</p><Button className="mt-4" variant="secondary" onClick={() => navigate('/orders')}>Return to orders</Button></div> : order ? <EditOrderForm order={order} saving={saving} onClose={() => navigate(`/orders/${id}`)} onSave={save} /> : <p className="py-8 text-center text-sm text-gray-500">Order not found.</p>}
      </Card>
    </div>
  );
}
