import { useState } from 'react';
import { vehiclesService } from '../../services/vehiclesService';
import toast from 'react-hot-toast';

interface AddVehicleFormProps {
  onClose: () => void;
  onSave?: () => void;
}

const AddVehicleForm = ({ onClose, onSave }: AddVehicleFormProps) => {
  const [formData, setFormData] = useState({
    plateNumber: '',
    type: 'Truck',
    capacity: '',
    vehicleModel: '',
    year: '',
    fuelType: 'Diesel',
    status: 'AVAILABLE'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await vehiclesService.createVehicle({
        plateNumber: formData.plateNumber,
        type: formData.type,
        capacity: Number(formData.capacity),
        vehicleModel: formData.vehicleModel,
        year: Number(formData.year),
        fuelType: formData.fuelType,
        status: formData.status
      });
      
      toast.success(`Vehicle ${formData.plateNumber} added successfully!`);
      if (onSave) onSave();
      onClose();
    } catch (error: any) {
      console.error('Failed to create vehicle:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number</label>
          <input
            type="text"
            required
            value={formData.plateNumber}
            onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., ABC-123"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="Truck">Truck</option>
            <option value="Van">Van</option>
            <option value="Motorcycle">Motorcycle</option>
            <option value="Car">Car</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <input
            type="text"
            required
            value={formData.vehicleModel}
            onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., Ford Transit"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <input
            type="number"
            required
            min="1990"
            max="2024"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (kg)</label>
          <input
            type="number"
            required
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., 1000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
          <select
            value={formData.fuelType}
            onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="Diesel">Diesel</option>
            <option value="Gasoline">Gasoline</option>
            <option value="Electric">Electric</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </div>
      </div>
      
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding...' : 'Add Vehicle'}
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

export default AddVehicleForm;