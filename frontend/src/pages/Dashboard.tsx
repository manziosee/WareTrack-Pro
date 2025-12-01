import { Package, Truck, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import { mockDashboardStats, mockDeliveryTrends, mockOrders, mockInventory } from '@/data/mockData';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Badge from '@/components/ui/Badge';
import { formatOrderNumber } from '@/utils/formatters';
import ExportButton from '@/components/export/ExportButton';
import AuditTrail from '@/components/audit/AuditTrail';
import { mockAuditEntries } from '@/data/auditData';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';

export default function Dashboard() {
  const stats = mockDashboardStats;
  const trends = mockDeliveryTrends;
  const recentOrders = mockOrders.slice(0, 5);
  const lowStockItems = mockInventory.filter(item => item.quantity < item.minQuantity);
  const { isConnected } = useRealTimeUpdates();
  const recentAuditEntries = mockAuditEntries.slice(0, 5);

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Live Updates' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 group-hover:text-gray-700 transition-colors truncate">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 group-hover:scale-105 transition-transform">{stat.value}</p>
                <p className="text-xs text-success-600 mt-1 sm:mt-2">{stat.change} from last week</p>
              </div>
              <div className={`${stat.color} p-2 sm:p-3 rounded-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Delivery Trends */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <h3 className="font-heading text-base sm:text-lg font-semibold text-gray-900 mb-4">Delivery Trends (7 Days)</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="delivered" stroke="#10B981" strokeWidth={2} name="Delivered" />
                <Line type="monotone" dataKey="inTransit" stroke="#FF8C42" strokeWidth={2} name="In Transit" />
                <Line type="monotone" dataKey="pending" stroke="#F59E0B" strokeWidth={2} name="Pending" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Inventory Status */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <h3 className="font-heading text-base sm:text-lg font-semibold text-gray-900 mb-4">Inventory by Category</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { category: 'Electronics', count: 113 },
                { category: 'Furniture', count: 37 },
                { category: 'Office Supplies', count: 5 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4682B4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Orders */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base sm:text-lg font-semibold text-gray-900">Recent Orders</h3>
            <div className="flex items-center gap-2">
              <ExportButton
                data={recentOrders}
                filename="recent-orders"
                type="excel"
                size="sm"
              />
              <a href="/orders" className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 hover:underline font-medium transition-all">View All</a>
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{formatOrderNumber(order.id)}</p>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{order.customerName}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 flex-shrink-0">
                  <Badge variant={
                    order.status === 'delivered' ? 'success' :
                    order.status === 'in_transit' ? 'info' :
                    order.status === 'dispatched' ? 'warning' : 'gray'
                  } size="sm">
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
        <Card className="hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base sm:text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
            <a href="/inventory" className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 hover:underline font-medium transition-all">View All</a>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 sm:p-3 bg-red-50 rounded-lg hover:bg-red-100 hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.name}</p>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{item.code} • {item.location}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs sm:text-sm font-semibold text-error-600">{item.quantity} {item.unit}</p>
                  <p className="text-xs text-gray-500">Min: {item.minQuantity}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Audit Trail */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <AuditTrail entries={recentAuditEntries} title="Recent Activity" />
        </Card>
      </div>
    </div>
  );
}