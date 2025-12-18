import { useState, useEffect } from 'react';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import SearchFilter from '@/components/ui/SearchFilter';
import CreateOrderForm from '@/components/forms/CreateOrderForm';
import EditOrderForm from '@/components/forms/EditOrderForm';
import ViewOrderModal from '@/components/forms/ViewOrderModal';
import { formatOrderNumber, formatDate } from '@/utils/formatters';
import { ordersService } from '@/services/ordersService';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { exportToCSV, exportToPDF, exportToJSON } from '@/utils/exportUtils';
import toast from 'react-hot-toast';

export default function Orders() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({});
  
  // Real-time data fetching
  const { data: realtimeOrders, loading, refetch } = useRealTimeData(
    () => ordersService.getOrders(filters)
  );

  useEffect(() => {
    if (realtimeOrders) {
      setOrders(realtimeOrders.data || []);
      setFilteredOrders(realtimeOrders.data || []);
    }
  }, [realtimeOrders]);

  const handleSearch = (searchTerm: string) => {
    const filtered = orders.filter(order =>
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOrders(filtered);
  };

  const handleFilter = (newFilters: any) => {
    setFilters(newFilters);
    let filtered = [...orders];
    
    if (newFilters.status) {
      filtered = filtered.filter(order => order.status === newFilters.status);
    }
    if (newFilters.priority) {
      filtered = filtered.filter(order => order.priority === newFilters.priority);
    }
    if (newFilters.start && newFilters.end) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= new Date(newFilters.start) && orderDate <= new Date(newFilters.end);
      });
    }
    
    setFilteredOrders(filtered);
  };

  const handleExport = (format: 'csv' | 'pdf' | 'json') => {
    const exportData = filteredOrders.map(order => ({
      'Order Number': order.orderNumber,
      'Customer': order.customerName,
      'Status': order.status,
      'Priority': order.priority,
      'Total Amount': order.totalAmount,
      'Created': formatDate(order.createdAt),
      'Delivery Address': order.deliveryAddress
    }));

    switch (format) {
      case 'csv':
        exportToCSV(exportData, 'orders');
        break;
      case 'pdf':
        exportToPDF(exportData, 'orders', 'Orders Report');
        break;
      case 'json':
        exportToJSON(exportData, 'orders');
        break;
    }
    toast.success(`Orders exported as ${format.toUpperCase()}`);
  };

  const handleView = (order: any) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  const handleEdit = (order: any) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handleDelete = async (orderId: number) => {
    if (window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      try {
        // Optimistic update - remove order from UI immediately
        setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        setFilteredOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        
        await ordersService.deleteOrder(orderId);
        toast.success('Order deleted successfully');
      } catch (error) {
        console.error('Failed to delete order:', error);
        toast.error('Failed to delete order');
        // Revert optimistic update on error
        refetch();
      }
    }
  };

  const handleSaveOrder = async (orderData: any) => {
    try {
      if (selectedOrder) {
        await ordersService.updateOrder(selectedOrder.id, orderData);
        toast.success('Order updated successfully');
      } else {
        await ordersService.createOrder(orderData);
        toast.success('Order created successfully');
      }
      setShowEditModal(false);
      setShowCreateModal(false);
      setSelectedOrder(null);
      refetch();
    } catch (error) {
      console.error('Failed to save order:', error);
      toast.error('Failed to save order');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }



  const getStatusBadgeVariant = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'delivered': return 'success';
      case 'in_transit': return 'info';
      case 'dispatched': return 'warning';
      case 'pending': return 'gray';
      case 'cancelled': return 'error';
      default: return 'gray';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    const normalizedPriority = priority.toLowerCase();
    switch (normalizedPriority) {
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
          <p className="text-2xl font-bold text-gray-600 mt-1">{orders.filter(o => o.status === 'PENDING').length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Dispatched</p>
          <p className="text-2xl font-bold text-warning-600 mt-1">{orders.filter(o => o.status === 'DISPATCHED').length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">In Transit</p>
          <p className="text-2xl font-bold text-accent-600 mt-1">{orders.filter(o => o.status === 'IN_TRANSIT').length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Delivered</p>
          <p className="text-2xl font-bold text-success-600 mt-1">{orders.filter(o => o.status === 'DELIVERED').length}</p>
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
          },
          {
            label: 'Priority',
            value: 'priority',
            options: [
              { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' },
              { label: 'Low', value: 'low' }
            ]
          }
        ]}
      />

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
                      {order.priority.charAt(0).toUpperCase() + order.priority.slice(1).toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {order.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
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
                      <button 
                        onClick={() => handleDelete(order.id)}
                        className="p-1 text-error-600 hover:bg-error-50 rounded transition-colors"
                        title="Delete order"
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

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Order">
        <CreateOrderForm onClose={() => setShowCreateModal(false)} onSave={handleSaveOrder} />
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