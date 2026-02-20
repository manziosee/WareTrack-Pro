import { useState, useEffect } from 'react';
import { Plus, Edit, Eye, Trash2, User, Phone, Award, TrendingUp } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import SearchFilter from '@/components/ui/SearchFilter';
import AddDriverForm from '@/components/forms/AddDriverForm';
import EditDriverForm from '@/components/forms/EditDriverForm';
import { driversService } from '@/services/driversService';
import { vehiclesService } from '@/services/vehiclesService';
import { exportToCSV, exportToPDF, exportToJSON } from '@/utils/exportUtils';
import toast from 'react-hot-toast';

export default function Drivers() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [driversData, vehiclesData] = await Promise.all([
        driversService.getDrivers(),
        vehiclesService.getVehicles()
      ]);
      setDrivers(driversData.data || []);
      setVehicles(vehiclesData.data || []);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
      toast.error('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setFilteredDrivers(drivers);
  }, [drivers]);

  const handleSearch = (searchTerm: string) => {
    const filtered = drivers.filter(driver =>
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDrivers(filtered);
  };

  const handleFilter = (filters: any) => {
    let filtered = [...drivers];
    
    if (filters.status) {
      filtered = filtered.filter(driver => driver.status === filters.status);
    }
    
    setFilteredDrivers(filtered);
  };

  const handleExport = (format: 'csv' | 'pdf' | 'json') => {
    const exportData = filteredDrivers.map(driver => ({
      Name: driver.name,
      'License Number': driver.licenseNumber,
      Phone: driver.phone,
      Status: driver.status,
      'Current Vehicle': vehicles.find((v: any) => v.id === driver.currentVehicleId)?.plateNumber || 'None'
    }));

    switch (format) {
      case 'csv':
        exportToCSV(exportData, 'drivers');
        break;
      case 'pdf':
        exportToPDF(exportData, 'drivers', 'Drivers Report');
        break;
      case 'json':
        exportToJSON(exportData, 'drivers');
        break;
    }
    toast.success(`Drivers exported as ${format.toUpperCase()}`);
  };

  const handleView = (driver: any) => {
    setSelectedDriver(driver);
    setShowViewModal(true);
  };

  const handleEdit = (driver: any) => {
    setSelectedDriver(driver);
    setShowEditModal(true);
  };

  const handleDelete = async (driver: any) => {
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

  const handleSave = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedDriver(null);
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'AVAILABLE': return 'success';
      case 'ON_DUTY': return 'warning';
      case 'OFF_DUTY': return 'gray';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with blue theme */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            Driver Management
          </h1>
          <p className="text-gray-600 mt-1">Manage your delivery drivers and their assignments</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-5 h-5 mr-2" />
          Add Driver
        </Button>
      </div>

      {/* Stats Cards with blue theme */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Total Drivers</p>
              <p className="text-3xl font-bold text-blue-900">{drivers.length}</p>
            </div>
            <User className="w-10 h-10 text-blue-600" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Available</p>
              <p className="text-3xl font-bold text-green-900">
                {drivers.filter(d => d.status === 'AVAILABLE').length}
              </p>
            </div>
            <Award className="w-10 h-10 text-green-600" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">On Duty</p>
              <p className="text-3xl font-bold text-yellow-900">
                {drivers.filter(d => d.status === 'ON_DUTY').length}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-yellow-600" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 font-medium">Off Duty</p>
              <p className="text-3xl font-bold text-gray-900">
                {drivers.filter(d => d.status === 'OFF_DUTY').length}
              </p>
            </div>
            <User className="w-10 h-10 text-gray-600" />
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
              { label: 'On Duty', value: 'ON_DUTY' },
              { label: 'Off Duty', value: 'OFF_DUTY' }
            ]
          }
        ]}
      />

      {/* Drivers Grid with blue accents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrivers.map((driver: any) => (
          <Card key={driver.id} className="hover:shadow-xl transition-all border-l-4 border-l-blue-500">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {driver.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{driver.name}</p>
                  <Badge variant={getStatusBadge(driver.status)}>
                    {driver.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Award className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">License:</span>
                <code className="bg-blue-50 px-2 py-1 rounded text-blue-700 font-mono text-xs">
                  {driver.licenseNumber}
                </code>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium text-gray-900">{driver.phone}</span>
              </div>
              {driver.currentVehicleId && (
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="font-medium text-blue-700">
                    {vehicles.find((v: any) => v.id === driver.currentVehicleId)?.plateNumber || 'Unknown'}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200">
              <Button variant="ghost" size="sm" onClick={() => handleView(driver)} className="text-blue-600 hover:bg-blue-50">
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleEdit(driver)} className="text-blue-600 hover:bg-blue-50">
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(driver)} className="text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modals */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Driver">
        <AddDriverForm onClose={() => setShowAddModal(false)} onSave={handleSave} />
      </Modal>

      {selectedDriver && (
        <>
          <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedDriver(null); }} title="Edit Driver">
            <EditDriverForm driver={selectedDriver} onClose={() => { setShowEditModal(false); setSelectedDriver(null); }} onSave={handleSave} />
          </Modal>

          <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedDriver(null); }} title="Driver Details">
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {selectedDriver.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedDriver.name}</h3>
                  <Badge variant={getStatusBadge(selectedDriver.status)}>
                    {selectedDriver.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-blue-700 mb-1">License Number</label>
                  <p className="text-lg font-mono font-semibold text-blue-900">{selectedDriver.licenseNumber}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-blue-700 mb-1">Phone</label>
                  <p className="text-lg font-semibold text-blue-900">{selectedDriver.phone}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg col-span-2">
                  <label className="block text-sm font-medium text-blue-700 mb-1">Current Vehicle</label>
                  <p className="text-lg font-semibold text-blue-900">
                    {selectedDriver.currentVehicleId 
                      ? vehicles.find((v: any) => v.id === selectedDriver.currentVehicleId)?.plateNumber || 'Unknown Vehicle'
                      : 'No vehicle assigned'
                    }
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
