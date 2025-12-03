import { useState, useEffect } from 'react';
import { Plus, Edit, Truck } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import SearchFilter from '../components/ui/SearchFilter';
import DispatchForm from '../components/forms/DispatchForm';
import { formatDate } from '../utils/formatters';
import { dispatchService } from '../services/dispatchService';
import { useRealTimeData } from '../hooks/useRealTimeData';
import { exportToCSV, exportToPDF, exportToJSON } from '../utils/exportUtils';
import toast from 'react-hot-toast';

export default function Dispatch() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
        const dispatchDate = new Date(dispatch.startTime);
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
      'Start Time': formatDate(dispatch.startTime),
      'Estimated Arrival': dispatch.estimatedArrival ? formatDate(dispatch.estimatedArrival) : 'N/A'
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

  const handleEdit = (dispatch: any) => {
    setSelectedDispatch(dispatch);
    setShowEditModal(true);
  };

  const handleUpdateStatus = async (dispatchId: number, status: string) => {
    try {
      await dispatchService.updateDispatchStatus(dispatchId, status);
      toast.success('Dispatch status updated successfully');
      refetch();
    } catch (error) {
      console.error('Failed to update dispatch status:', error);
      toast.error('Failed to update dispatch status');
    }
  };

  const handleSaveDispatch = () => {
    setShowEditModal(false);
    setShowCreateModal(false);
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
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
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
                          {dispatch.vehicle?.registrationNumber || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {dispatch.vehicle?.make} {dispatch.vehicle?.model}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusBadgeVariant(dispatch.status)}>
                      {dispatch.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(dispatch.startTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dispatch.estimatedArrival ? formatDate(dispatch.estimatedArrival) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEdit(dispatch)}
                        className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Edit dispatch"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {dispatch.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(dispatch.id, 'in_progress')}
                          className="px-2 py-1 text-xs bg-info-100 text-info-700 rounded hover:bg-info-200"
                        >
                          Start
                        </button>
                      )}
                      {dispatch.status === 'in_progress' && (
                        <button
                          onClick={() => handleUpdateStatus(dispatch.id, 'completed')}
                          className="px-2 py-1 text-xs bg-success-100 text-success-700 rounded hover:bg-success-200"
                        >
                          Complete
                        </button>
                      )}
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
    </div>
  );
}