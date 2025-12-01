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
    deliveryAddress: '',
    items: [{ inventoryItemId: '', quantity: 1, unitPrice: 0 }]
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
      items: [...formData.items, { inventoryItemId: '', quantity: 1, unitPrice: 0 }]
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
        if (field === 'inventoryItemId') {
          const selectedItem = inventory.find(inv => inv.id.toString() === value);
          return { ...item, [field]: value, unitPrice: selectedItem?.unitPrice || 0 };
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Customer Email</label>
          <input
            type="email"
            required
            value={formData.customerEmail}
            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
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
        <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
        {formData.items.map((item, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <select
              value={item.inventoryItemId}
              onChange={(e) => updateItem(index, 'inventoryItemId', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select Item</option>
              {inventory.filter(inv => inv.status === 'active').map((invItem) => (
                <option key={invItem.id} value={invItem.id}>
                  {invItem.name} - ${invItem.unitPrice}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Qty"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        ))}
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