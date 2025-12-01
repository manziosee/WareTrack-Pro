import { useState } from 'react';
import { mockInventory } from '@/data/mockData';

interface CreateOrderFormProps {
  onClose: () => void;
}

const CreateOrderForm = ({ onClose }: CreateOrderFormProps) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    priority: 'medium',
    orderType: 'delivery',
    paymentMethod: 'cash',
    deliveryDate: '',
    specialInstructions: '',
    items: [{ inventoryId: '', quantity: 1, name: '', unit: '', price: 0 }]
  });

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { inventoryId: '', quantity: 1, name: '', unit: '', price: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'inventoryId') {
      const selectedItem = mockInventory.find(item => item.id.toString() === value);
      if (selectedItem) {
        newItems[index] = {
          ...newItems[index],
          name: selectedItem.name,
          unit: selectedItem.unit,
          price: (selectedItem as any).unitPrice || 0
        };
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Order for ${formData.customerName} created successfully!`);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
          <input
            type="text"
            required
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
          <input
            type="email"
            required
            value={formData.customerEmail}
            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            required
            value={formData.customerPhone}
            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
          <select
            value={formData.orderType}
            onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="delivery">Delivery</option>
            <option value="pickup">Pickup</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_money">Mobile Money</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
        <textarea
          required
          value={formData.customerAddress}
          onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
        <input
          type="date"
          required
          value={formData.deliveryDate}
          onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
        <textarea
          value={formData.specialInstructions}
          onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={2}
          placeholder="Any special delivery instructions..."
        />
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">Order Items</label>
          <button
            type="button"
            onClick={addItem}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            + Add Item
          </button>
        </div>
        
        {formData.items.map((item, index) => (
          <div key={index} className="grid grid-cols-5 gap-2 mb-2 p-3 border border-gray-200 rounded-lg">
            <div>
              <select
                value={item.inventoryId}
                onChange={(e) => updateItem(index, 'inventoryId', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              >
                <option value="">Select Item</option>
                {mockInventory.filter(inv => (inv as any).status === 'active').map((invItem) => (
                  <option key={invItem.id} value={invItem.id.toString()}>
                    {invItem.name} ({invItem.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="number"
                min="1"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <input
                type="text"
                value={item.unit}
                readOnly
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                placeholder="Unit"
              />
            </div>
            <div>
              <input
                type="number"
                value={item.price}
                readOnly
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                placeholder="Price (RWF)"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="w-full text-error-600 hover:text-error-700 font-medium text-sm"
                disabled={formData.items.length === 1}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Order Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
          <span className="text-xl font-bold text-primary-600">RWF {calculateTotal().toLocaleString()}</span>
        </div>
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