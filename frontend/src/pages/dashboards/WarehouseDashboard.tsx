import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Plus } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import AddInventoryForm from '../../components/forms/AddInventoryForm';
import CreateOrderForm from '../../components/forms/CreateOrderForm';
import { inventoryService } from '../../services/inventoryService';
import { ordersService } from '../../services/ordersService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDate } from '../../utils/formatters';

export default function WarehouseDashboard() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inventoryData, ordersData] = await Promise.all([
          inventoryService.getInventory(),
          ordersService.getOrders()
        ]);
        setInventory(inventoryData.data || []);
        setOrders(ordersData.data || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);
  
  const lowStockItems = inventory.filter((item: any) => item.quantity < item.minQuantity);
  const criticalStock = inventory.filter((item: any) => item.quantity < item.minQuantity * 0.5);
  const totalStock = inventory.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const pendingOrders = orders.filter((o: any) => o.status === 'pending');

  const openModal = (modalType: string) => setActiveModal(modalType);
  const closeModal = () => setActiveModal(null);

  const categoryData = [
    { category: 'Electronics', stock: inventory.filter((i: any) => i.category === 'Electronics').reduce((sum: number, i: any) => sum + i.quantity, 0) },
    { category: 'Furniture', stock: inventory.filter((i: any) => i.category === 'Furniture').reduce((sum: number, i: any) => sum + i.quantity, 0) },
  ];

  const recentActivity = inventory.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Warehouse Dashboard</h1>
          <p className="text-gray-600 mt-1">Inventory management and stock monitoring</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => openModal('item')} variant="primary">
            <Package className="w-5 h-5 mr-2" />
            Add New Item
          </Button>
          <Button onClick={() => openModal('stock')} variant="secondary">
            <Plus className="w-5 h-5 mr-2" />
            Add Stock
          </Button>
          <Button onClick={() => openModal('order')} variant="secondary">
            <Package className="w-5 h-5 mr-2" />
            Add Order
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-primary-100 mb-1">Total Stock</p>
              <p className="text-4xl font-bold">{totalStock}</p>
              <p className="text-sm text-primary-100 mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +12% this month
              </p>
            </div>
            <Package className="w-12 h-12 text-primary-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-error-500 to-error-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-error-100 mb-1">Critical Stock</p>
              <p className="text-4xl font-bold">{criticalStock.length}</p>
              <p className="text-sm text-error-100 mt-2">Immediate attention needed</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-error-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-warning-500 to-warning-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-warning-100 mb-1">Low Stock Items</p>
              <p className="text-4xl font-bold">{lowStockItems.length}</p>
              <p className="text-sm text-warning-100 mt-2">Reorder soon</p>
            </div>
            <TrendingDown className="w-12 h-12 text-warning-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-accent-500 to-accent-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-accent-100 mb-1">Pending Orders</p>
              <p className="text-4xl font-bold">{pendingOrders.length}</p>
              <p className="text-sm text-accent-100 mt-2">To be prepared</p>
            </div>
            <Package className="w-12 h-12 text-accent-200" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Stock by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="stock" fill="#4682B4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold text-gray-900">Critical Stock Alerts</h3>
            <Badge variant="error">{criticalStock.length} Items</Badge>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {criticalStock.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">{item.code} • {item.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-error-600">{item.quantity}</p>
                  <p className="text-xs text-gray-500">Min: {item.minQuantity}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold text-gray-900">Recent Stock Updates</h3>
            <a href="/inventory" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All</a>
          </div>
          <div className="space-y-3">
            {recentActivity.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">{formatDate(item.lastUpdated)}</p>
                </div>
                <div className="text-right">
                  <Badge variant={item.quantity < item.minQuantity ? 'error' : 'success'}>
                    {item.quantity} {item.unit}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold text-gray-900">Pending Order Preparation</h3>
            <Badge variant="warning">{pendingOrders.length} Orders</Badge>
          </div>
          <div className="space-y-3">
            {pendingOrders.map((order: any) => (
              <div key={order.id} className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{order.customerName}</p>
                    <p className="text-sm text-gray-600">{order.items.length} items</p>
                  </div>
                  <Badge variant={order.priority === 'high' ? 'error' : 'warning'}>
                    {order.priority}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-500">Created: {formatDate(order.createdAt)}</p>
                  <Button variant="primary" size="sm">
                    Prepare
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => openModal('stock')} className="p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors text-left">
            <Package className="w-8 h-8 text-primary-600 mb-2" />
            <p className="font-medium text-gray-900">Add Stock</p>
            <p className="text-xs text-gray-600 mt-1">Update inventory</p>
          </button>
          <button onClick={() => window.location.href = '/inventory'} className="p-4 bg-accent-50 hover:bg-accent-100 rounded-lg transition-colors text-left">
            <AlertTriangle className="w-8 h-8 text-accent-600 mb-2" />
            <p className="font-medium text-gray-900">View Alerts</p>
            <p className="text-xs text-gray-600 mt-1">Check low stock</p>
          </button>
          <button onClick={() => window.location.href = '/reports'} className="p-4 bg-success-50 hover:bg-success-100 rounded-lg transition-colors text-left">
            <TrendingUp className="w-8 h-8 text-success-600 mb-2" />
            <p className="font-medium text-gray-900">Stock Report</p>
            <p className="text-xs text-gray-600 mt-1">Generate report</p>
          </button>
          <button onClick={() => window.location.href = '/orders'} className="p-4 bg-warning-50 hover:bg-warning-100 rounded-lg transition-colors text-left">
            <Package className="w-8 h-8 text-warning-600 mb-2" />
            <p className="font-medium text-gray-900">Prepare Orders</p>
            <p className="text-xs text-gray-600 mt-1">View pending</p>
          </button>
        </div>
      </Card>

      {/* Modals */}
      <Modal isOpen={activeModal === 'item'} onClose={closeModal} title="Add New Item">
        <AddInventoryForm onClose={closeModal} />
      </Modal>

      <Modal isOpen={activeModal === 'stock'} onClose={closeModal} title="Add Stock">
        <AddInventoryForm onClose={closeModal} />
      </Modal>

      <Modal isOpen={activeModal === 'order'} onClose={closeModal} title="Create Order">
        <CreateOrderForm onClose={closeModal} />
      </Modal>
    </div>
  );
}