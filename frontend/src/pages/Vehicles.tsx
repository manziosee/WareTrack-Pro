import { useState, useEffect } from 'react';
import { Plus, Edit, Wrench, Eye, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import AddVehicleForm from '@/components/forms/AddVehicleForm';
import AddDriverForm from '@/components/forms/AddDriverForm';
import EditVehicleForm from '@/components/forms/EditVehicleForm';
import EditDriverForm from '@/components/forms/EditDriverForm';
import ScheduleMaintenanceForm from '@/components/forms/ScheduleMaintenanceForm';
import { vehiclesService } from '@/services/vehiclesService';
import { driversService } from '@/services/driversService';
import { formatDate } from '@/utils/formatters';
import toast from 'react-hot-toast';

export default function Vehicles() {
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showViewVehicleModal, setShowViewVehicleModal] = useState(false);
  const [showViewDriverModal, setShowViewDriverModal] = useState(false);
  const [showEditDriverModal, setShowEditDriverModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vehiclesData, driversData] = await Promise.all([
        vehiclesService.getVehicles(),
        driversService.getDrivers()
      ]);
      setVehicles(vehiclesData.data || []);
      setDrivers(driversData.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load vehicles and drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  

  const handleEditVehicle = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setShowEditVehicleModal(true);
  };

  const handleScheduleMaintenance = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setShowMaintenanceModal(true);
  };

  const handleViewVehicle = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setShowViewVehicleModal(true);
  };

  const handleDeleteVehicle = async (vehicle: any) => {
    if (window.confirm(`Are you sure you want to delete vehicle ${vehicle.plateNumber}?`)) {
      try {
        await vehiclesService.deleteVehicle(vehicle.id);
        toast.success('Vehicle deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete vehicle');
      }
    }
  };

  const handleViewDriver = (driver: any) => {
    setSelectedDriver(driver);
    setShowViewDriverModal(true);
  };

  const handleEditDriver = (driver: any) => {
    setSelectedDriver(driver);
    setShowEditDriverModal(true);
  };

  const handleDeleteDriver = async (driver: any) => {
    if (window.confirm(`Are you sure you want to delete driver ${driver.name}?`)) {
      try {
        await driversService.deleteDriver(driver.id);
        toast.success('Driver deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete driver');
      }
    }
  };

  const handleSaveDriver = () => {
    setShowAddDriverModal(false);
    setShowEditDriverModal(false);
    setSelectedDriver(null);
    fetchData();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toUpperCase()) {
      case 'AVAILABLE': return 'success';
      case 'IN_USE': return 'warning';
      case 'MAINTENANCE': return 'error';
      case 'UNAVAILABLE': return 'gray';
      default: return 'gray';
    }
  };

  const handleSaveVehicle = () => {
    setShowAddVehicleModal(false);
    setShowEditVehicleModal(false);
    setSelectedVehicle(null);
    fetchData();
  };



  const handleSaveMaintenance = () => {
    setShowMaintenanceModal(false);
    setSelectedVehicle(null);
    fetchData();
  };

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
          <h1 className="font-heading text-3xl font-bold text-gray-900">Fleet & Driver Management</h1>
          <p className="text-gray-600 mt-1">Manage your vehicles and drivers. Drivers created here will be assigned to you as their manager.</p>
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
        <h2 className="font-heading text-xl font-semibold text-gray-900 mb-4">Your Fleet</h2>
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
              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-200">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleViewVehicle(vehicle)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => handleEditVehicle(vehicle)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="warning" 
                  size="sm" 
                  onClick={() => handleScheduleMaintenance(vehicle)}
                >
                  <Wrench className="w-4 h-4 mr-1" />
                  Maintain
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDeleteVehicle(vehicle)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Drivers Section */}
      <div>
        <h2 className="font-heading text-xl font-semibold text-gray-900 mb-4">Your Drivers</h2>
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
                      <Badge variant={driver.status === 'AVAILABLE' ? 'success' : driver.status === 'ON_DUTY' ? 'warning' : 'gray'}>
                        {driver.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {driver.currentVehicleId ? vehicles.find((v: any) => v.id === driver.currentVehicleId)?.plateNumber : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleViewDriver(driver)}
                          className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="View driver details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditDriver(driver)}
                          className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Edit driver"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteDriver(driver)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete driver"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal isOpen={showAddVehicleModal} onClose={() => setShowAddVehicleModal(false)} title="Add New Vehicle">
        <AddVehicleForm onClose={() => setShowAddVehicleModal(false)} onSave={handleSaveVehicle} />
      </Modal>

      <Modal isOpen={showAddDriverModal} onClose={() => setShowAddDriverModal(false)} title="Add New Driver">
        <AddDriverForm onClose={() => setShowAddDriverModal(false)} onSave={handleSaveDriver} />
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
              onSave={handleSaveVehicle}
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
              onSave={handleSaveMaintenance}
            />
          </Modal>

          <Modal 
            isOpen={showViewVehicleModal} 
            onClose={() => {
              setShowViewVehicleModal(false);
              setSelectedVehicle(null);
            }} 
            title="Vehicle Details"
          >
            {selectedVehicle && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plate Number</label>
                    <p className="text-lg font-semibold">{selectedVehicle.plateNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="text-lg">{selectedVehicle.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Capacity</label>
                    <p className="text-lg">{selectedVehicle.capacity} kg</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <Badge variant={getStatusBadgeVariant(selectedVehicle.status)}>
                      {selectedVehicle.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {selectedVehicle.model && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Model</label>
                      <p className="text-lg">{selectedVehicle.model}</p>
                    </div>
                  )}
                  {selectedVehicle.year && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Year</label>
                      <p className="text-lg">{selectedVehicle.year}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Modal>
        </>
      )}

      {selectedDriver && (
        <Modal 
          isOpen={showViewDriverModal} 
          onClose={() => {
            setShowViewDriverModal(false);
            setSelectedDriver(null);
          }} 
          title="Driver Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-lg font-semibold">{selectedDriver.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">License Number</label>
                <p className="text-lg">{selectedDriver.licenseNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="text-lg">{selectedDriver.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <Badge variant={selectedDriver.status === 'AVAILABLE' ? 'success' : selectedDriver.status === 'ON_DUTY' ? 'warning' : 'gray'}>
                  {selectedDriver.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Vehicle</label>
                <p className="text-lg">
                  {selectedDriver.currentVehicleId 
                    ? vehicles.find((v: any) => v.id === selectedDriver.currentVehicleId)?.plateNumber || 'Unknown Vehicle'
                    : 'No vehicle assigned'
                  }
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <Modal isOpen={showEditDriverModal} onClose={() => setShowEditDriverModal(false)} title="Edit Driver">
        {selectedDriver && (
          <EditDriverForm 
            driver={selectedDriver} 
            onClose={() => {
              setShowEditDriverModal(false);
              setSelectedDriver(null);
            }}
            onSave={handleSaveDriver}
          />
        )}
      </Modal>
    </div>
  );
}