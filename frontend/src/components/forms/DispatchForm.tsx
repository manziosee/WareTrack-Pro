import { useState, useEffect } from 'react';
import { ordersService } from '../../services/ordersService';
import { driversService } from '../../services/driversService';
import { vehiclesService } from '../../services/vehiclesService';
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
    estimatedArrival: dispatch?.estimatedArrival || ''
  });
  
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, driversRes, vehiclesRes] = await Promise.all([
          ordersService.getOrders({ status: 'pending' }),
          driversService.getDrivers(),
          vehiclesService.getVehicles()
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
          {drivers.filter(d => d.status === 'available').map((driver) => (
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
          {vehicles.filter(v => v.status === 'available').map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.registrationNumber} - {vehicle.make} {vehicle.model}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Estimated Arrival
        </label>
        <input
          type="datetime-local"
          value={formData.estimatedArrival}
          onChange={(e) => setFormData({ ...formData, estimatedArrival: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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