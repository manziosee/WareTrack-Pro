import { useState } from 'react';
import { Plus, Truck, Calendar, Package } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ScheduleDispatchForm from '../components/forms/ScheduleDispatchForm';
import CreateOrderForm from '../components/forms/CreateOrderForm';
import AddVehicleForm from '../components/forms/AddVehicleForm';
import { useAuth } from '../context/AuthContext';

const Dispatch = () => {
  const { user } = useAuth();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const openModal = (modalType: string) => setActiveModal(modalType);
  const closeModal = () => setActiveModal(null);

  const dispatches = [
    { id: 1, orderNumber: 'ORD-001', driver: 'John Doe', vehicle: 'TRK-001', status: 'In Transit', destination: 'Downtown' },
    { id: 2, orderNumber: 'ORD-002', driver: 'Jane Smith', vehicle: 'TRK-002', status: 'Scheduled', destination: 'Uptown' },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dispatch Management</h1>
        <div className="flex gap-3">
          <Button onClick={() => openModal('schedule')} className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule Dispatch
          </Button>
          <Button onClick={() => openModal('order')} className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Create Order
          </Button>
          <Button onClick={() => openModal('vehicle')} className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* Dispatch List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Dispatches</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dispatches.map((dispatch) => (
                <tr key={dispatch.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dispatch.orderNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dispatch.driver}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dispatch.vehicle}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dispatch.destination}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      dispatch.status === 'In Transit' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {dispatch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={activeModal === 'schedule'} onClose={closeModal} title="Schedule Dispatch">
        <ScheduleDispatchForm onClose={closeModal} />
      </Modal>

      <Modal isOpen={activeModal === 'order'} onClose={closeModal} title="Create Order">
        <CreateOrderForm onClose={closeModal} />
      </Modal>

      <Modal isOpen={activeModal === 'vehicle'} onClose={closeModal} title="Add Vehicle">
        <AddVehicleForm onClose={closeModal} />
      </Modal>
    </div>
  );
};

export default Dispatch;