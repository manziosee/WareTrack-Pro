import { useState } from 'react';

interface ScheduleDispatchFormProps {
  onClose: () => void;
}

const ScheduleDispatchForm = ({ onClose }: ScheduleDispatchFormProps) => {
  const [formData, setFormData] = useState({
    orderId: '',
    driverId: '',
    vehicleId: '',
    scheduledDate: '',
    scheduledTime: '',
    estimatedDelivery: '',
    route: '',
    fuelAllowance: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Dispatch scheduled successfully for Order ${formData.orderId}!`);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
        <select
          required
          value={formData.orderId}
          onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select Order</option>
          <option value="ORD-001">ORD-001 - John Smith</option>
          <option value="ORD-002">ORD-002 - Jane Doe</option>
          <option value="ORD-003">ORD-003 - Mike Johnson</option>
        </select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
          <select
            required
            value={formData.driverId}
            onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select Driver</option>
            <option value="DRV-001">John Driver</option>
            <option value="DRV-002">Sarah Wilson</option>
            <option value="DRV-003">Mike Brown</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
          <select
            required
            value={formData.vehicleId}
            onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select Vehicle</option>
            <option value="VEH-001">TRK-001 - Delivery Truck</option>
            <option value="VEH-002">VAN-001 - Cargo Van</option>
            <option value="VEH-003">TRK-002 - Heavy Truck</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Time</label>
          <input
            type="time"
            required
            value={formData.scheduledTime}
            onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Delivery</label>
        <input
          type="datetime-local"
          required
          value={formData.estimatedDelivery}
          onChange={(e) => setFormData({ ...formData, estimatedDelivery: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
          <input
            type="text"
            value={formData.route}
            onChange={(e) => setFormData({ ...formData, route: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Planned route"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Allowance ($)</label>
          <input
            type="number"
            step="0.01"
            value={formData.fuelAllowance}
            onChange={(e) => setFormData({ ...formData, fuelAllowance: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="0.00"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
          placeholder="Special instructions or notes..."
        />
      </div>
      
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Schedule Dispatch
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

export default ScheduleDispatchForm;