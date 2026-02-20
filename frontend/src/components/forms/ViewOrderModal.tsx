import { Package, User, MapPin, Clock } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { formatOrderNumber, formatDate } from '@/utils/formatters';

interface ViewOrderModalProps {
  order: any;
}

export default function ViewOrderModal({ order }: ViewOrderModalProps) {
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

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Order {formatOrderNumber(order.id)}
          </h3>
          <p className="text-sm text-gray-600">Created {formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(order.status?.toLowerCase() || 'pending')}>
            {(order.status || 'PENDING').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </Badge>
          <Badge variant={getPriorityBadgeVariant(order.priority?.toLowerCase() || 'medium')} size="sm">
            {(order.priority || 'MEDIUM').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-primary-600" />
          <h4 className="font-medium text-gray-900">Customer Information</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Name:</span>
            <span className="ml-2 font-medium">{order.customerName}</span>
          </div>
          <div>
            <span className="text-gray-600">Contact:</span>
            <span className="ml-2 font-medium">{order.contactNumber}</span>
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-600">Address:</span>
            <span className="ml-2 font-medium">{order.deliveryAddress}</span>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-primary-600" />
          <h4 className="font-medium text-gray-900">Order Items</h4>
        </div>
        <div className="space-y-2">
          {order.items && order.items.length > 0 ? (
            order.items.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-gray-900">{item.itemName || item.name || 'Item'}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity} {item.unit || 'pcs'}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">RWF {Number(item.unitPrice || item.price || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total: RWF {Number(item.totalPrice || (item.unitPrice * item.quantity) || 0).toLocaleString()}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded">No items in this order</p>
          )}
        </div>
      </div>

      {/* Order Timeline */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-primary-600" />
          <h4 className="font-medium text-gray-900">Order Timeline</h4>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-success-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium">Order Created</p>
              <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
            </div>
          </div>
          {order.status !== 'pending' && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-warning-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Order Dispatched</p>
                <p className="text-xs text-gray-500">Assigned to driver</p>
              </div>
            </div>
          )}
          {(order.status === 'in_transit' || order.status === 'delivered') && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-accent-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">In Transit</p>
                <p className="text-xs text-gray-500">Out for delivery</p>
              </div>
            </div>
          )}
          {order.status === 'delivered' && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-success-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Delivered</p>
                <p className="text-xs text-gray-500">Successfully delivered</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Instructions */}
      {order.deliveryInstructions && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary-600" />
            <h4 className="font-medium text-gray-900">Delivery Instructions</h4>
          </div>
          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{order.deliveryInstructions}</p>
        </div>
      )}
    </div>
  );
}