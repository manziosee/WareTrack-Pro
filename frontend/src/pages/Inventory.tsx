import { useState } from 'react';
import { Plus, Edit, Trash2, Search, AlertTriangle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import AddInventoryForm from '../components/forms/AddInventoryForm';
import EditInventoryForm from '../components/forms/EditInventoryForm';
import { mockInventory } from '../data/mockData';
import { formatDate, formatStockLevel } from '../utils/formatters';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const inventory = mockInventory;

  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDeleteItem = (item: any) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}" from inventory?\n\nThis action cannot be undone.`)) {
      alert(`Item "${item.name}" has been deleted from inventory.`);
      // In a real app, you would call an API to delete the item
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <p className="text-2xl font-bold text-gray-900 mt-1">{inventory.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Total Stock</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{inventory.reduce((sum, item) => sum + item.quantity, 0)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Low Stock</p>
          <p className="text-2xl font-bold text-error-600 mt-1">{inventory.filter(i => i.quantity < i.minQuantity).length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Categories</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{new Set(inventory.map(i => i.category)).size}</p>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <Button variant="secondary">Filter by Category</Button>
        </div>
      </Card>

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
                        onClick={() => handleEditItem(item)}
                        className="p-1 text-primary-600 hover:bg-primary-50 hover:scale-110 rounded transition-all duration-200"
                        title="Edit item"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item)}
                        className="p-1 text-error-600 hover:bg-error-50 hover:scale-110 rounded transition-all duration-200"
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
        <AddInventoryForm onClose={() => setShowAddModal(false)} />
      </Modal>

      {selectedItem && (
        <Modal 
          isOpen={showEditModal} 
          onClose={() => {
            setShowEditModal(false);
            setSelectedItem(null);
          }} 
          title="Edit Inventory Item"
        >
          <EditInventoryForm 
            item={selectedItem} 
            onClose={() => {
              setShowEditModal(false);
              setSelectedItem(null);
            }} 
          />
        </Modal>
      )}
    </div>
  );
}