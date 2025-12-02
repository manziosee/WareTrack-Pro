import { useState, useEffect } from 'react';
import { dispatchService } from '../../services/dispatchService';
import toast from 'react-hot-toast';

interface DispatchFormProps {
  onClose: () => void;
  onSave?: (data: any) => void;
  dispatch?: any;
}

export default function DispatchForm({ onClose, onSave, dispatch }: DispatchFormProps) {
  const [formData, setFormData] = useState({
    orderId: dispatch?.orderId || '',
    driverId: dispatch?.driverId || '',
    vehicleId: dispatch?.vehicleId || '',
    scheduledDate: dispatch?.scheduledDate || '',
    estimatedDelivery: dispatch?.estimatedDelivery || '',
    fuelAllowance: dispatch?.fuelAllowance || '',
    route: dispatch?.route || '',
    notes: dispatch?.notes || ''
  });
  
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, driversRes, vehiclesRes] = await Promise.all([
          dispatchService.getAvailableOrders(),
          dispatchService.getAvailableDrivers(),
          dispatchService.getAvailableVehicles()
        ]);
        
        setOrders(ordersRes.data || []);
        setDrivers(driversRes.data || []);
        setVehicles(vehiclesRes.data || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (dispatch) {
        await dispatchService.updateDispatch(dispatch.id, formData);
        toast.success('Dispatch updated successfully');
      } else {
        await dispatchService.createDispatch(formData);
        toast.success('Dispatch created successfully');
      }
      
      if (onSave) {
        onSave(formData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save dispatch:', error);
      toast.error('Failed to save dispatch');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Order
        </label>
        <select
          value={formData.orderId}
          onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
          disabled={!!dispatch}
        >
          <option value="">Select Order</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.orderNumber} - {order.customerName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Driver
        </label>
        <select
          value={formData.driverId}
          onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        >
          <option value="">Select Driver</option>
          {drivers.filter(d => d.status === 'AVAILABLE').map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name} - License: {driver.licenseNumber}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Vehicle
        </label>
        <select
          value={formData.vehicleId}
          onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        >
          <option value="">Select Vehicle</option>
          {vehicles.filter(v => v.status === 'AVAILABLE').map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.plateNumber} - {vehicle.type}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scheduled Date
          </label>
          <input
            type="datetime-local"
            value={formData.scheduledDate}
            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estimated Delivery
          </label>
          <input
            type="datetime-local"
            value={formData.estimatedDelivery}
            onChange={(e) => setFormData({ ...formData, estimatedDelivery: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fuel Allowance (RWF)
          </label>
          <input
            type="number"
            min="0"
            value={formData.fuelAllowance}
            onChange={(e) => setFormData({ ...formData, fuelAllowance: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Route
          </label>
          <input
            type="text"
            value={formData.route}
            onChange={(e) => setFormData({ ...formData, route: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Route description"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
          placeholder="Additional notes or instructions..."
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          {dispatch ? 'Update Dispatch' : 'Create Dispatch'}
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
}