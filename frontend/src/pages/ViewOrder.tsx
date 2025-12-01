import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, User, MapPin, Clock, Truck } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { ordersService } from '@/services/ordersService';
import { formatOrderNumber, formatDate } from '@/utils/formatters';

export default function ViewOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (id) {
          const orderData = await ordersService.getOrderById(Number(id));
          setOrder(orderData);
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
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

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Order not found</p>
          <Button variant="secondary" onClick={() => navigate('/orders')} className="mt-4">
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

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
              Order {formatOrderNumber(order.id)}
            </h1>
            <p className="text-gray-600 mt-1">View order details and tracking information</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getStatusBadgeVariant(order.status)} size="lg">
            {order.status.replace('_', ' ')}
          </Badge>
          <Badge variant={getPriorityBadgeVariant(order.priority)}>
            {order.priority} priority
          </Badge>
        </div>
      </div>

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
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">Code: {item.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{item.quantity} {item.unit}</p>
                    <p className="text-sm text-gray-600">RWF {item.price?.toLocaleString() || 'N/A'}</p>
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
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">{formatOrderNumber(order.id)}</code>
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
                <span className="text-gray-900">{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          </Card>

          {/* Order Timeline */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Order Timeline</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-success-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Order Created</p>
                  <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
              </div>
              {order.status !== 'pending' && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-warning-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Order Dispatched</p>
                    <p className="text-xs text-gray-500">Assigned to driver</p>
                  </div>
                </div>
              )}
              {(order.status === 'in_transit' || order.status === 'delivered') && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-accent-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">In Transit</p>
                    <p className="text-xs text-gray-500">Out for delivery</p>
                  </div>
                </div>
              )}
              {order.status === 'delivered' && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-success-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Delivered</p>
                    <p className="text-xs text-gray-500">Successfully delivered</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              <Button variant="primary" className="w-full" onClick={() => navigate(`/orders/${order.id}/edit`)}>
                Edit Order
              </Button>
              {order.status === 'pending' && (
                <Button variant="secondary" className="w-full">
                  <Truck className="w-4 h-4 mr-2" />
                  Assign to Dispatch
                </Button>
              )}
              <Button variant="outline" className="w-full">
                Print Order
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}