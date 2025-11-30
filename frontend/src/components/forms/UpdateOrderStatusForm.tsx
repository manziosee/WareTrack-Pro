import { useState } from 'react';

interface UpdateOrderStatusFormProps {
  orderId: string;
  currentStatus: string;
  onClose: () => void;
}

const UpdateOrderStatusForm = ({ orderId, currentStatus, onClose }: UpdateOrderStatusFormProps) => {
  const [formData, setFormData] = useState({
    status: currentStatus,
    notes: '',
    location: '',
    estimatedDelivery: '',
    deliveryProof: '',
    customerSignature: false
  });

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'dispatched', label: 'Dispatched' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Order ${orderId} status updated to ${formData.status}!`);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Current Location</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Current location or checkpoint"
        />
      </div>
      
      {formData.status === 'in_transit' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Delivery</label>
          <input
            type="datetime-local"
            value={formData.estimatedDelivery}
            onChange={(e) => setFormData({ ...formData, estimatedDelivery: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}
      
      {formData.status === 'delivered' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Proof</label>
            <input
              type="text"
              value={formData.deliveryProof}
              onChange={(e) => setFormData({ ...formData, deliveryProof: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Photo reference or delivery code"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="customerSignature"
              checked={formData.customerSignature}
              onChange={(e) => setFormData({ ...formData, customerSignature: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="customerSignature" className="ml-2 text-sm text-gray-700">
              Customer signature obtained
            </label>
          </div>
        </>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
          placeholder="Additional notes or comments"
        />
      </div>
      
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Update Status
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

export default UpdateOrderStatusForm;