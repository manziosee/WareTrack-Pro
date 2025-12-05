import { MapPin, Clock, CheckCircle, Navigation, Phone, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import RefreshButton from '@/components/ui/RefreshButton';
import Badge from '@/components/ui/Badge';


export default function DriverDashboard() {
  const [currentDelivery, setCurrentDelivery] = useState<any>(null);
  const [todayStats, setTodayStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDriverData = async () => {
    try {
      // Mock driver-specific data - replace with actual API calls
      setCurrentDelivery({
        id: 1,
        orderNumber: 'ORD-000001',
        customerName: 'Beza Ornella',
        deliveryAddress: 'KN 4 Ave, Kigali',
        contactNumber: '+250788123456',
        status: 'IN_TRANSIT',
        estimatedArrival: '2:30 PM',
        items: [
          { name: 'Product A', quantity: 2 },
          { name: 'Product B', quantity: 1 }
        ]
      });

      setTodayStats({
        deliveriesCompleted: 3,
        deliveriesRemaining: 2,
        totalDistance: 45,
        earnings: 15000
      });
    } catch (error) {
      console.error('Failed to fetch driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
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
      label: 'Completed Today', 
      value: todayStats?.deliveriesCompleted || 0, 
      icon: CheckCircle, 
      color: 'bg-success-500'
    },
    { 
      label: 'Remaining', 
      value: todayStats?.deliveriesRemaining || 0, 
      icon: Clock, 
      color: 'bg-warning-500'
    },
    { 
      label: 'Distance (km)', 
      value: todayStats?.totalDistance || 0, 
      icon: Navigation, 
      color: 'bg-info-500'
    },
    { 
      label: 'Earnings (RWF)', 
      value: (todayStats?.earnings || 0).toLocaleString(), 
      icon: Package, 
      color: 'bg-primary-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Driver Dashboard</h1>
          <p className="text-gray-600 mt-1">Your delivery assignments and progress</p>
        </div>
        <RefreshButton onRefresh={fetchDriverData} />
      </div>

      {/* Driver Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Current Delivery */}
      {currentDelivery && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold text-gray-900">Current Delivery</h3>
            <Badge variant={
              currentDelivery.status === 'IN_TRANSIT' ? 'info' :
              currentDelivery.status === 'DELIVERED' ? 'success' : 'warning'
            }>
              {currentDelivery.status.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Delivery Details</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{currentDelivery.orderNumber}</p>
                    <p className="text-sm text-gray-600">{currentDelivery.customerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Delivery Address</p>
                    <p className="text-sm text-gray-600">{currentDelivery.deliveryAddress}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Customer Contact</p>
                    <p className="text-sm text-gray-600">{currentDelivery.contactNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">ETA</p>
                    <p className="text-sm text-gray-600">{currentDelivery.estimatedArrival}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Items to Deliver</h4>
              <div className="space-y-2">
                {currentDelivery.items.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{item.name}</span>
                    <span className="text-sm font-medium text-gray-900">Qty: {item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                <button 
                  onClick={() => window.location.href = '/tracking'}
                  className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Update Delivery Status
                </button>
                <button 
                  onClick={() => window.open(`tel:${currentDelivery.contactNumber}`)}
                  className="w-full bg-success-600 text-white py-2 px-4 rounded-lg hover:bg-success-700 transition-colors"
                >
                  Call Customer
                </button>
                <button 
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(currentDelivery.deliveryAddress)}`)}
                  className="w-full bg-info-600 text-white py-2 px-4 rounded-lg hover:bg-info-700 transition-colors"
                >
                  Open in Maps
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Driver Actions and Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-green-800">ORD-000001</p>
                <p className="text-sm text-green-600">Delivered - 10:30 AM</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-green-800">ORD-000002</p>
                <p className="text-sm text-green-600">Delivered - 12:15 PM</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-blue-800">ORD-000003</p>
                <p className="text-sm text-blue-600">In Transit - ETA 2:30 PM</p>
              </div>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">ORD-000004</p>
                <p className="text-sm text-gray-600">Pending - 4:00 PM</p>
              </div>
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">On-time Delivery Rate</span>
              <span className="font-medium text-green-600">95%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Customer Rating</span>
              <span className="font-medium text-yellow-600">4.8/5</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">This Week's Deliveries</span>
              <span className="font-medium text-blue-600">18</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Distance (Week)</span>
              <span className="font-medium text-purple-600">245 km</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.href = '/profile'}
                className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
              >
                Update Profile
              </button>
              <button 
                onClick={() => window.location.href = '/reports?type=driver'}
                className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
              >
                View Reports
              </button>
              <button 
                onClick={() => window.location.href = '/help'}
                className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
              >
                Help & Support
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}