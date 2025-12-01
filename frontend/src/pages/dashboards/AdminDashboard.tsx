import { useState } from 'react';
import { Package, Truck, Clock, CheckCircle, AlertTriangle, Users as UsersIcon } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Complete overview of all operations and system metrics</p>
        </div>
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <button 
            onClick={() => openModal('user')} 
            className="flex items-center gap-1 sm:gap-2 bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            <UsersIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Add User</span>
            <span className="sm:hidden">User</span>
          </button>
          <button 
            onClick={() => openModal('item')} 
            className="flex items-center gap-1 sm:gap-2 bg-green-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Add Item</span>
            <span className="sm:hidden">Item</span>
          </button>
          <button 
            onClick={() => openModal('order')} 
            className="flex items-center gap-1 sm:gap-2 bg-purple-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Create Order</span>
            <span className="sm:hidden">Order</span>
          </button>
          <button 
            onClick={() => openModal('dispatch')} 
            className="flex items-center gap-1 sm:gap-2 bg-yellow-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors text-sm"
          >
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Schedule Dispatch</span>
            <span className="sm:hidden">Dispatch</span>
          </button>
          <button 
            onClick={() => openModal('vehicle')} 
            className="flex items-center gap-1 sm:gap-2 bg-indigo-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors text-sm"
          >
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Add Vehicle</span>
            <span className="sm:hidden">Vehicle</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-green-600 mt-1 sm:mt-2">{stat.change} from last week</p>
              </div>
              <div className={`${stat.color} p-2 sm:p-3 rounded-lg flex-shrink-0`}>
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <button 
            onClick={() => openModal('user')} 
            className="p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
          >
            <UsersIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mb-2" />
            <p className="font-medium text-gray-900 text-sm sm:text-base">Add User</p>
            <p className="text-xs text-gray-600 mt-1 hidden sm:block">Create new user</p>
          </button>
          <button 
            onClick={() => openModal('item')} 
            className="p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
          >
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mb-2" />
            <p className="font-medium text-gray-900 text-sm sm:text-base">Add Item</p>
            <p className="text-xs text-gray-600 mt-1 hidden sm:block">New inventory</p>
          </button>
          <button 
            onClick={() => openModal('order')} 
            className="p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
          >
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mb-2" />
            <p className="font-medium text-gray-900 text-sm sm:text-base">Create Order</p>
            <p className="text-xs text-gray-600 mt-1 hidden sm:block">New delivery</p>
          </button>
          <button 
            onClick={() => openModal('dispatch')} 
            className="p-3 sm:p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-left"
          >
            <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 mb-2" />
            <p className="font-medium text-gray-900 text-sm sm:text-base">Schedule Dispatch</p>
            <p className="text-xs text-gray-600 mt-1 hidden sm:block">Plan delivery</p>
          </button>
          <button 
            onClick={() => openModal('vehicle')} 
            className="p-3 sm:p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-left"
          >
            <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 mb-2" />
            <p className="font-medium text-gray-900 text-sm sm:text-base">Add Vehicle</p>
            <p className="text-xs text-gray-600 mt-1 hidden sm:block">Fleet management</p>
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