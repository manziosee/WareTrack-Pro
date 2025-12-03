import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Truck, Package, Edit } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import UpdateOrderStatusForm from '@/components/forms/UpdateOrderStatusForm';
import { ordersService } from '@/services/ordersService';
import { formatOrderNumber, formatDateTime } from '@/utils/formatters';

export default function Tracking() {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveOrders = async () => {
      try {
        const response = await ordersService.getOrders();
        const orders = response.data || [];
        setActiveOrders(orders.filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'));
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveOrders();
  }, []);

  const handleUpdateStatus = (orderId: number) => {
    setSelectedOrder(orderId.toString());
    setShowUpdateModal(true);
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
    { key: 'PENDING', label: 'Pending', color: 'bg-gray-500', textColor: 'text-gray-700' },
    { key: 'DISPATCHED', label: 'Dispatched', color: 'bg-orange-500', textColor: 'text-orange-700' },
    { key: 'IN_TRANSIT', label: 'In Transit', color: 'bg-blue-500', textColor: 'text-blue-700' },
    { key: 'DELIVERED', label: 'Delivered', color: 'bg-green-500', textColor: 'text-green-700' },
  ];

  const getCurrentStageIndex = (status: string) => {
    return stages.findIndex(s => s.key === status);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-gray-900">Delivery Tracking</h1>
        <p className="text-gray-600 mt-1">Real-time tracking of delivery orders</p>
      </div>

      {/* Active Deliveries */}
      <div className="space-y-4">
        {activeOrders.map((order) => {
          const currentStageIndex = getCurrentStageIndex(order.status);

          return (
            <Card key={order.id}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-bold bg-primary-50 text-primary-700 px-3 py-1 rounded">
                      {formatOrderNumber(order.id)}
                    </code>
                    <Badge variant={order.priority === 'high' ? 'error' : order.priority === 'medium' ? 'warning' : 'gray'}>
                      {order.priority} priority
                    </Badge>
                  </div>
                  <p className="text-gray-900 font-medium mt-2">{order.customerName}</p>
                  <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                </div>
                <div className="text-right">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleUpdateStatus(order.id)}
                    className="mb-2"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Update Status
                  </Button>
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
                          } ${isCurrent ? 'ring-4 ring-offset-2 ring-opacity-30' : ''} transition-all duration-300 shadow-lg`}>
                            <Icon className={`w-6 h-6 ${isCompleted ? 'text-white' : 'text-gray-400'}`} />
                          </div>
                          
                          {/* Label */}
                          <p className={`mt-2 text-sm font-medium ${
                            isCompleted ? stage.textColor : 'text-gray-500'
                          }`}>
                            {stage.label}
                          </p>
                          
                          {/* Timestamp */}
                          {isCompleted && (
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDateTime(order.createdAt)}
                            </p>
                          )}
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
              <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Items</p>
                  <p className="font-medium text-gray-900">{order.items.length} item(s)</p>
                </div>
                {order.driverId && (
                  <div>
                    <p className="text-sm text-gray-600">Driver</p>
                    <p className="font-medium text-gray-900">Driver #{order.driverId}</p>
                  </div>
                )}
                {order.vehicleId && (
                  <div>
                    <p className="text-sm text-gray-600">Vehicle</p>
                    <p className="font-medium text-gray-900">Vehicle #{order.vehicleId}</p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

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
            currentStatus={activeOrders.find(o => o.id.toString() === selectedOrder)?.status || 'pending'}
            onClose={() => {
              setShowUpdateModal(false);
              setSelectedOrder(null);
            }} 
          />
        </Modal>
      )}
    </div>
  );
}