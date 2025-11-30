export interface User {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'warehouse_staff' | 'dispatch_officer' | 'driver';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  _id: string;
  itemCode: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  minStockLevel: number;
  unitPrice: number;
  barcode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryOrder {
  _id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  items: OrderItem[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'dispatched' | 'in_transit' | 'delivered' | 'cancelled';
  assignedDriver?: string;
  assignedVehicle?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
}

export interface Vehicle {
  _id: string;
  plateNumber: string;
  type: string;
  capacity: number;
  status: 'available' | 'in_use' | 'maintenance';
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver {
  _id: string;
  userId: string;
  licenseNumber: string;
  phoneNumber: string;
  status: 'available' | 'on_delivery' | 'off_duty';
  createdAt: Date;
  updatedAt: Date;
}

export interface Dispatch {
  _id: string;
  dispatchNumber: string;
  orderId: string;
  driverId: string;
  vehicleId: string;
  dispatchedBy: string;
  dispatchedAt: Date;
  estimatedDelivery: Date;
  actualDelivery?: Date;
  notes?: string;
  status: 'scheduled' | 'dispatched' | 'completed';
}

export interface DeliveryConfirmation {
  _id: string;
  orderId: string;
  deliveredAt: Date;
  deliveredBy: string;
  signature?: string;
  deliveryCode?: string;
  notes?: string;
}