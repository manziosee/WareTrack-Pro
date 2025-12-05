import { Package, AlertTriangle, TrendingUp, Clock, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import RefreshButton from '@/components/ui/RefreshButton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { dashboardService } from '@/services/dashboardService';

export default function WarehouseStaffDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [inventoryByCategory, setInventoryByCategory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [dashboardStats, categoryData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getInventoryByCategory()
      ]);

      setStats(dashboardStats);
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
      label: 'Total Items', 
      value: stats?.totalInventory?.value || 0, 
      icon: Package, 
      color: 'bg-primary-500', 
      change: `${stats?.totalInventory?.percentage || 0}%`
    },
    { 
      label: 'Low Stock Alerts', 
      value: stats?.lowStockAlerts?.value || 0, 
      icon: AlertTriangle, 
      color: 'bg-error-500', 
      change: `${stats?.lowStockAlerts?.percentage || 0}%`
    },
    { 
      label: 'Orders to Fulfill', 
      value: stats?.pendingDispatches?.value || 0, 
      icon: Clock, 
      color: 'bg-warning-500', 
      change: `${stats?.pendingDispatches?.percentage || 0}%`
    },
    { 
      label: 'Inventory Value', 
      value: `RWF ${(stats?.totalInventoryValue || 0).toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'bg-success-500', 
      change: '+12%'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Warehouse Dashboard</h1>
          <p className="text-gray-600 mt-1">Inventory management and stock control</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.location.href = '/inventory/add'}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
          <RefreshButton onRefresh={fetchDashboardData} />
        </div>
      </div>

      {/* Warehouse Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-success-600 mt-2">{stat.change} from last week</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Warehouse Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Stock Alerts</h3>
          <div className="space-y-4">
            {stats?.lowStockAlerts?.value > 0 ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800">{stats.lowStockAlerts.value} items need restocking</p>
                    <p className="text-sm text-red-600">Check inventory for items below minimum stock</p>
                  </div>
                </div>
                <button 
                  onClick={() => window.location.href = '/inventory?filter=low-stock'}
                  className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  View Low Stock Items
                </button>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">All items are well stocked</p>
                    <p className="text-sm text-green-600">No low stock alerts at this time</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.href = '/inventory/add'}
              className="w-full p-3 text-left bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-primary-700">Add New Item</span>
              </div>
            </button>
            <button 
              onClick={() => window.location.href = '/inventory?action=stock-check'}
              className="w-full p-3 text-left bg-success-50 hover:bg-success-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-success-600" />
                <span className="font-medium text-success-700">Stock Check</span>
              </div>
            </button>
            <button 
              onClick={() => window.location.href = '/reports?type=inventory'}
              className="w-full p-3 text-left bg-info-50 hover:bg-info-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-info-600" />
                <span className="font-medium text-info-700">Generate Report</span>
              </div>
            </button>
          </div>
        </Card>

        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">Stock updated</span>
              <span className="text-xs text-gray-500">2 min ago</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">New item added</span>
              <span className="text-xs text-gray-500">15 min ago</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">Order fulfilled</span>
              <span className="text-xs text-gray-500">1 hour ago</span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Today's Tasks</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm text-gray-700">Check low stock items</span>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm text-gray-700">Update inventory counts</span>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm text-gray-700">Prepare orders for dispatch</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}