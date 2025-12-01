import { useState, useEffect } from 'react';
import { Truck, Clock, MapPin, Calendar, Users, Package } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ScheduleDispatchForm from '../../components/forms/ScheduleDispatchForm';
import CreateOrderForm from '../../components/forms/CreateOrderForm';
import AddVehicleForm from '../../components/forms/AddVehicleForm';
import { ordersService } from '../../services/ordersService';
import { formatOrderNumber, formatDate } from '../../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DispatchDashboard() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  
  // Sample data - replace with API calls
  const mockDrivers = [
    { id: 1, name: 'John Doe', status: 'available' },
    { id: 2, name: 'Jane Smith', status: 'on_duty' }
  ];
  
  const mockVehicles = [
    { id: 1, plateNumber: 'RAB 123A', type: 'Truck', status: 'available' },
    { id: 2, plateNumber: 'RAB 456B', type: 'Van', status: 'in_use' }
  ];
  
  const pendingOrders = orders.filter((o: any) => o.status === 'pending');
  const dispatchedOrders = orders.filter((o: any) => o.status === 'dispatched');
  const inTransitOrders = orders.filter((o: any) => o.status === 'in_transit');
  const availableDrivers = mockDrivers.filter((d: any) => d.status === 'available');
  const availableVehicles = mockVehicles.filter((v: any) => v.status === 'available');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await ordersService.getOrders();
        setOrders(response.data || []);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      }
    };
    fetchOrders();
  }, []);

  const openModal = (modalType: string) => setActiveModal(modalType);
  const closeModal = () => setActiveModal(null);

  const dailyDispatch = [
    { day: 'Mon', count: 12 },
    { day: 'Tue', count: 15 },
    { day: 'Wed', count: 10 },
    { day: 'Thu', count: 18 },
    { day: 'Fri', count: 14 },
    { day: 'Sat', count: 8 },
    { day: 'Sun', count: 5 },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Dispatch Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage deliveries and coordinate fleet operations</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => openModal('dispatch')} variant="primary">
            <Calendar className="w-5 h-5 mr-2" />
            Schedule Dispatch
          </Button>
          <Button onClick={() => openModal('order')} variant="secondary">
            <Package className="w-5 h-5 mr-2" />
            Create Order
          </Button>
          <Button onClick={() => openModal('vehicle')} variant="secondary">
            <Truck className="w-5 h-5 mr-2" />
            Create Vehicle
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="bg-gradient-to-br from-warning-500 to-warning-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-warning-100 mb-1">Pending</p>
              <p className="text-4xl font-bold">{pendingOrders.length}</p>
              <p className="text-sm text-warning-100 mt-2">To be assigned</p>
            </div>
            <Clock className="w-10 h-10 text-warning-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-accent-500 to-accent-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-accent-100 mb-1">Dispatched</p>
              <p className="text-4xl font-bold">{dispatchedOrders.length}</p>
              <p className="text-sm text-accent-100 mt-2">Ready to go</p>
            </div>
            <Truck className="w-10 h-10 text-accent-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-primary-100 mb-1">In Transit</p>
              <p className="text-4xl font-bold">{inTransitOrders.length}</p>
              <p className="text-sm text-primary-100 mt-2">On the way</p>
            </div>
            <MapPin className="w-10 h-10 text-primary-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-success-500 to-success-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-success-100 mb-1">Available Drivers</p>
              <p className="text-4xl font-bold">{availableDrivers.length}</p>
              <p className="text-sm text-success-100 mt-2">Ready to assign</p>
            </div>
            <Users className="w-10 h-10 text-success-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-gray-600 to-gray-700 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-100 mb-1">Available Vehicles</p>
              <p className="text-4xl font-bold">{availableVehicles.length}</p>
              <p className="text-sm text-gray-100 mt-2">Fleet ready</p>
            </div>
            <Truck className="w-10 h-10 text-gray-200" />
          </div>
        </Card>
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Weekly Dispatch Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyDispatch}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#FF8C42" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold text-gray-900">Available Resources</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-gray-900">Drivers Ready</p>
                <Badge variant="success">{availableDrivers.length} Available</Badge>
              </div>
              <div className="space-y-2">
                {mockDrivers.map((driver: any) => (
                  <div key={driver.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{driver.name}</span>
                    <Badge variant={driver.status === 'available' ? 'success' : 'gray'} size="sm">
                      {driver.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-gray-900">Vehicles Ready</p>
                <Badge variant="primary">{availableVehicles.length} Available</Badge>
              </div>
              <div className="space-y-2">
                {mockVehicles.slice(0, 3).map((vehicle: any) => (
                  <div key={vehicle.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{vehicle.plateNumber} - {vehicle.type}</span>
                    <Badge variant={vehicle.status === 'available' ? 'success' : vehicle.status === 'in_use' ? 'warning' : 'error'} size="sm">
                      {vehicle.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Assignments */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-semibold text-gray-900">Pending Dispatch Assignments</h3>
          <Badge variant="warning">{pendingOrders.length} Orders</Badge>
        </div>
        <div className="space-y-3">
          {pendingOrders.map((order: any) => (
            <div key={order.id} className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <code className="font-medium bg-white px-2 py-1 rounded text-primary-700">
                      {formatOrderNumber(order.id)}
                    </code>
                    <Badge variant={order.priority === 'high' ? 'error' : order.priority === 'medium' ? 'warning' : 'gray'}>
                      {order.priority} priority
                    </Badge>
                  </div>
                  <p className="font-medium text-gray-900">{order.customerName}</p>
                  <p className="text-sm text-gray-600 mt-1">{order.deliveryAddress}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {order.items.length} items • Created {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm">
                    Assign Driver
                  </Button>
                  <Button variant="secondary" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Active Dispatches */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-semibold text-gray-900">Active Dispatches</h3>
          <Badge variant="primary">{inTransitOrders.length + dispatchedOrders.length} Active</Badge>
        </div>
        <div className="space-y-3">
          {[...dispatchedOrders, ...inTransitOrders].map((order: any) => (
            <div key={order.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <code className="font-medium bg-white px-2 py-1 rounded text-primary-700">
                      {formatOrderNumber(order.id)}
                    </code>
                    <Badge variant={order.status === 'in_transit' ? 'primary' : 'warning'}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="font-medium text-gray-900">{order.customerName}</p>
                  <p className="text-sm text-gray-600">Driver #{order.driverId} • Vehicle #{order.vehicleId}</p>
                </div>
                <Button variant="ghost" size="sm">
                  <MapPin className="w-4 h-4 mr-1" />
                  Track
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modals */}
      <Modal isOpen={activeModal === 'dispatch'} onClose={closeModal} title="Schedule Dispatch">
        <ScheduleDispatchForm onClose={closeModal} />
      </Modal>

      <Modal isOpen={activeModal === 'order'} onClose={closeModal} title="Create Order">
        <CreateOrderForm onClose={closeModal} />
      </Modal>

      <Modal isOpen={activeModal === 'vehicle'} onClose={closeModal} title="Create Vehicle">
        <AddVehicleForm onClose={closeModal} />
      </Modal>
    </div>
  );
}