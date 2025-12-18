import { useState, useEffect } from 'react';
import { Plus, Eye, Edit, Trash2, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import SearchFilter from '@/components/ui/SearchFilter';
import AddInventoryForm from '@/components/forms/AddInventoryForm';
import EditInventoryForm from '@/components/forms/EditInventoryForm';
import ViewInventoryModal from '@/components/forms/ViewInventoryModal';
import { formatDate, formatStockLevel } from '@/utils/formatters';
import { inventoryService } from '@/services/inventoryService';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { exportToCSV, exportToPDF, exportToJSON } from '@/utils/exportUtils';
import { cache } from '@/utils/cache';
import toast from 'react-hot-toast';

export default function Inventory() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [currentPage] = useState(1);
  const [filters, setFilters] = useState<any>({});
  
  // Real-time data fetching
  const { data: realtimeInventory, loading, refetch } = useRealTimeData(
    () => inventoryService.getInventory({ ...filters, page: currentPage, limit: 20 })
  );

  const fetchStats = async () => {
    try {
      const statsData = await inventoryService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch inventory stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (realtimeInventory) {
      setInventory(realtimeInventory.data || []);
      setFilteredInventory(realtimeInventory.data || []);
    }
  }, [realtimeInventory]);

  const handleSearch = async (searchTerm: string) => {
    const newFilters = { ...filters, search: searchTerm };
    setFilters(newFilters);
    
    try {
      const response = await inventoryService.getInventory({ ...newFilters, page: currentPage, limit: 20 });
      setInventory(response.data || []);
      setFilteredInventory(response.data || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleFilter = async (newFilters: any) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    try {
      const response = await inventoryService.getInventory({ ...updatedFilters, page: currentPage, limit: 20 });
      setInventory(response.data || []);
      setFilteredInventory(response.data || []);
    } catch (error) {
      console.error('Filter failed:', error);
    }
  };

  const handleExport = (format: 'csv' | 'pdf' | 'json') => {
    const exportData = filteredInventory.map(item => ({
      Name: item.name,
      Code: item.code,
      Category: item.category,
      Quantity: item.quantity,
      'Min Quantity': item.minQuantity,
      'Unit Price': item.unitPrice,
      Location: item.location,
      Status: item.status
    }));

    switch (format) {
      case 'csv':
        exportToCSV(exportData, 'inventory');
        break;
      case 'pdf':
        exportToPDF(exportData, 'inventory', 'Inventory Report');
        break;
      case 'json':
        exportToJSON(exportData, 'inventory');
        break;
    }
    toast.success(`Inventory exported as ${format.toUpperCase()}`);
  };

  const handleView = (item: any) => {
    setSelectedItem(item);
    setShowViewModal(true);
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDelete = async (itemId: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await inventoryService.deleteInventoryItem(itemId);
        toast.success('Item deleted successfully');
        refetch();
        fetchStats();
      } catch (error) {
        console.error('Failed to delete item:', error);
        toast.error('Failed to delete item');
      }
    }
  };

  const handleSaveItem = async (itemData: any) => {
    try {
      if (selectedItem) {
        await inventoryService.updateInventoryItem(selectedItem.id, itemData);
        toast.success('Item updated successfully');
      } else {
        await inventoryService.createInventoryItem(itemData);
        toast.success('Item created successfully');
      }
      
      // Clear cache to ensure fresh data
      cache.clearPattern('inventory');
      cache.clearPattern('/api/');
      
      setShowViewModal(false);
      setShowEditModal(false);
      setShowAddModal(false);
      setSelectedItem(null);
      
      // Force refresh data with delay to ensure backend is updated
      setTimeout(async () => {
        await refetch();
        await fetchStats();
      }, 1000);
    } catch (error) {
      console.error('Failed to save item:', error);
      toast.error('Failed to save item');
      throw error; // Re-throw to let form handle the error
    }
  };

  if (loading && inventory.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const getStockBadgeVariant = (current: number, min: number) => {
    const percentage = (current / min) * 100;
    if (percentage <= 25) return 'error';
    if (percentage <= 50) return 'warning';
    return 'success';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track and manage warehouse stock levels</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalItems || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Total Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">RWF {stats?.totalValue?.toLocaleString() || '0'}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Low Stock</p>
          <p className="text-2xl font-bold text-error-600 mt-1">{stats?.lowStock || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Out of Stock</p>
          <p className="text-2xl font-bold text-error-600 mt-1">{stats?.outOfStock || 0}</p>
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
            label: 'Category',
            value: 'category',
            options: [
              { label: 'Electronics', value: 'Electronics' },
              { label: 'Furniture', value: 'Furniture' },
              { label: 'Office Supplies', value: 'Office Supplies' },
              { label: 'Equipment', value: 'Equipment' },
              { label: 'Tools', value: 'Tools' },
              { label: 'Materials', value: 'Materials' }
            ]
          },
          {
            label: 'Status',
            value: 'status',
            options: [
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Inactive', value: 'INACTIVE' },
              { label: 'Discontinued', value: 'DISCONTINUED' }
            ]
          }
        ]}
      />

      {/* Inventory Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{item.code}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="gray">{item.category}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {item.quantity < item.minQuantity && (
                        <AlertTriangle className="w-4 h-4 text-error-500" />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {item.quantity} {item.unit}
                      </span>
                      <span className="text-xs text-gray-500">/ {item.minQuantity}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStockBadgeVariant(item.quantity, item.minQuantity)}>
                      {formatStockLevel(item.quantity, item.minQuantity)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(item.lastUpdated)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleView(item)}
                        className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="View item details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Edit item"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-error-600 hover:bg-error-50 rounded transition-colors"
                        title="Delete item"
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

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Inventory Item">
        <AddInventoryForm onClose={() => setShowAddModal(false)} onSave={handleSaveItem} />
      </Modal>

      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Inventory Item Details" size="lg">
        {selectedItem && <ViewInventoryModal item={selectedItem} />}
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Inventory Item">
        {selectedItem && (
          <EditInventoryForm 
            item={selectedItem} 
            onClose={() => setShowEditModal(false)}
            onSave={handleSaveItem}
          />
        )}
      </Modal>
    </div>
  );
}