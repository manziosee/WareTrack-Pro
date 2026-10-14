import { useState, useEffect } from 'react';
import { Download, Calendar, TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ExportReportForm from '@/components/forms/ExportReportForm';
import { reportsService } from '@/services/reportsService';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SERIES, STATUS, chartMargin, gridProps, xAxisProps, yAxisProps, lineProps, barProps, tooltipCursor, barCursor, legendProps } from '@/components/charts/chartConfig';
import { ChartTooltip, ChartCard, ChartEmpty, DonutCenter, DonutLegend } from '@/components/charts/chartTheme';

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
    color: item.status === 'DELIVERED' ? STATUS.good :
           item.status === 'IN_TRANSIT' ? STATUS.info :
           item.status === 'DISPATCHED' ? STATUS.warning :
           item.status === 'CANCELLED' ? STATUS.critical : STATUS.neutral
  })) || [];

  const totalDeliveries = deliveryStatusData.reduce((sum: number, item: any) => sum + (Number(item.value) || 0), 0);
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
        <ChartCard
          title="Delivery Trends"
          subtitle="Orders by delivery stage over the selected period"
          icon={<TrendingUp className="w-5 h-5" />}
        >
          {deliveryTrends.length === 0 ? <ChartEmpty /> : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={deliveryTrends} margin={chartMargin}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip content={<ChartTooltip />} cursor={tooltipCursor} />
                <Legend {...legendProps} />
                <Line {...lineProps} dataKey="orders" stroke={SERIES[0]} name="Total Orders" />
                <Line {...lineProps} dataKey="delivered" stroke={STATUS.good} name="Delivered" />
                <Line {...lineProps} dataKey="inTransit" stroke={SERIES[1]} name="In Transit" />
                <Line {...lineProps} dataKey="pending" stroke={STATUS.warning} name="Pending" strokeDasharray="5 4" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Delivery Status Distribution"
          subtitle="Share of orders in each status"
          icon={<PieChartIcon className="w-5 h-5" />}
        >
          {totalDeliveries === 0 ? <ChartEmpty /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-6">
              <div className="relative h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deliveryStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="62%"
                      outerRadius="92%"
                      paddingAngle={2}
                      cornerRadius={6}
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {deliveryStatusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <DonutCenter total={totalDeliveries.toLocaleString()} label="Orders" />
              </div>
              <DonutLegend items={deliveryStatusData} />
            </div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Inventory by Category"
          subtitle="Number of items and units held per category"
          icon={<BarChart3 className="w-5 h-5" />}
        >
          {inventoryByCategory.length === 0 ? <ChartEmpty /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inventoryByCategory} margin={chartMargin} barGap={2}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="category" {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip content={<ChartTooltip />} cursor={barCursor} />
                <Legend {...legendProps} />
                <Bar {...barProps} dataKey="count" fill={SERIES[0]} name="Items" />
                <Bar {...barProps} dataKey="totalQuantity" fill={SERIES[1]} name="Total Units" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

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

      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Report"
        subtitle="Download the current analytics"
        icon={<Download className="w-5 h-5" />}
      >
        <ExportReportForm onClose={() => setShowExportModal(false)} analytics={analytics} dateRange={dateRange} />
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