import { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';

interface CreateOrderFormProps {
  onClose: () => void;
  onSave?: (data: any) => void;
}

const CreateOrderForm = ({ onClose, onSave }: CreateOrderFormProps) => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    deliveryAddress: '',
    notes: '',
    priority: 'MEDIUM',
    items: [{ itemId: '', quantity: 1, unitPrice: 0, itemName: '', availableStock: 0 }]
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const orderData = { ...formData, totalAmount };
    
    if (onSave) {
      onSave(orderData);
    } else {
      alert('Order created successfully!');
      onClose();
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { itemId: '', quantity: 1, unitPrice: 0, itemName: '', availableStock: 0 }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = formData.items.map((item, i) => {
      if (i === index) {
        if (field === 'itemId') {
          const selectedItem = inventory.find(inv => inv.id.toString() === value);
          return { 
            ...item, 
            [field]: value, 
            unitPrice: selectedItem?.unitPrice || 0,
            itemName: selectedItem?.name || '',
            availableStock: selectedItem?.quantity || 0
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    });
    setFormData({ ...formData, items: updatedItems });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
          <input
            type="text"
            required
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Customer Phone</label>
          <input
            type="tel"
            value={formData.customerPhone}
            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Customer Email</label>
          <input
            type="email"
            value={formData.customerEmail}
            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
        <textarea
          required
          value={formData.deliveryAddress}
          onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={2}
          placeholder="Additional delivery instructions..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
        {formData.items.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                <select
                  value={item.itemId}
                  onChange={(e) => updateItem(index, 'itemId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select Item</option>
                  {inventory.filter(inv => inv.status === 'ACTIVE' && inv.quantity > 0).map((invItem) => (
                    <option key={invItem.id} value={invItem.id}>
                      {invItem.name} - RWF {Number(invItem.unitPrice).toLocaleString()} (Stock: {invItem.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={item.availableStock}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Qty"
                />
                {item.availableStock > 0 && (
                  <p className="text-xs text-gray-500 mt-1">Available: {item.availableStock}</p>
                )}
              </div>
              <div className="flex items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                  <p className="text-sm font-medium text-gray-900 py-2">
                    RWF {(item.unitPrice * item.quantity).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="ml-2 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        
        <div className="mb-4">
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">
              Total Amount: RWF {formData.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0).toLocaleString()}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Add Item
        </button>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Create Order
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default CreateOrderForm;