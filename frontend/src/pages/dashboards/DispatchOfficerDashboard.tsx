import { Truck, Clock, MapPin, CheckCircle, Plus, Users, TrendingUp, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import RefreshButton from '@/components/ui/RefreshButton';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Badge from '@/components/ui/Badge';
import api from '@/services/api';
import { analyticsService } from '@/services/analyticsService';

export default function DispatchOfficerDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [dispatchEfficiency, setDispatchEfficiency] = useState<any[]>([]);
  const [driverPerformance, setDriverPerformance] = useState<any[]>([]);
  const [efficiencyPeriod, setEfficiencyPeriod] = useState<'week' | 'month' | '6months' | 'year'>('month');
  const [performancePeriod, setPerformancePeriod] = useState<'week' | 'month' | '6months' | 'year'>('6months');
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [summaryResponse, ordersResponse] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/recent-orders?limit=10')
      ]);

      if (summaryResponse.data.success) {
        setDashboardData(summaryResponse.data.data);
      }
      if (ordersResponse.data.success) {
        setRecentOrders(ordersResponse.data.data);
      }
      
      // Fetch analytics data with selected periods
      try {
        const efficiencyDays = efficiencyPeriod === 'week' ? 7 : efficiencyPeriod === 'month' ? 30 : efficiencyPeriod === '6months' ? 180 : 365;
        const performanceMonths = performancePeriod === 'week' ? 1 : performancePeriod === 'month' ? 1 : performancePeriod === '6months' ? 6 : 12;
        
        const [efficiency, performance] = await Promise.all([
          analyticsService.getDispatchEfficiency(efficiencyDays),
          analyticsService.getDriverPerformance(performanceMonths)
        ]);
        
        // Handle response data structure
        if (Array.isArray(efficiency)) {
          setDispatchEfficiency(efficiency);
        } else if (efficiency?.data) {
          setDispatchEfficiency(efficiency.data);
        } else {
          setDispatchEfficiency([]);
        }
        
        if (Array.isArray(performance)) {
          setDriverPerformance(performance);
        } else if (performance?.driverSummaries) {
          setDriverPerformance(performance.driverSummaries);
        } else {
          setDriverPerformance([]);
        }
      } catch (analyticsError: any) {
        console.log('Analytics not available:', analyticsError.message);
        setDispatchEfficiency([]);
        setDriverPerformance([]);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [efficiencyPeriod, performancePeriod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const dispatchStats = dashboardData?.dispatchStats;
  const statCards = [
    { 
      label: 'Pending Dispatches', 
      value: dispatchStats?.pendingDispatches?.value || 0, 
      icon: Clock, 
      color: 'bg-warning-500', 
      change: `${dispatchStats?.pendingDispatches?.percentage || 0}%`
    },
    { 
      label: 'In Transit', 
      value: dispatchStats?.inTransit?.value || 0, 
      icon: Truck, 
      color: 'bg-info-500', 
      change: `${dispatchStats?.inTransit?.percentage || 0}%`
    },
    { 
      label: 'Completed Today', 
      value: dispatchStats?.completedToday?.value || 0, 
      icon: CheckCircle, 
      color: 'bg-success-500', 
      change: `${dispatchStats?.completedToday?.percentage || 0}%`
    },
    { 
      label: 'Available Drivers', 
      value: dispatchStats?.availableDrivers?.value || 0, 
      icon: Users, 
      color: 'bg-primary-500', 
      change: `${dispatchStats?.availableDrivers?.percentage || 0}%`
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Dispatch Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage deliveries and coordinate fleet operations</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.location.href = '/dispatch/create'}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Dispatch
          </button>
          <RefreshButton onRefresh={fetchDashboardData} />
        </div>
      </div>

      {/* Dispatch Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-success-600 mt-2">{stat.change} from yesterday</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Dispatch Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              Dispatch Efficiency
            </div>
            <select
              value={efficiencyPeriod}
              onChange={(e) => setEfficiencyPeriod(e.target.value as 'week' | 'month' | '6months' | 'year')}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="6months">Last 6 Months</option>
              <option value="year">Last Year</option>
            </select>
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dispatchEfficiency}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="dispatched" stroke="#4F46E5" strokeWidth={2} name="Dispatched" />
              <Line type="monotone" dataKey="delivered" stroke="#10B981" strokeWidth={2} name="Delivered" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              Driver Performance
            </div>
            <select
              value={performancePeriod}
              onChange={(e) => setPerformancePeriod(e.target.value as 'week' | 'month' | '6months' | 'year')}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="6months">Last 6 Months</option>
              <option value="year">Last Year</option>
            </select>
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={driverPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="driverName" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="deliveries" fill="#4F46E5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Fleet Status */}
      <Card>
        <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Fleet Status</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Available Vehicles</span>
            </div>
            <Badge variant="success">{dispatchStats?.fleetStatus?.availableVehicles || 0}</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">On Route</span>
            </div>
            <Badge variant="info">{dispatchStats?.fleetStatus?.onRouteVehicles || 0}</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Maintenance</span>
            </div>
            <Badge variant="warning">{dispatchStats?.fleetStatus?.maintenanceVehicles || 0}</Badge>
          </div>
        </div>
      </Card>

      {/* Orders and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold text-gray-900">Orders Awaiting Dispatch</h3>
              <button 
                onClick={() => window.location.href = '/orders?status=pending'}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {recentOrders.filter(order => order.status === 'PENDING').slice(0, 6).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.customerName}</p>
                    <p className="text-xs text-gray-500">{order.totalAmount}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="gray">PENDING</Badge>
                    <button 
                      onClick={() => window.location.href = `/dispatch/create?orderId=${order.id}`}
                      className="bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700 transition-colors"
                    >
                      Dispatch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.href = '/dispatch'}
              className="w-full p-3 text-left bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-primary-700">View All Dispatches</span>
              </div>
            </button>
            <button 
              onClick={() => window.location.href = '/vehicles'}
              className="w-full p-3 text-left bg-success-50 hover:bg-success-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-success-600" />
                <span className="font-medium text-success-700">Fleet Management</span>
              </div>
            </button>
            <button 
              onClick={() => window.location.href = '/tracking'}
              className="w-full p-3 text-left bg-info-50 hover:bg-info-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-info-600" />
                <span className="font-medium text-info-700">Live Tracking</span>
              </div>
            </button>
          </div>

          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-3">Today's Priority</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700">{dispatchStats?.todayPriority?.urgentDeliveries || 0} urgent deliveries</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-700">{dispatchStats?.todayPriority?.scheduledPickups || 0} scheduled pickups</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">{dispatchStats?.todayPriority?.routeOptimizations || 0} route optimizations</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}