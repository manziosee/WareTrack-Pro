import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import Button from '../ui/Button';
import { CategorySelect } from '@/components/inventory/Categories';
import { unitCategories } from '../../utils/units';
import toast from 'react-hot-toast';
import ItemExtrasFields, { emptyExtras, extrasFromItem, extrasPayload } from '@/components/inventory/ItemExtrasFields';

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

  const [extras, setExtras] = useState(emptyExtras);

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
        quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0,
        minQuantity: Number.isFinite(Number(item.minQuantity)) ? Number(item.minQuantity) : 0,
        unit: item.unit,
        unitCategory: foundCategory,
        location: item.location,
        description: item.description || '',
        status: String(item.status || 'active').toLowerCase(),
        unitPrice: Number.isFinite(Number(item.unitPrice)) ? Number(item.unitPrice) : 0,
        supplier: item.supplier || '',
        barcode: item.barcode || ''
      });
      setExtras(extrasFromItem(item));
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (onSave) {
        await onSave({ ...formData, ...extrasPayload(extras), status: formData.status.toUpperCase() });
      }
      // Don't call onClose() here - let the parent handle it after successful save
    } catch (error) {
      console.error('Failed to save item:', error);
      toast.error(error instanceof Error ? error.message : 'Could not save inventory item');
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
          <CategorySelect value={formData.category} onChange={(category) => setFormData({ ...formData, category })} required />
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
            onChange={(e) => setFormData({ ...formData, quantity: Number.parseInt(e.target.value, 10) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Quantity</label>
          <input
            type="number"
            value={formData.minQuantity}
            onChange={(e) => setFormData({ ...formData, minQuantity: Number.parseInt(e.target.value, 10) || 0 })}
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
            onChange={(e) => setFormData({ ...formData, unitPrice: Number.parseFloat(e.target.value) || 0 })}
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
      
      <ItemExtrasFields value={extras} onChange={setExtras} unit={formData.unit} />

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
