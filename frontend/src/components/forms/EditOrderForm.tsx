import { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { inventoryService } from '@/services/inventoryService';


interface EditOrderFormProps {
  order: any;
  onClose: () => void;
  onSave?: (orderData: any) => void;
}

export default function EditOrderForm({ order, onClose, onSave }: EditOrderFormProps) {
  const [formData, setFormData] = useState({
    customerName: '',
    contactNumber: '',
    deliveryAddress: '',
    priority: 'medium',
    scheduledDate: '',
    deliveryInstructions: '',
    orderType: 'delivery',
    paymentMethod: 'cash',
    items: [] as any[]
  });
  const [inventory, setInventory] = useState<any[]>([]);

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => {
      const inventoryItem = inventory.find((inv: any) => inv.id.toString() === item.inventoryId);
      const price = inventoryItem?.unitPrice || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await inventoryService.getInventory();
        setInventory(response.data || []);
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      }
    };
    fetchInventory();
  }, []);

  useEffect(() => {
    if (order && inventory.length > 0) {
      const mappedItems = order.items?.map((item: any) => {
        const inventoryItem = inventory.find((inv: any) => 
          inv.id === item.itemId || inv.name === item.itemName
        );
        
        return {
          inventoryId: inventoryItem?.id?.toString() || item.itemId?.toString() || '',
          quantity: item.quantity || 1,
          name: item.itemName || item.name || inventoryItem?.name || '',
          code: item.code || inventoryItem?.code || '',
          unit: item.unit || inventoryItem?.unit || 'pcs',
          price: item.unitPrice || inventoryItem?.unitPrice || 0
        };
      }) || [];
      
      setFormData({
        customerName: order.customerName || '',
        contactNumber: order.contactNumber || '',
        deliveryAddress: order.deliveryAddress || '',
        priority: order.priority?.toUpperCase() || 'MEDIUM',
        scheduledDate: order.scheduledDate ? new Date(order.scheduledDate).toISOString().split('T')[0] : '',
        deliveryInstructions: order.deliveryInstructions || '',
        orderType: order.orderType || 'delivery',
        paymentMethod: order.paymentMethod || 'cash',
        items: mappedItems
      });
    }
  }, [order, inventory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Updating order:', formData);
    if (onSave) {
      onSave(formData);
    }
    onClose();
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { inventoryId: '', quantity: 1, name: '', code: '', unit: '', price: 0 }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'inventoryId') {
      const selectedItem = inventory.find((item: any) => item.id.toString() === value);
      if (selectedItem) {
        updatedItems[index] = {
          ...updatedItems[index],
          name: selectedItem.name,
          code: selectedItem.code,
          unit: selectedItem.unit,
          price: selectedItem.unitPrice || 0
        };
      }
    }
    
    setFormData({ ...formData, items: updatedItems });
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
              <input
                type="tel"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
              <textarea
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order Type</label>
              <select
                value={formData.orderType}
                onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="delivery">Delivery</option>
                <option value="pickup">Pickup</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Date</label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Instructions</label>
              <textarea
                value={formData.deliveryInstructions}
                onChange={(e) => setFormData({ ...formData, deliveryInstructions: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional delivery instructions..."
              />
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
          <div className="space-y-3">
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border border-gray-200 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                  <select
                    value={item.inventoryId || ''}
                    onChange={(e) => updateItem(index, 'inventoryId', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select Item</option>
                    {inventory.filter((inv: any) => inv.status === 'ACTIVE').map((invItem: any) => (
                      <option key={invItem.id} value={invItem.id.toString()}>
                        {invItem.name} ({invItem.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={item.unit}
                    readOnly
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Price (RWF)</label>
                  <input
                    type="number"
                    value={item.price || 0}
                    readOnly
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-error-600 hover:bg-error-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {formData.items.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No items added. Click "Add Item" to get started.
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
            <span className="text-xl font-bold text-primary-600">RWF {calculateTotal().toLocaleString()}</span>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}