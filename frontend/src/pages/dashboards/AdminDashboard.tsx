import { Package, Truck, Clock, CheckCircle, AlertTriangle, Users as UsersIcon, TrendingUp } from 'lucide-react';
import Card from '@/components/ui/Card';
import { mockDashboardStats, mockDeliveryTrends, mockOrders, mockInventory, mockUsers } from '@/data/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Badge from '@/components/ui/Badge';
import { formatOrderNumber } from '@/utils/formatters';

export default function AdminDashboard() {
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
    { label: 'Active Users', value: mockUsers.filter(u => u.status === 'active').length, icon: UsersIcon, color: 'bg-primary-600', change: '0' },
  ];

  const userRoleData = [
    { name: 'Admin', value: mockUsers.filter(u => u.role === 'admin').length, color: '#EF4444' },
    { name: 'Warehouse', value: mockUsers.filter(u => u.role === 'warehouse_staff').length, color: '#4682B4' },
    { name: 'Dispatch', value: mockUsers.filter(u => u.role === 'dispatch_officer').length, color: '#F59E0B' },
    { name: 'Driver', value: mockUsers.filter(u => u.role === 'driver').length, color: '#10B981' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Complete overview of all operations and system metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Delivery Trends */}
        <Card className="lg:col-span-2">
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

        {/* User Distribution */}
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Users by Role</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={userRoleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {userRoleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
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

      {/* System Performance */}
      <Card>
        <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">System Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg">
            <TrendingUp className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">94%</p>
            <p className="text-sm text-gray-600 mt-1">On-Time Delivery</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-success-50 to-success-100 rounded-lg">
            <CheckCircle className="w-8 h-8 text-success-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">98%</p>
            <p className="text-sm text-gray-600 mt-1">Order Accuracy</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-accent-50 to-accent-100 rounded-lg">
            <Truck className="w-8 h-8 text-accent-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">78%</p>
            <p className="text-sm text-gray-600 mt-1">Fleet Utilization</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-warning-50 to-warning-100 rounded-lg">
            <UsersIcon className="w-8 h-8 text-warning-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">4.8/5</p>
            <p className="text-sm text-gray-600 mt-1">Customer Rating</p>
          </div>
        </div>
      </Card>
    </div>
  );
}