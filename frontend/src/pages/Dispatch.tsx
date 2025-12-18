import { useState, useEffect } from 'react';
import { Plus, Edit, Truck, Eye, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import SearchFilter from '@/components/ui/SearchFilter';
import DispatchForm from '@/components/forms/DispatchForm';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { formatDate } from '@/utils/formatters';
import { dispatchService } from '@/services/dispatchService';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { exportToCSV, exportToPDF, exportToJSON } from '@/utils/exportUtils';
import toast from 'react-hot-toast';

function DispatchContent() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState<any>(null);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [filteredDispatches, setFilteredDispatches] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState<any>({});
  
  // Real-time data fetching
  const { data: realtimeDispatches, loading, refetch } = useRealTimeData(
    () => dispatchService.getDispatches(filters)
  );

  const fetchStats = async () => {
    try {
      const statsData = await dispatchService.getStats();
      setStats(statsData.data);
    } catch (error) {
      console.error('Failed to fetch dispatch stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (realtimeDispatches) {
      setDispatches(realtimeDispatches.data || []);
      setFilteredDispatches(realtimeDispatches.data || []);
      fetchStats(); // Refresh stats when data updates
    }
  }, [realtimeDispatches]);

  const handleSearch = (searchTerm: string) => {
    const filtered = dispatches.filter(dispatch =>
      dispatch.order?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispatch.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispatch.vehicle?.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDispatches(filtered);
  };

  const handleFilter = (newFilters: any) => {
    setFilters(newFilters);
    let filtered = [...dispatches];
    
    if (newFilters.status) {
      filtered = filtered.filter(dispatch => dispatch.status === newFilters.status);
    }
    if (newFilters.start && newFilters.end) {
      filtered = filtered.filter(dispatch => {
        const dateToCheck = dispatch.startTime || dispatch.scheduledDate || dispatch.createdAt;
        if (!dateToCheck) return false;
        const dispatchDate = new Date(dateToCheck);
        return dispatchDate >= new Date(newFilters.start) && dispatchDate <= new Date(newFilters.end);
      });
    }
    
    setFilteredDispatches(filtered);
  };

  const handleExport = (format: 'csv' | 'pdf' | 'json') => {
    const exportData = filteredDispatches.map(dispatch => ({
      'Order Number': dispatch.order?.orderNumber || 'N/A',
      'Driver': dispatch.driver?.name || 'N/A',
      'Vehicle': dispatch.vehicle?.registrationNumber || 'N/A',
      'Status': dispatch.status,
      'Start Time': formatDate(dispatch.startTime || dispatch.scheduledDate || dispatch.createdAt),
      'Estimated Arrival': formatDate(dispatch.estimatedArrival || dispatch.estimatedDelivery)
    }));

    switch (format) {
      case 'csv':
        exportToCSV(exportData, 'dispatches');
        break;
      case 'pdf':
        exportToPDF(exportData, 'dispatches', 'Dispatch Report');
        break;
      case 'json':
        exportToJSON(exportData, 'dispatches');
        break;
    }
    toast.success(`Dispatches exported as ${format.toUpperCase()}`);
  };

  const handleView = (dispatch: any) => {
    setSelectedDispatch(dispatch);
    setShowViewModal(true);
  };

  const handleEdit = (dispatch: any) => {
    setSelectedDispatch(dispatch);
    setShowEditModal(true);
  };

  const handleDelete = async (dispatch: any) => {
    if (window.confirm(`Are you sure you want to delete dispatch for order ${dispatch.order?.orderNumber}?`)) {
      try {
        await dispatchService.deleteDispatch(dispatch.id);
        toast.success('Dispatch deleted successfully');
        refetch();
      } catch (error) {
        toast.error('Failed to delete dispatch');
      }
    }
  };



  const handleSaveDispatch = () => {
    setShowEditModal(false);
    setShowCreateModal(false);
    setShowViewModal(false);
    setSelectedDispatch(null);
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'DELIVERED': return 'success';
      case 'IN_TRANSIT': return 'info';
      case 'DISPATCHED': return 'warning';
      case 'PENDING': return 'gray';
      case 'CANCELLED': return 'error';
      case 'AVAILABLE': return 'success';
      case 'IN_USE': return 'warning';
      case 'MAINTENANCE': return 'error';
      case 'UNAVAILABLE': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Dispatch Management</h1>
          <p className="text-gray-600 mt-1">Manage delivery dispatches and track progress</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Create Dispatch
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <p className="text-sm text-gray-600">Total Dispatches</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalDispatches || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">In Transit</p>
          <p className="text-2xl font-bold text-info-600 mt-1">{stats?.inTransitDispatches || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-success-600 mt-1">{stats?.completedDispatches || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-warning-600 mt-1">{stats?.pendingDispatches || 0}</p>
        </Card>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        onSearch={handleSearch}
        onFilter={handleFilter}
        onExport={handleExport}
        showDateRange={true}
        filterOptions={[
          {
            label: 'Status',
            value: 'status',
            options: [
              { label: 'Pending', value: 'PENDING' },
              { label: 'Dispatched', value: 'DISPATCHED' },
              { label: 'In Transit', value: 'IN_TRANSIT' },
              { label: 'Delivered', value: 'DELIVERED' },
              { label: 'Cancelled', value: 'CANCELLED' }
            ]
          }
        ]}
      />

      {/* Dispatches Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ETA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDispatches.map((dispatch) => (
                <tr key={dispatch.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {dispatch.order?.orderNumber || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {dispatch.order?.customerName || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {dispatch.driver?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {dispatch.driver?.phone || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Truck className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {dispatch.vehicle?.plateNumber || dispatch.vehicle?.registrationNumber || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {dispatch.vehicle?.type} - {dispatch.vehicle?.capacity}kg
                        </div>
                        {dispatch.vehicle?.status && (
                          <Badge variant={getStatusBadgeVariant(dispatch.vehicle.status)} size="sm" className="mt-1">
                            {dispatch.vehicle.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusBadgeVariant(dispatch.status)}>
                      {dispatch.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(dispatch.startTime || dispatch.scheduledDate || dispatch.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(dispatch.estimatedArrival || dispatch.estimatedDelivery)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleView(dispatch)}
                        className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="View dispatch details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(dispatch)}
                        className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Edit dispatch"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(dispatch)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete dispatch"
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

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Dispatch">
        <DispatchForm onClose={() => setShowCreateModal(false)} onSave={handleSaveDispatch} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Dispatch">
        {selectedDispatch && (
          <DispatchForm 
            dispatch={selectedDispatch}
            onClose={() => setShowEditModal(false)}
            onSave={handleSaveDispatch}
          />
        )}
      </Modal>

      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Dispatch Details" size="lg">
        {selectedDispatch && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Order Number</label>
                    <p className="text-lg font-semibold">{selectedDispatch.order?.orderNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer</label>
                    <p className="text-lg">{selectedDispatch.order?.customerName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
                    <p className="text-lg">{selectedDispatch.order?.deliveryAddress || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Driver</label>
                    <p className="text-lg font-semibold">{selectedDispatch.driver?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{selectedDispatch.driver?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vehicle</label>
                    <p className="text-lg font-semibold">{selectedDispatch.vehicle?.plateNumber || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{selectedDispatch.vehicle?.type} - {selectedDispatch.vehicle?.capacity}kg</p>
                    {selectedDispatch.vehicle?.status && (
                      <Badge variant={getStatusBadgeVariant(selectedDispatch.vehicle.status)} className="mt-1">
                        {selectedDispatch.vehicle.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <Badge variant={getStatusBadgeVariant(selectedDispatch.status)}>
                      {selectedDispatch.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scheduled Date</label>
                  <p className="text-lg">{formatDate(selectedDispatch.scheduledDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estimated Delivery</label>
                  <p className="text-lg">{formatDate(selectedDispatch.estimatedDelivery) || 'N/A'}</p>
                </div>
              </div>
            </div>
            {selectedDispatch.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedDispatch.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function Dispatch() {
  return (
    <ErrorBoundary>
      <DispatchContent />
    </ErrorBoundary>
  );
}