import { Package, Truck, CheckCircle, AlertTriangle, Users, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import RefreshButton from '@/components/ui/RefreshButton';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Badge from '@/components/ui/Badge';
import { dashboardService } from '@/services/dashboardService';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [inventoryByCategory, setInventoryByCategory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    { 
      label: 'Total Inventory', 
      value: stats?.totalInventory?.value || 0, 
      icon: Package, 
      color: 'bg-primary-500', 
      change: `${stats?.totalInventory?.percentage >= 0 ? '+' : ''}${stats?.totalInventory?.percentage || 0}%`,
      link: '/inventory'
    },
    { 
      label: 'Deliveries Today', 
      value: stats?.deliveriesToday?.value || 0, 
      icon: CheckCircle, 
      color: 'bg-success-500', 
      change: `${stats?.deliveriesToday?.percentage >= 0 ? '+' : ''}${stats?.deliveriesToday?.percentage || 0}%`,
      link: '/orders'
    },
    { 
      label: 'Active Users', 
      value: stats?.activeUsers?.value || 0, 
      icon: Users, 
      color: 'bg-info-500', 
      change: `${stats?.activeUsers?.percentage >= 0 ? '+' : ''}${stats?.activeUsers?.percentage || 0}%`,
      link: '/users'
    },
    { 
      label: 'Fleet Status', 
      value: stats?.fleetStatus?.value || 0, 
      icon: Truck, 
      color: 'bg-accent-500', 
      change: `${stats?.fleetStatus?.percentage >= 0 ? '+' : ''}${stats?.fleetStatus?.percentage || 0}%`,
      link: '/vehicles'
    },
    { 
      label: 'System Alerts', 
      value: stats?.systemAlerts?.value || 0, 
      icon: AlertTriangle, 
      color: 'bg-error-500', 
      change: `${stats?.systemAlerts?.percentage >= 0 ? '+' : ''}${stats?.systemAlerts?.percentage || 0}%`,
      link: '/settings'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Complete system overview and management</p>
        </div>
        <RefreshButton onRefresh={fetchDashboardData} />
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover:shadow-lg transition-shadow cursor-pointer">
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

      {/* Admin Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">System Performance</h3>
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

        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Inventory Distribution</h3>
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

      {/* Admin Management Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{order.orderNumber}</p>
                  <p className="text-sm text-gray-600">{order.customerName}</p>
                </div>
                <Badge variant={
                  order.status === 'DELIVERED' ? 'success' :
                  order.status === 'IN_TRANSIT' ? 'info' :
                  order.status === 'DISPATCHED' ? 'warning' : 'gray'
                }>
                  {order.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <Badge variant="success">Online</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Server</span>
              <Badge variant="success">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Email Service</span>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Storage</span>
              <Badge variant="warning">85% Used</Badge>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full p-3 text-left bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-primary-700">Manage Users</span>
              </div>
            </button>
            <button className="w-full p-3 text-left bg-success-50 hover:bg-success-100 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-success-600" />
                <span className="font-medium text-success-700">Add Inventory</span>
              </div>
            </button>
            <button className="w-full p-3 text-left bg-info-50 hover:bg-info-100 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-info-600" />
                <span className="font-medium text-info-700">System Settings</span>
              </div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}