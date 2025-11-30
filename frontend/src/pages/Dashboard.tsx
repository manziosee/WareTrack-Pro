import React from 'react';
import { Package, Truck, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const stats = [
    { title: 'Total Inventory', value: '1,234', icon: Package, color: 'bg-blue-500' },
    { title: 'Deliveries Today', value: '45', icon: Truck, color: 'bg-green-500' },
    { title: 'Pending Dispatches', value: '12', icon: Clock, color: 'bg-yellow-500' },
    { title: 'In Transit', value: '28', icon: CheckCircle, color: 'bg-purple-500' },
    { title: 'Low Stock Items', value: '8', icon: AlertTriangle, color: 'bg-red-500' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3 mr-4`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">Order #ORD-{item.toString().padStart(3, '0')}</p>
                  <p className="text-sm text-gray-600">Customer Name</p>
                </div>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Low Stock Alerts</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex justify-between items-center p-3 bg-red-50 rounded">
                <div>
                  <p className="font-medium">Item Name {item}</p>
                  <p className="text-sm text-gray-600">Current: 5 units</p>
                </div>
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                  Low Stock
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;