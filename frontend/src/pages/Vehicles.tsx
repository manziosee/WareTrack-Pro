import { useState, useEffect } from 'react';
import { Plus, Edit, Wrench, Eye, Trash2, Truck, Package, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import SearchFilter from '@/components/ui/SearchFilter';
import AddVehicleForm from '@/components/forms/AddVehicleForm';
import EditVehicleForm from '@/components/forms/EditVehicleForm';
import ScheduleMaintenanceForm from '@/components/forms/ScheduleMaintenanceForm';
import { vehiclesService } from '@/services/vehiclesService';
import { formatDate } from '@/utils/formatters';
import { exportToCSV, exportToPDF, exportToJSON } from '@/utils/exportUtils';
import toast from 'react-hot-toast';

export default function Vehicles() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const vehiclesData = await vehiclesService.getVehicles();
      setVehicles(vehiclesData.data || []);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setFilteredVehicles(vehicles);
  }, [vehicles]);

  const handleSearch = (searchTerm: string) => {
    const filtered = vehicles.filter(vehicle =>
      vehicle.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredVehicles(filtered);
  };

  const handleFilter = (filters: any) => {
    let filtered = [...vehicles];
    
    if (filters.status) {
      filtered = filtered.filter(vehicle => vehicle.status === filters.status);
    }
    if (filters.type) {
      filtered = filtered.filter(vehicle => vehicle.type === filters.type);
    }
    
    setFilteredVehicles(filtered);
  };

  const handleExport = (format: 'csv' | 'pdf' | 'json') => {
    const exportData = filteredVehicles.map(vehicle => ({
      'Plate Number': vehicle.plateNumber,
      Type: vehicle.type,
      'Capacity (kg)': vehicle.capacity,
      Status: vehicle.status,
      'Last Maintenance': vehicle.lastMaintenance ? formatDate(vehicle.lastMaintenance) : 'Never'
    }));

    switch (format) {
      case 'csv':
        exportToCSV(exportData, 'vehicles');
        break;
      case 'pdf':
        exportToPDF(exportData, 'vehicles', 'Vehicles Report');
        break;
      case 'json':
        exportToJSON(exportData, 'vehicles');
        break;
    }
    toast.success(`Vehicles exported as ${format.toUpperCase()}`);
  };

  const handleEdit = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setShowEditModal(true);
  };

  const handleScheduleMaintenance = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setShowMaintenanceModal(true);
  };

  const handleView = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setShowViewModal(true);
  };

  const handleDelete = async (vehicle: any) => {
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

  const handleSave = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowMaintenanceModal(false);
    setSelectedVehicle(null);
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'AVAILABLE': return 'success';
      case 'IN_USE': return 'warning';
      case 'MAINTENANCE': return 'error';
      case 'UNAVAILABLE': return 'gray';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with orange theme */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Truck className="w-8 h-8 text-orange-600" />
            </div>
            Vehicle Fleet Management
          </h1>
          <p className="text-gray-600 mt-1">Manage your delivery fleet and maintenance schedules</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-5 h-5 mr-2" />
          Add Vehicle
        </Button>
      </div>

      {/* Stats Cards with orange theme */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 font-medium">Total Fleet</p>
              <p className="text-3xl font-bold text-orange-900">{vehicles.length}</p>
            </div>
            <Truck className="w-10 h-10 text-orange-600" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Available</p>
              <p className="text-3xl font-bold text-green-900">
                {vehicles.filter(v => v.status === 'AVAILABLE').length}
              </p>
            </div>
            <Package className="w-10 h-10 text-green-600" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">In Use</p>
              <p className="text-3xl font-bold text-yellow-900">
                {vehicles.filter(v => v.status === 'IN_USE').length}
              </p>
            </div>
            <Truck className="w-10 h-10 text-yellow-600" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium">Maintenance</p>
              <p className="text-3xl font-bold text-red-900">
                {vehicles.filter(v => v.status === 'MAINTENANCE').length}
              </p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        onSearch={handleSearch}
        onFilter={handleFilter}
        onExport={handleExport}
        showDateRange={false}
        filterOptions={[
          {
            label: 'Status',
            value: 'status',
            options: [
              { label: 'Available', value: 'AVAILABLE' },
              { label: 'In Use', value: 'IN_USE' },
              { label: 'Maintenance', value: 'MAINTENANCE' },
              { label: 'Unavailable', value: 'UNAVAILABLE' }
            ]
          },
          {
            label: 'Type',
            value: 'type',
            options: [
              { label: 'Truck', value: 'Truck' },
              { label: 'Van', value: 'Van' },
              { label: 'Motorcycle', value: 'Motorcycle' },
              { label: 'Car', value: 'Car' }
            ]
          }
        ]}
      />

      {/* Vehicles Table with orange accents */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-orange-900 uppercase tracking-wider">Plate Number</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-orange-900 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-orange-900 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-orange-900 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-orange-900 uppercase tracking-wider">Last Maintenance</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-orange-900 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVehicles.map((vehicle: any) => (
                <tr key={vehicle.id} className="hover:bg-orange-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                        <Truck className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">{vehicle.plateNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 font-medium">{vehicle.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 font-medium">{vehicle.capacity} kg</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusBadge(vehicle.status)}>
                      {vehicle.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vehicle.lastMaintenance ? formatDate(vehicle.lastMaintenance) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleView(vehicle)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(vehicle)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit vehicle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleScheduleMaintenance(vehicle)}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Schedule maintenance"
                      >
                        <Wrench className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(vehicle)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete vehicle"
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

      {/* Modals */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Vehicle">
        <AddVehicleForm onClose={() => setShowAddModal(false)} onSave={handleSave} />
      </Modal>

      {selectedVehicle && (
        <>
          <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedVehicle(null); }} title="Edit Vehicle">
            <EditVehicleForm vehicle={selectedVehicle} onClose={() => { setShowEditModal(false); setSelectedVehicle(null); }} onSave={handleSave} />
          </Modal>

          <Modal isOpen={showMaintenanceModal} onClose={() => { setShowMaintenanceModal(false); setSelectedVehicle(null); }} title="Schedule Maintenance">
            <ScheduleMaintenanceForm vehicle={selectedVehicle} onClose={() => { setShowMaintenanceModal(false); setSelectedVehicle(null); }} onSave={handleSave} />
          </Modal>

          <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedVehicle(null); }} title="Vehicle Details">
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Truck className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedVehicle.plateNumber}</h3>
                  <Badge variant={getStatusBadge(selectedVehicle.status)}>
                    {selectedVehicle.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-orange-700 mb-1">Type</label>
                  <p className="text-lg font-semibold text-orange-900">{selectedVehicle.type}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-orange-700 mb-1">Capacity</label>
                  <p className="text-lg font-semibold text-orange-900">{selectedVehicle.capacity} kg</p>
                </div>
                {selectedVehicle.model && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-orange-700 mb-1">Model</label>
                    <p className="text-lg font-semibold text-orange-900">{selectedVehicle.model}</p>
                  </div>
                )}
                {selectedVehicle.year && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-orange-700 mb-1">Year</label>
                    <p className="text-lg font-semibold text-orange-900">{selectedVehicle.year}</p>
                  </div>
                )}
                <div className="bg-orange-50 p-4 rounded-lg col-span-2">
                  <label className="block text-sm font-medium text-orange-700 mb-1">Last Maintenance</label>
                  <p className="text-lg font-semibold text-orange-900">
                    {selectedVehicle.lastMaintenance ? formatDate(selectedVehicle.lastMaintenance) : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
