import { MapPin, Package, CheckCircle, Clock, Navigation, Phone } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { mockOrders } from '@/data/mockData';
import { formatOrderNumber, formatDateTime } from '@/utils/formatters';

export default function DriverDashboard() {
  // Simulate driver's assigned orders
  const myOrders = mockOrders.filter(o => o.driverId === 4);
  const todayDeliveries = myOrders.filter(o => o.status !== 'delivered');
  const completedToday = myOrders.filter(o => o.status === 'delivered');
  const currentDelivery = myOrders.find(o => o.status === 'in_transit');
  const upcomingDeliveries = myOrders.filter(o => o.status === 'dispatched');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-gray-900">Driver Dashboard</h1>
        <p className="text-gray-600 mt-1">Your delivery schedule and route information</p>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-primary-100 mb-1">Today's Deliveries</p>
              <p className="text-4xl font-bold">{todayDeliveries.length}</p>
              <p className="text-sm text-primary-100 mt-2">Assigned to you</p>
            </div>
            <Package className="w-10 h-10 text-primary-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-accent-500 to-accent-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-accent-100 mb-1">In Progress</p>
              <p className="text-4xl font-bold">{currentDelivery ? 1 : 0}</p>
              <p className="text-sm text-accent-100 mt-2">Current delivery</p>
            </div>
            <MapPin className="w-10 h-10 text-accent-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-success-500 to-success-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-success-100 mb-1">Completed</p>
              <p className="text-4xl font-bold">{completedToday.length}</p>
              <p className="text-sm text-success-100 mt-2">Delivered today</p>
            </div>
            <CheckCircle className="w-10 h-10 text-success-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-warning-500 to-warning-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-warning-100 mb-1">Upcoming</p>
              <p className="text-4xl font-bold">{upcomingDeliveries.length}</p>
              <p className="text-sm text-warning-100 mt-2">Next deliveries</p>
            </div>
            <Clock className="w-10 h-10 text-warning-200" />
          </div>
        </Card>
      </div>

      {/* Current Delivery */}
      {currentDelivery && (
        <Card className="bg-gradient-to-br from-primary-50 to-accent-50 border-2 border-primary-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Badge variant="primary" className="mb-2">Current Delivery</Badge>
              <h3 className="font-heading text-2xl font-bold text-gray-900">{currentDelivery.customerName}</h3>
            </div>
            <code className="text-lg font-bold bg-white px-3 py-2 rounded text-primary-700">
              {formatOrderNumber(currentDelivery.id)}
            </code>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Delivery Address</p>
              <p className="font-medium text-gray-900">{currentDelivery.deliveryAddress}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Contact Number</p>
              <p className="font-medium text-gray-900">{currentDelivery.contactNumber}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Items to Deliver</p>
            <div className="space-y-2">
              {currentDelivery.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-gray-900">{item.itemName}</span>
                  <Badge variant="gray">{item.quantity} {item.unit}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="primary" size="lg" className="flex-1">
              <Navigation className="w-5 h-5 mr-2" />
              Navigate
            </Button>
            <Button variant="secondary" size="lg" className="flex-1">
              <Phone className="w-5 h-5 mr-2" />
              Call Customer
            </Button>
            <Button variant="success" size="lg" className="flex-1">
              <CheckCircle className="w-5 h-5 mr-2" />
              Mark Delivered
            </Button>
          </div>
        </Card>
      )}

      {/* Upcoming Deliveries */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-semibold text-gray-900">Upcoming Deliveries</h3>
          <Badge variant="warning">{upcomingDeliveries.length} Pending</Badge>
        </div>
        <div className="space-y-3">
          {upcomingDeliveries.map((order, index) => (
            <div key={order.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="font-medium bg-white px-2 py-1 rounded text-primary-700">
                        {formatOrderNumber(order.id)}
                      </code>
                      <Badge variant={order.priority === 'high' ? 'error' : order.priority === 'medium' ? 'warning' : 'gray'}>
                        {order.priority}
                      </Badge>
                    </div>
                    <p className="font-medium text-gray-900 mb-1">{order.customerName}</p>
                    <p className="text-sm text-gray-600 mb-2">{order.deliveryAddress}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {order.items.length} items
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {order.contactNumber}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Completed Deliveries */}
      {completedToday.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold text-gray-900">Completed Today</h3>
            <Badge variant="success">{completedToday.length} Delivered</Badge>
          </div>
          <div className="space-y-3">
            {completedToday.map((order) => (
              <div key={order.id} className="p-4 bg-success-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="w-5 h-5 text-success-600" />
                      <code className="font-medium bg-white px-2 py-1 rounded text-success-700">
                        {formatOrderNumber(order.id)}
                      </code>
                    </div>
                    <p className="font-medium text-gray-900">{order.customerName}</p>
                    <p className="text-sm text-gray-600">
                      Delivered at {order.deliveredAt ? formatDateTime(order.deliveredAt) : 'N/A'}
                    </p>
                  </div>
                  <Badge variant="success">Completed</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Performance Stats */}
      <Card>
        <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Your Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg">
            <p className="text-3xl font-bold text-gray-900">47</p>
            <p className="text-sm text-gray-600 mt-1">Deliveries This Week</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-success-50 to-success-100 rounded-lg">
            <p className="text-3xl font-bold text-gray-900">98%</p>
            <p className="text-sm text-gray-600 mt-1">On-Time Rate</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-accent-50 to-accent-100 rounded-lg">
            <p className="text-3xl font-bold text-gray-900">4.9/5</p>
            <p className="text-sm text-gray-600 mt-1">Customer Rating</p>
          </div>
        </div>
      </Card>
    </div>
  );
}