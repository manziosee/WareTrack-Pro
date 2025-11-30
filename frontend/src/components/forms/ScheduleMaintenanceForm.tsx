import { useState } from 'react';

interface ScheduleMaintenanceFormProps {
  vehicle: {
    id: string;
    plateNumber: string;
    type: string;
  };
  onClose: () => void;
}

const ScheduleMaintenanceForm = ({ vehicle, onClose }: ScheduleMaintenanceFormProps) => {
  const [formData, setFormData] = useState({
    maintenanceType: 'routine',
    scheduledDate: '',
    description: '',
    estimatedCost: '',
    priority: 'medium',
    serviceProvider: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Maintenance scheduled for vehicle ${vehicle.plateNumber}!`);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-3 rounded-lg">
        <p className="text-sm text-gray-600">Vehicle</p>
        <p className="font-medium text-gray-900">{vehicle.plateNumber} - {vehicle.type}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Type</label>
          <select
            value={formData.maintenanceType}
            onChange={(e) => setFormData({ ...formData, maintenanceType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="routine">Routine Service</option>
            <option value="repair">Repair</option>
            <option value="inspection">Inspection</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
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
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
        <input
          type="date"
          required
          value={formData.scheduledDate}
          onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Provider</label>
          <input
            type="text"
            required
            value={formData.serviceProvider}
            onChange={(e) => setFormData({ ...formData, serviceProvider: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Garage or service center"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost ($)</label>
          <input
            type="number"
            step="0.01"
            value={formData.estimatedCost}
            onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="0.00"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
          placeholder="Describe the maintenance work needed..."
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={2}
          placeholder="Any additional notes or special instructions..."
        />
      </div>
      
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-warning-600 text-white px-4 py-2 rounded-lg hover:bg-warning-700 transition-colors font-medium"
        >
          Schedule Maintenance
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

export default ScheduleMaintenanceForm;