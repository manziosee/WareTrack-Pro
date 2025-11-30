import { Package, Truck, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import { mockDashboardStats, mockDeliveryTrends, mockOrders, mockInventory } from '@/data/mockData';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Badge from '@/components/ui/Badge';
import { formatOrderNumber } from '@/utils/formatters';

export default function Dashboard() {
  const stats = mockDashboardStats;
  const trends = mockDeliveryTrends;
  const recentOrders = mockOrders.slice(0, 5);
  const lowStockItems = mockInventory.filter(item => item.quantity < item.minQuantity);

  const statCards = [
    { label: 'Total Inventory', value: stats.totalInventory, icon: Package, color: 'bg-primary-500', change: '+12%' },
    { label: 'Deliveries Today', value: stats.deliveriesToday, icon: CheckCircle, color: 'bg-success-500', change: '+5%' },
    { label: 'Pending Dispatches', value: stats.pendingDispatches, icon: Clock, color: 'bg-warning-500', change: '-2%' },
    { label: 'In Transit', value: stats.inTransit, icon: Truck, color: 'bg-accent-500', change: '+8%' },
    { label: 'Low Stock Alerts', value: stats.lowStockItems, icon: AlertTriangle, color: 'bg-error-500', change: '+1' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-success-600 mt-2">{stat.change} from last week</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Trends */}
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Delivery Trends (7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="delivered" stroke="#10B981" strokeWidth={2} name="Delivered" />
              <Line type="monotone" dataKey="inTransit" stroke="#FF8C42" strokeWidth={2} name="In Transit" />
              <Line type="monotone" dataKey="pending" stroke="#F59E0B" strokeWidth={2} name="Pending" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Inventory Status */}
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Inventory by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { category: 'Electronics', count: 113 },
              { category: 'Furniture', count: 37 },
              { category: 'Office Supplies', count: 5 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#4682B4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold text-gray-900">Recent Orders</h3>
            <a href="/orders" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All</a>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{formatOrderNumber(order.id)}</p>
                  <p className="text-sm text-gray-600">{order.customerName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={
                    order.status === 'delivered' ? 'success' :
                    order.status === 'in_transit' ? 'info' :
                    order.status === 'dispatched' ? 'warning' : 'gray'
                  }>
                    {order.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant={order.priority === 'high' ? 'error' : order.priority === 'medium' ? 'warning' : 'gray'} size="sm">
                    {order.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
            <a href="/inventory" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All</a>
          </div>
          <div className="space-y-3">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">{item.code} • {item.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-error-600">{item.quantity} {item.unit}</p>
                  <p className="text-xs text-gray-500">Min: {item.minQuantity}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}