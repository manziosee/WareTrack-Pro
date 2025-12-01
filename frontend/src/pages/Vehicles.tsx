import { useState } from 'react';
import { Plus, Edit, Wrench } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import AddVehicleForm from '@/components/forms/AddVehicleForm';
import AddDriverForm from '@/components/forms/AddDriverForm';
import EditVehicleForm from '@/components/forms/EditVehicleForm';
import ScheduleMaintenanceForm from '@/components/forms/ScheduleMaintenanceForm';

import { formatDate } from '@/utils/formatters';

export default function Vehicles() {
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  
  // Sample data - replace with API calls
  const vehicles = [
    { id: 1, plateNumber: 'RAB 123A', type: 'Truck', capacity: 5000, status: 'available', lastMaintenance: '2024-01-15' },
    { id: 2, plateNumber: 'RAB 456B', type: 'Van', capacity: 2000, status: 'in_use', lastMaintenance: '2024-01-10' }
  ];
  
  const drivers = [
    { id: 1, name: 'John Doe', licenseNumber: 'DL123456', phone: '+250788123456', status: 'available', currentVehicleId: null },
    { id: 2, name: 'Jane Smith', licenseNumber: 'DL789012', phone: '+250788789012', status: 'on_duty', currentVehicleId: 2 }
  ];
  
  

  const handleEditVehicle = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setShowEditVehicleModal(true);
  };

  const handleScheduleMaintenance = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setShowMaintenanceModal(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'in_use': return 'warning';
      case 'maintenance': return 'error';
      case 'unavailable': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Vehicle & Driver Management</h1>
          <p className="text-gray-600 mt-1">Manage fleet and driver assignments</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowAddDriverModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Add Driver
          </Button>
          <Button variant="primary" onClick={() => setShowAddVehicleModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* Vehicles Section */}
      <div>
        <h2 className="font-heading text-xl font-semibold text-gray-900 mb-4">Vehicles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {vehicles.map((vehicle: any) => (
            <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Plate Number</p>
                  <p className="text-lg font-bold text-gray-900">{vehicle.plateNumber}</p>
                </div>
                <Badge variant={getStatusBadgeVariant(vehicle.status)}>
                  {vehicle.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-gray-900">{vehicle.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Capacity:</span>
                  <span className="font-medium text-gray-900">{vehicle.capacity} kg</span>
                </div>
                {vehicle.lastMaintenance && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Maintenance:</span>
                    <span className="font-medium text-gray-900">{formatDate(vehicle.lastMaintenance)}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleEditVehicle(vehicle)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="warning" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleScheduleMaintenance(vehicle)}
                >
                  <Wrench className="w-4 h-4 mr-1" />
                  Maintain
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Drivers Section */}
      <div>
        <h2 className="font-heading text-xl font-semibold text-gray-900 mb-4">Drivers</h2>
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {drivers.map((driver: any) => (
                  <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-medium mr-3">
                          {driver.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">{driver.licenseNumber}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{driver.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={driver.status === 'available' ? 'success' : driver.status === 'on_duty' ? 'warning' : 'gray'}>
                        {driver.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {driver.currentVehicleId ? vehicles.find((v: any) => v.id === driver.currentVehicleId)?.plateNumber : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal isOpen={showAddVehicleModal} onClose={() => setShowAddVehicleModal(false)} title="Add New Vehicle">
        <AddVehicleForm onClose={() => setShowAddVehicleModal(false)} />
      </Modal>

      <Modal isOpen={showAddDriverModal} onClose={() => setShowAddDriverModal(false)} title="Add New Driver">
        <AddDriverForm onClose={() => setShowAddDriverModal(false)} />
      </Modal>

      {selectedVehicle && (
        <>
          <Modal 
            isOpen={showEditVehicleModal} 
            onClose={() => {
              setShowEditVehicleModal(false);
              setSelectedVehicle(null);
            }} 
            title="Edit Vehicle"
          >
            <EditVehicleForm 
              vehicle={selectedVehicle} 
              onClose={() => {
                setShowEditVehicleModal(false);
                setSelectedVehicle(null);
              }} 
            />
          </Modal>

          <Modal 
            isOpen={showMaintenanceModal} 
            onClose={() => {
              setShowMaintenanceModal(false);
              setSelectedVehicle(null);
            }} 
            title="Schedule Maintenance"
          >
            <ScheduleMaintenanceForm 
              vehicle={selectedVehicle} 
              onClose={() => {
                setShowMaintenanceModal(false);
                setSelectedVehicle(null);
              }} 
            />
          </Modal>
        </>
      )}
    </div>
  );
}