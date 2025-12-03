import { Package, Truck, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import RefreshButton from '@/components/ui/RefreshButton';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Badge from '@/components/ui/Badge';

import { dashboardService } from '@/services/dashboardService';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [inventoryByCategory, setInventoryByCategory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashboardStats, dashboardTrends, dashboardOrders, categoryData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getTrends(),
          dashboardService.getRecentOrders(5),
          dashboardService.getInventoryByCategory()
        ]);

        setStats(dashboardStats);
        setTrends(dashboardTrends);
        setRecentOrders(dashboardOrders || []);
        setInventoryByCategory(categoryData || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        
        // Fallback to mock data when backend is unavailable
        setStats({
          totalInventory: { value: 0, percentage: 0 },
          deliveriesToday: { value: 0, percentage: 0 },
          pendingDispatches: { value: 0, percentage: 0 },
          inTransit: { value: 0, percentage: 0 },
          lowStockAlerts: { value: 0, percentage: 0 }
        });
        setTrends([]);
        setRecentOrders([]);
        setInventoryByCategory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    // No automatic refresh - only manual refresh
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
          <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
          <p className="text-yellow-800 font-medium">Backend Service Unavailable</p>
          <p className="text-yellow-700 text-sm mt-1">The backend service is temporarily down. Please try again later.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const formatPercentage = (percentage: number) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage}%`;
  };

  const statCards = [
    { 
      label: 'Total Inventory', 
      value: stats.totalInventory?.value || 0, 
      icon: Package, 
      color: 'bg-primary-500', 
      change: formatPercentage(stats.totalInventory?.percentage || 0)
    },
    { 
      label: 'Deliveries Today', 
      value: stats.deliveriesToday?.value || 0, 
      icon: CheckCircle, 
      color: 'bg-success-500', 
      change: formatPercentage(stats.deliveriesToday?.percentage || 0)
    },
    { 
      label: 'Pending Dispatches', 
      value: stats.pendingDispatches?.value || 0, 
      icon: Clock, 
      color: 'bg-warning-500', 
      change: formatPercentage(stats.pendingDispatches?.percentage || 0)
    },
    { 
      label: 'In Transit', 
      value: stats.inTransit?.value || 0, 
      icon: Truck, 
      color: 'bg-accent-500', 
      change: formatPercentage(stats.inTransit?.percentage || 0)
    },
    { 
      label: 'Low Stock Alerts', 
      value: stats.lowStockAlerts?.value || 0, 
      icon: AlertTriangle, 
      color: 'bg-error-500', 
      change: formatPercentage(stats.lowStockAlerts?.percentage || 0)
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <RefreshButton onRefresh={async () => {
          setLoading(true);
          try {
            const [dashboardStats, dashboardTrends, dashboardOrders, categoryData] = await Promise.all([
              dashboardService.getStats(),
              dashboardService.getTrends(),
              dashboardService.getRecentOrders(5),
              dashboardService.getInventoryByCategory()
            ]);

            setStats(dashboardStats);
            setTrends(dashboardTrends);
            setRecentOrders(dashboardOrders || []);
            setInventoryByCategory(categoryData || []);
          } catch (error) {
            console.error('Failed to refresh dashboard data:', error);
          } finally {
            setLoading(false);
          }
        }} />
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
              <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} name="Completed" />
              <Line type="monotone" dataKey="cancelled" stroke="#EF4444" strokeWidth={2} name="Cancelled" />
              <Line type="monotone" dataKey="pending" stroke="#F59E0B" strokeWidth={2} name="Pending" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Inventory Status */}
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Inventory by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={inventoryByCategory}>
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
                  <p className="font-medium text-gray-900">{order.orderNumber}</p>
                  <p className="text-sm text-gray-600">{order.customerName}</p>
                  <p className="text-xs text-gray-500">{order.totalAmount}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={
                    order.status === 'DELIVERED' ? 'success' :
                    order.status === 'IN_TRANSIT' ? 'info' :
                    order.status === 'DISPATCHED' ? 'warning' : 'gray'
                  }>
                    {order.status.replace('_', ' ')}
                  </Badge>
                  <div className="text-right text-xs text-gray-500">
                    <p>Driver: {order.driver}</p>
                    <p>Vehicle: {order.vehicle}</p>
                  </div>
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
            {stats?.lowStockAlerts?.value > 0 ? (
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <AlertTriangle className="w-8 h-8 text-error-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900">{stats.lowStockAlerts.value} items need attention</p>
                <p className="text-sm text-gray-600">Check inventory for items below minimum stock</p>
              </div>
            ) : (
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <CheckCircle className="w-8 h-8 text-success-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900">All items in stock</p>
                <p className="text-sm text-gray-600">No low stock alerts at this time</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}