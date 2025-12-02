import { useState, useEffect } from 'react';
import { Download, Calendar } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ExportReportForm from '@/components/forms/ExportReportForm';
import { reportsService } from '@/services/reportsService';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Reports() {
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const analyticsData = await reportsService.getAnalytics(dateRange);
      setAnalytics(analyticsData.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleDateRangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDateRangeModal(false);
    fetchAnalytics();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load analytics data</p>
      </div>
    );
  }

  const deliveryStatusData = analytics.statusDistribution?.map((item: any) => ({
    name: item.status.replace('_', ' '),
    value: item.count,
    color: item.status === 'DELIVERED' ? '#10B981' : 
           item.status === 'IN_TRANSIT' ? '#FF8C42' :
           item.status === 'DISPATCHED' ? '#F59E0B' : '#6B7280'
  })) || [];

  const inventoryByCategory = analytics.inventoryByCategory || [];
  const deliveryTrends = analytics.trends || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and data analysis</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowDateRangeModal(true)}>
            <Calendar className="w-5 h-5 mr-2" />
            Date Range
          </Button>
          <Button variant="primary" onClick={() => setShowExportModal(true)}>
            <Download className="w-5 h-5 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.summary?.totalOrders || 0}</p>
          <p className={`text-xs mt-2 ${
            analytics.summary?.ordersChange >= 0 ? 'text-success-600' : 'text-error-600'
          }`}>
            {analytics.summary?.ordersChange >= 0 ? '+' : ''}{analytics.summary?.ordersChange || 0}% from last month
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Delivery Rate</p>
          <p className="text-3xl font-bold text-success-600 mt-1">{analytics.summary?.deliveryRate || 0}%</p>
          <p className={`text-xs mt-2 ${
            analytics.summary?.deliveryRateChange >= 0 ? 'text-success-600' : 'text-error-600'
          }`}>
            {analytics.summary?.deliveryRateChange >= 0 ? '+' : ''}{analytics.summary?.deliveryRateChange || 0}% from last month
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Avg. Delivery Time</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.summary?.avgDeliveryTime || 0}d</p>
          <p className={`text-xs mt-2 ${
            analytics.summary?.deliveryTimeChange <= 0 ? 'text-success-600' : 'text-error-600'
          }`}>
            {analytics.summary?.deliveryTimeChange >= 0 ? '+' : ''}{analytics.summary?.deliveryTimeChange || 0}d from last month
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Active Drivers</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.summary?.activeDrivers || 0}</p>
          <p className="text-xs text-gray-600 mt-2">Available drivers</p>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Trends */}
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Delivery Trends (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={deliveryTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="delivered" stroke="#10B981" strokeWidth={2} name="Delivered" />
              <Line type="monotone" dataKey="inTransit" stroke="#FF8C42" strokeWidth={2} name="In Transit" />
              <Line type="monotone" dataKey="pending" stroke="#F59E0B" strokeWidth={2} name="Pending" />
              <Line type="monotone" dataKey="orders" stroke="#6366F1" strokeWidth={2} name="Total Orders" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Delivery Status Distribution */}
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Delivery Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={deliveryStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {deliveryStatusData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory by Category */}
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Inventory by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={inventoryByCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#4682B4" radius={[8, 8, 0, 0]} />
              <Bar dataKey="totalQuantity" fill="#10B981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">On-Time Delivery Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.kpis?.onTimeDeliveryRate || 0}%</p>
              </div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                (analytics.kpis?.onTimeDeliveryRate || 0) >= 90 ? 'bg-success-100' : 
                (analytics.kpis?.onTimeDeliveryRate || 0) >= 80 ? 'bg-warning-100' : 'bg-error-100'
              }`}>
                <span className={`text-2xl font-bold ${
                  (analytics.kpis?.onTimeDeliveryRate || 0) >= 90 ? 'text-success-600' : 
                  (analytics.kpis?.onTimeDeliveryRate || 0) >= 80 ? 'text-warning-600' : 'text-error-600'
                }`}>
                  {(analytics.kpis?.onTimeDeliveryRate || 0) >= 90 ? 'A' : 
                   (analytics.kpis?.onTimeDeliveryRate || 0) >= 80 ? 'B' : 'C'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Customer Satisfaction</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.kpis?.customerSatisfaction || 0}/5</p>
              </div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                (analytics.kpis?.customerSatisfaction || 0) >= 4.5 ? 'bg-success-100' : 
                (analytics.kpis?.customerSatisfaction || 0) >= 4.0 ? 'bg-warning-100' : 'bg-error-100'
              }`}>
                <span className={`text-2xl font-bold ${
                  (analytics.kpis?.customerSatisfaction || 0) >= 4.5 ? 'text-success-600' : 
                  (analytics.kpis?.customerSatisfaction || 0) >= 4.0 ? 'text-warning-600' : 'text-error-600'
                }`}>
                  {(analytics.kpis?.customerSatisfaction || 0) >= 4.5 ? 'A' : 
                   (analytics.kpis?.customerSatisfaction || 0) >= 4.0 ? 'B' : 'C'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Fleet Utilization</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.kpis?.fleetUtilization || 0}%</p>
              </div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                (analytics.kpis?.fleetUtilization || 0) >= 80 ? 'bg-success-100' : 
                (analytics.kpis?.fleetUtilization || 0) >= 60 ? 'bg-warning-100' : 'bg-error-100'
              }`}>
                <span className={`text-2xl font-bold ${
                  (analytics.kpis?.fleetUtilization || 0) >= 80 ? 'text-success-600' : 
                  (analytics.kpis?.fleetUtilization || 0) >= 60 ? 'text-warning-600' : 'text-error-600'
                }`}>
                  {(analytics.kpis?.fleetUtilization || 0) >= 80 ? 'A' : 
                   (analytics.kpis?.fleetUtilization || 0) >= 60 ? 'B' : 'C'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title="Export Report">
        <ExportReportForm onClose={() => setShowExportModal(false)} />
      </Modal>

      <Modal isOpen={showDateRangeModal} onClose={() => setShowDateRangeModal(false)} title="Select Date Range">
        <form onSubmit={handleDateRangeSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Quick Select:</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDateRange({
                  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0]
                })}
                className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setDateRange({
                  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0]
                })}
                className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => setDateRange({
                  startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0]
                })}
                className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Last 3 Months
              </button>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowDateRangeModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Apply Date Range
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}