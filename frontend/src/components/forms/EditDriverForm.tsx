import { useState } from 'react';
import { driversService } from '../../services/driversService';
import toast from 'react-hot-toast';

interface EditDriverFormProps {
  driver: {
    id: string;
    name: string;
    phone: string;
    licenseNumber: string;
    status: string;
    email?: string;
    address?: string;
    emergencyContact?: string;
    emergencyContactName?: string;
  };
  onClose: () => void;
  onSave?: () => void;
}

const EditDriverForm = ({ driver, onClose, onSave }: EditDriverFormProps) => {
  const [formData, setFormData] = useState({
    name: driver.name || '',
    phone: driver.phone || '',
    licenseNumber: driver.licenseNumber || '',
    status: driver.status || 'AVAILABLE',
    email: driver.email || '',
    address: driver.address || '',
    emergencyContact: driver.emergencyContact || '',
    emergencyContactName: driver.emergencyContactName || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await driversService.updateDriver(Number(driver.id), formData);
      
      toast.success(`Driver ${formData.name} updated successfully!`);
      onClose();
      if (onSave) onSave();
    } catch (error: any) {
      console.error('Failed to update driver:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update driver');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
          <input
            type="text"
            required
            value={formData.licenseNumber}
            onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="AVAILABLE">Available</option>
            <option value="ON_DUTY">On Duty</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
          <input
            type="text"
            value={formData.emergencyContactName}
            onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label>
          <input
            type="tel"
            value={formData.emergencyContact}
            onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Updating...' : 'Update Driver'}
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

export default EditDriverForm;