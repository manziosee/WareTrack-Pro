import { useState } from 'react';
import { Download, Calendar } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ExportReportForm from '@/components/forms/ExportReportForm';
import { mockDeliveryTrends, mockOrders, mockInventory } from '@/data/mockData';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Reports() {
  const [showExportModal, setShowExportModal] = useState(false);
  
  const deliveryStatusData = [
    { name: 'Delivered', value: mockOrders.filter(o => o.status === 'delivered').length, color: '#10B981' },
    { name: 'In Transit', value: mockOrders.filter(o => o.status === 'in_transit').length, color: '#FF8C42' },
    { name: 'Dispatched', value: mockOrders.filter(o => o.status === 'dispatched').length, color: '#F59E0B' },
    { name: 'Pending', value: mockOrders.filter(o => o.status === 'pending').length, color: '#6B7280' },
  ];

  const inventoryByCategory = [
    { category: 'Electronics', count: mockInventory.filter(i => i.category === 'Electronics').reduce((sum, i) => sum + i.quantity, 0) },
    { category: 'Furniture', count: mockInventory.filter(i => i.category === 'Furniture').reduce((sum, i) => sum + i.quantity, 0) },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and data analysis</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">
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
          <p className="text-3xl font-bold text-gray-900 mt-1">{mockOrders.length}</p>
          <p className="text-xs text-success-600 mt-2">+15% from last month</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Delivery Rate</p>
          <p className="text-3xl font-bold text-success-600 mt-1">92%</p>
          <p className="text-xs text-success-600 mt-2">+3% from last month</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Avg. Delivery Time</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">2.4d</p>
          <p className="text-xs text-error-600 mt-2">+0.2d from last month</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Active Drivers</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">2</p>
          <p className="text-xs text-gray-600 mt-2">No change</p>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Trends */}
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Delivery Trends (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockDeliveryTrends}>
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
                {deliveryStatusData.map((entry, index) => (
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
                <p className="text-2xl font-bold text-gray-900 mt-1">94%</p>
              </div>
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-success-600">A</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Customer Satisfaction</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">4.8/5</p>
              </div>
              <div className="w-16 h-16 bg-warning-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-warning-600">B+</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Fleet Utilization</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">78%</p>
              </div>
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-600">B</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title="Export Report">
        <ExportReportForm onClose={() => setShowExportModal(false)} />
      </Modal>
    </div>
  );
}