import { useState } from 'react';
import { Package, Truck, Clock, CheckCircle, AlertTriangle, Users as UsersIcon, TrendingUp } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import AddUserForm from '../../components/forms/AddUserForm';
import AddInventoryForm from '../../components/forms/AddInventoryForm';
import CreateOrderForm from '../../components/forms/CreateOrderForm';
import ScheduleDispatchForm from '../../components/forms/ScheduleDispatchForm';
import AddVehicleForm from '../../components/forms/AddVehicleForm';

export default function AdminDashboard() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const openModal = (modalType: string) => {
    console.log('Opening modal:', modalType);
    setActiveModal(modalType);
  };
  const closeModal = () => setActiveModal(null);

  const statCards = [
    { label: 'Total Inventory', value: 155, icon: Package, color: 'bg-blue-500', change: '+12%' },
    { label: 'Deliveries Today', value: 23, icon: CheckCircle, color: 'bg-green-500', change: '+5%' },
    { label: 'Pending Dispatches', value: 8, icon: Clock, color: 'bg-yellow-500', change: '-2%' },
    { label: 'In Transit', value: 15, icon: Truck, color: 'bg-purple-500', change: '+8%' },
    { label: 'Low Stock Alerts', value: 4, icon: AlertTriangle, color: 'bg-red-500', change: '+1' },
    { label: 'Active Users', value: 12, icon: UsersIcon, color: 'bg-indigo-500', change: '0' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Complete overview of all operations and system metrics</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button 
            onClick={() => openModal('user')} 
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <UsersIcon className="w-4 h-4" />
            Add User
          </button>
          <button 
            onClick={() => openModal('item')} 
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            <Package className="w-4 h-4" />
            Add Item
          </button>
          <button 
            onClick={() => openModal('order')} 
            className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Create Order
          </button>
          <button 
            onClick={() => openModal('dispatch')} 
            className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            <Truck className="w-4 h-4" />
            Schedule Dispatch
          </button>
          <button 
            onClick={() => openModal('vehicle')} 
            className="flex items-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Truck className="w-4 h-4" />
            Add Vehicle
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-green-600 mt-2">{stat.change} from last week</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <button 
            onClick={() => openModal('user')} 
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
          >
            <UsersIcon className="w-8 h-8 text-blue-600 mb-2" />
            <p className="font-medium text-gray-900">Add User</p>
            <p className="text-xs text-gray-600 mt-1">Create new user</p>
          </button>
          <button 
            onClick={() => openModal('item')} 
            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
          >
            <Package className="w-8 h-8 text-green-600 mb-2" />
            <p className="font-medium text-gray-900">Add Item</p>
            <p className="text-xs text-gray-600 mt-1">New inventory</p>
          </button>
          <button 
            onClick={() => openModal('order')} 
            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
          >
            <CheckCircle className="w-8 h-8 text-purple-600 mb-2" />
            <p className="font-medium text-gray-900">Create Order</p>
            <p className="text-xs text-gray-600 mt-1">New delivery</p>
          </button>
          <button 
            onClick={() => openModal('dispatch')} 
            className="p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-left"
          >
            <Truck className="w-8 h-8 text-yellow-600 mb-2" />
            <p className="font-medium text-gray-900">Schedule Dispatch</p>
            <p className="text-xs text-gray-600 mt-1">Plan delivery</p>
          </button>
          <button 
            onClick={() => openModal('vehicle')} 
            className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-left"
          >
            <Truck className="w-8 h-8 text-indigo-600 mb-2" />
            <p className="font-medium text-gray-900">Add Vehicle</p>
            <p className="text-xs text-gray-600 mt-1">Fleet management</p>
          </button>
        </div>
      </div>



      {/* Modals */}
      <Modal isOpen={activeModal === 'user'} onClose={closeModal} title="Add New User">
        <AddUserForm onClose={closeModal} />
      </Modal>

      <Modal isOpen={activeModal === 'item'} onClose={closeModal} title="Add Inventory Item">
        <AddInventoryForm onClose={closeModal} />
      </Modal>

      <Modal isOpen={activeModal === 'order'} onClose={closeModal} title="Create Order">
        <CreateOrderForm onClose={closeModal} />
      </Modal>

      <Modal isOpen={activeModal === 'dispatch'} onClose={closeModal} title="Schedule Dispatch">
        <ScheduleDispatchForm onClose={closeModal} />
      </Modal>

      <Modal isOpen={activeModal === 'vehicle'} onClose={closeModal} title="Add Vehicle">
        <AddVehicleForm onClose={closeModal} />
      </Modal>
    </div>
  );
}