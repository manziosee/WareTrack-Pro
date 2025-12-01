import { useState } from 'react';
import { Plus, Eye, Edit, Search } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import CreateOrderForm from '../components/forms/CreateOrderForm';
import EditOrderForm from '../components/forms/EditOrderForm';
import ViewOrderModal from '../components/forms/ViewOrderModal';
import { mockOrders } from '../data/mockData';
import { formatOrderNumber, formatDate } from '../utils/formatters';

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const orders = mockOrders;

  const handleView = (order: any) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  const handleEdit = (order: any) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handleSaveOrder = (orderData: any) => {
    console.log('Saving order data:', orderData);
    // Here you would typically call an API to update the order
  };

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'delivered': return 'success';
      case 'in_transit': return 'info';
      case 'dispatched': return 'warning';
      case 'pending': return 'gray';
      case 'cancelled': return 'error';
      default: return 'gray';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Delivery Orders</h1>
          <p className="text-gray-600 mt-1">Create and manage delivery orders</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Create Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{orders.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{orders.filter(o => o.status === 'pending').length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Dispatched</p>
          <p className="text-2xl font-bold text-warning-600 mt-1">{orders.filter(o => o.status === 'dispatched').length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">In Transit</p>
          <p className="text-2xl font-bold text-accent-600 mt-1">{orders.filter(o => o.status === 'in_transit').length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Delivered</p>
          <p className="text-2xl font-bold text-success-600 mt-1">{orders.filter(o => o.status === 'delivered').length}</p>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <Button variant="secondary">Filter by Status</Button>
        </div>
      </Card>

      {/* Orders Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm font-medium bg-primary-50 text-primary-700 px-2 py-1 rounded">
                      {formatOrderNumber(order.id)}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.contactNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.items.length} item{order.items.length > 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getPriorityBadgeVariant(order.priority)}>
                      {order.priority}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.scheduledDate ? formatDate(order.scheduledDate) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleView(order)}
                        className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="View order details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(order)}
                        className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Edit order"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Order">
        <CreateOrderForm onClose={() => setShowCreateModal(false)} />
      </Modal>

      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Order Details" size="lg">
        {selectedOrder && <ViewOrderModal order={selectedOrder} />}
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Order" size="lg">
        {selectedOrder && (
          <EditOrderForm 
            order={selectedOrder} 
            onClose={() => setShowEditModal(false)}
            onSave={handleSaveOrder}
          />
        )}
      </Modal>
    </div>
  );
}