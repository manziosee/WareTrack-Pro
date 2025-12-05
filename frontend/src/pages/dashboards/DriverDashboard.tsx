import { MapPin, Clock, CheckCircle, Navigation, Phone, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import RefreshButton from '@/components/ui/RefreshButton';
import Badge from '@/components/ui/Badge';
import api from '@/services/api';

export default function DriverDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDriverData = async () => {
    try {
      const response = await api.get('/dashboard/summary');
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
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

  const driverStats = dashboardData?.driverStats;
  const statCards = [
    { 
      label: 'Completed Today', 
      value: driverStats?.completedToday || 0, 
      icon: CheckCircle, 
      color: 'bg-success-500'
    },
    { 
      label: 'Remaining', 
      value: driverStats?.remaining || 0, 
      icon: Clock, 
      color: 'bg-warning-500'
    },
    { 
      label: 'Distance (km)', 
      value: driverStats?.distance || 0, 
      icon: Navigation, 
      color: 'bg-info-500'
    },
    { 
      label: 'Earnings (RWF)', 
      value: (driverStats?.earnings || 0).toLocaleString(), 
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
      {driverStats?.currentDelivery && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold text-gray-900">Current Delivery</h3>
            <Badge variant={
              driverStats.currentDelivery.status === 'IN_TRANSIT' ? 'info' :
              driverStats.currentDelivery.status === 'DELIVERED' ? 'success' : 'warning'
            }>
              {driverStats.currentDelivery.status.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Delivery Details</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{driverStats.currentDelivery.orderNumber}</p>
                    <p className="text-sm text-gray-600">{driverStats.currentDelivery.customerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Delivery Address</p>
                    <p className="text-sm text-gray-600">{driverStats.currentDelivery.deliveryAddress}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Customer Contact</p>
                    <p className="text-sm text-gray-600">{driverStats.currentDelivery.customerPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">ETA</p>
                    <p className="text-sm text-gray-600">{new Date(driverStats.currentDelivery.eta).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Items to Deliver</h4>
              <div className="space-y-2">
                {driverStats.currentDelivery.items?.map((item: any, index: number) => (
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
                  onClick={() => window.open(`tel:${driverStats.currentDelivery.customerPhone}`)}
                  className="w-full bg-success-600 text-white py-2 px-4 rounded-lg hover:bg-success-700 transition-colors"
                >
                  Call Customer
                </button>
                <button 
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(driverStats.currentDelivery.deliveryAddress)}`)}
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
            {driverStats?.todaySchedule?.map((delivery: any, index: number) => {
              const getStatusColor = (status: string) => {
                switch (status) {
                  case 'DELIVERED': return 'bg-green-50 text-green-800';
                  case 'IN_TRANSIT': return 'bg-blue-50 text-blue-800';
                  case 'DISPATCHED': return 'bg-yellow-50 text-yellow-800';
                  case 'PENDING': return 'bg-gray-50 text-gray-800';
                  default: return 'bg-gray-50 text-gray-800';
                }
              };

              const getStatusIcon = (status: string) => {
                switch (status) {
                  case 'DELIVERED': return <CheckCircle className="w-5 h-5 text-green-600" />;
                  case 'IN_TRANSIT': return <Clock className="w-5 h-5 text-blue-600" />;
                  case 'DISPATCHED': return <Clock className="w-5 h-5 text-yellow-600" />;
                  case 'PENDING': return <Clock className="w-5 h-5 text-gray-600" />;
                  default: return <Clock className="w-5 h-5 text-gray-600" />;
                }
              };

              const formatTime = (time: string) => {
                return new Date(time).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true 
                });
              };

              const getStatusText = (status: string, time: string) => {
                switch (status) {
                  case 'DELIVERED': return `Delivered - ${formatTime(time)}`;
                  case 'IN_TRANSIT': return `In Transit - ETA ${formatTime(time)}`;
                  case 'DISPATCHED': return `Dispatched - ETA ${formatTime(time)}`;
                  case 'PENDING': return `Pending - ${formatTime(time)}`;
                  default: return `${status} - ${formatTime(time)}`;
                }
              };

              return (
                <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${getStatusColor(delivery.status)}`}>
                  <div>
                    <p className="font-medium">{delivery.orderNumber}</p>
                    <p className="text-sm">{getStatusText(delivery.status, delivery.time)}</p>
                  </div>
                  {getStatusIcon(delivery.status)}
                </div>
              );
            }) || (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No deliveries scheduled for today</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.href = '/tracking'}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              <Navigation className="w-5 h-5" />
              View All Deliveries
            </button>
            <button 
              onClick={() => window.location.href = '/profile'}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Package className="w-5 h-5" />
              Update Profile
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Performance Summary</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Distance Today</span>
                <span className="font-medium text-blue-600">{driverStats?.distance || 0} km</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Earnings Today</span>
                <span className="font-medium text-green-600">RWF {(driverStats?.earnings || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="font-medium text-purple-600">
                  {driverStats?.completedToday && (driverStats.completedToday + driverStats.remaining) > 0 
                    ? Math.round((driverStats.completedToday / (driverStats.completedToday + driverStats.remaining)) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}