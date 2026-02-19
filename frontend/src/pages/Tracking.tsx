import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, Truck, Package, Edit, Eye, EyeOff, MapPin, Phone, RefreshCw } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import UpdateOrderStatusForm from '@/components/forms/UpdateOrderStatusForm';
import { ordersService } from '@/services/ordersService';
import { formatOrderNumber, formatDateTime } from '@/utils/formatters';
import toast from 'react-hot-toast';

export default function Tracking() {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActiveOrders = useCallback(async () => {
    try {
      const response = await ordersService.getOrders();
      const orders = response.data || [];
      setActiveOrders(orders.filter((o: any) => o.status !== 'CANCELLED'));
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveOrders();
    // Auto-refresh every 30 seconds for live tracking
    const interval = setInterval(fetchActiveOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveOrders]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchActiveOrders();
  };

  const handleUpdateStatus = (orderId: number) => {
    setSelectedOrder(orderId.toString());
    setShowUpdateModal(true);
  };

  const handleStatusUpdated = () => {
    setShowUpdateModal(false);
    setSelectedOrder(null);
    fetchActiveOrders();
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'PENDING': return Clock;
      case 'DISPATCHED': return Package;
      case 'IN_TRANSIT': return Truck;
      case 'DELIVERED': return CheckCircle;
      default: return Clock;
    }
  };

  const stages = [
    { key: 'PENDING', label: 'Pending', color: 'bg-gray-500', textColor: 'text-gray-700', ringColor: 'ring-gray-300' },
    { key: 'DISPATCHED', label: 'Dispatched', color: 'bg-orange-500', textColor: 'text-orange-700', ringColor: 'ring-orange-300' },
    { key: 'IN_TRANSIT', label: 'In Transit', color: 'bg-blue-500', textColor: 'text-blue-700', ringColor: 'ring-blue-300' },
    { key: 'DELIVERED', label: 'Delivered', color: 'bg-green-500', textColor: 'text-green-700', ringColor: 'ring-green-300' },
  ];

  const getCurrentStageIndex = (status: string) => {
    return stages.findIndex(s => s.key === status);
  };

  const filteredOrders = activeOrders.filter(order => showCompleted || order.status !== 'DELIVERED');

  // Summary stats
  const pendingCount = activeOrders.filter(o => o.status === 'PENDING').length;
  const inTransitCount = activeOrders.filter(o => o.status === 'IN_TRANSIT' || o.status === 'DISPATCHED').length;
  const deliveredCount = activeOrders.filter(o => o.status === 'DELIVERED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Delivery Tracking</h1>
          <p className="text-gray-600 mt-1">Real-time tracking of delivery orders</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${refreshing ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <Button
            variant={showCompleted ? "primary" : "secondary"}
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2"
          >
            {showCompleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showCompleted ? 'Hide Completed' : 'Show Completed'}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-xl font-bold text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">In Transit</p>
              <p className="text-xl font-bold text-gray-900">{inTransitCount}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Delivered Today</p>
              <p className="text-xl font-bold text-gray-900">{deliveredCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Deliveries */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
          const currentStageIndex = getCurrentStageIndex(order.status);

          return (
            <Card key={order.id}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-bold bg-primary-50 text-primary-700 px-3 py-1 rounded">
                      {order.orderNumber || formatOrderNumber(order.id)}
                    </code>
                    <Badge variant={
                      order.priority === 'HIGH' ? 'error' :
                      order.priority === 'MEDIUM' ? 'warning' : 'gray'
                    }>
                      {order.priority} priority
                    </Badge>
                  </div>
                  <p className="text-gray-900 font-medium mt-2">{order.customerName}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {order.deliveryAddress}
                  </div>
                  {order.contactNumber && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <Phone className="w-3.5 h-3.5" />
                      {order.contactNumber}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {order.status !== 'DELIVERED' && (
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => handleUpdateStatus(order.id)}
                      className="mb-2"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Update Status
                    </Button>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="text-sm font-medium text-gray-900">{formatDateTime(order.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative">
                <div className="flex items-center justify-between">
                  {stages.map((stage, index) => {
                    const isCompleted = index <= currentStageIndex;
                    const isCurrent = index === currentStageIndex;
                    const Icon = getStageIcon(stage.key);

                    return (
                      <div key={stage.key} className="flex-1 relative">
                        <div className="flex flex-col items-center">
                          {/* Icon */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isCompleted ? stage.color : 'bg-gray-200'
                          } ${isCurrent ? `ring-4 ring-offset-2 ${stage.ringColor}` : ''} transition-all duration-300 shadow-lg`}>
                            <Icon className={`w-6 h-6 ${isCompleted ? 'text-white' : 'text-gray-400'}`} />
                          </div>
                          
                          {/* Label */}
                          <p className={`mt-2 text-sm font-medium ${
                            isCompleted ? stage.textColor : 'text-gray-500'
                          }`}>
                            {stage.label}
                          </p>
                        </div>

                        {/* Connector Line */}
                        {index < stages.length - 1 && (
                          <div className={`absolute top-6 left-1/2 w-full h-1 rounded-full transition-all duration-500 ${
                            index < currentStageIndex ? stage.color : 'bg-gray-200'
                          }`} style={{ transform: 'translateY(-50%)' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Details */}
              <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Items</p>
                  <p className="font-medium text-gray-900">{order.items?.length || 0} item(s)</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-medium text-gray-900">
                    {order.formattedAmount || `RWF ${Number(order.totalAmount || 0).toLocaleString()}`}
                  </p>
                </div>
                {order.driver && (
                  <div>
                    <p className="text-sm text-gray-600">Driver</p>
                    <p className="font-medium text-gray-900">{order.driver.name || `Driver #${order.driverId}`}</p>
                  </div>
                )}
                {order.vehicle && (
                  <div>
                    <p className="text-sm text-gray-600">Vehicle</p>
                    <p className="font-medium text-gray-900">{order.vehicle.plateNumber || `Vehicle #${order.vehicleId}`}</p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <Truck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No active deliveries</h3>
            <p className="text-gray-500">There are no active delivery orders to track at the moment.</p>
          </div>
        </Card>
      )}

      {selectedOrder && (
        <Modal 
          isOpen={showUpdateModal} 
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedOrder(null);
          }} 
          title="Update Order Status"
        >
          <UpdateOrderStatusForm 
            orderId={selectedOrder}
            currentStatus={activeOrders.find(o => o.id.toString() === selectedOrder)?.status || 'PENDING'}
            onClose={handleStatusUpdated} 
          />
        </Modal>
      )}
    </div>
  );
}