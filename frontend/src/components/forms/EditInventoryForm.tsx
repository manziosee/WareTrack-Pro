import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import { unitCategories } from '@/utils/units';

interface EditInventoryFormProps {
  item: any;
  onClose: () => void;
  onSave?: (itemData: any) => void;
}

export default function EditInventoryForm({ item, onClose, onSave }: EditInventoryFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    quantity: 0,
    minQuantity: 0,
    unit: '',
    unitCategory: 'basic',
    location: '',
    description: '',
    status: 'active',
    unitPrice: 0,
    supplier: '',
    barcode: ''
  });

  const handleUnitCategoryChange = (category: string) => {
    const firstUnit = unitCategories[category as keyof typeof unitCategories]?.units[0]?.value || 'pcs';
    setFormData({ ...formData, unitCategory: category, unit: firstUnit });
  };

  useEffect(() => {
    if (item) {
      // Find unit category based on current unit
      let foundCategory = 'basic';
      for (const [key, category] of Object.entries(unitCategories)) {
        if (category.units.some(u => u.value === item.unit)) {
          foundCategory = key;
          break;
        }
      }
      
      setFormData({
        name: item.name,
        code: item.code,
        category: item.category,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        unit: item.unit,
        unitCategory: foundCategory,
        location: item.location,
        description: item.description || '',
        status: item.status || 'active',
        unitPrice: item.unitPrice || 0,
        supplier: item.supplier || '',
        barcode: item.barcode || ''
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log('Updating inventory item:', formData);
      if (onSave) {
        await onSave(formData);
      }
      // Don't call onClose() here - let the parent handle it after successful save
    } catch (error) {
      console.error('Failed to save item:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Item Code</label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          >
            <option value="">Select Category</option>
            <option value="Electronics">Electronics</option>
            <option value="Furniture">Furniture</option>
            <option value="Office Supplies">Office Supplies</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Current Quantity</label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Quantity</label>
          <input
            type="number"
            value={formData.minQuantity}
            onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Unit Category</label>
          <select
            value={formData.unitCategory}
            onChange={(e) => handleUnitCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {Object.entries(unitCategories).map(([key, category]) => (
              <option key={key} value={key}>{category.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
          <select
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          >
            {unitCategories[formData.unitCategory as keyof typeof unitCategories]?.units.map((unit) => (
              <option key={unit.value} value={unit.value}>{unit.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (RWF)</label>
          <input
            type="number"
            step="0.01"
            value={formData.unitPrice}
            onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
          <input
            type="text"
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Supplier name"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
        <input
          type="text"
          value={formData.barcode}
          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Item barcode (optional)"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Optional description..."
        />
      </div>

      <div className="flex justify-end gap-4">
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}