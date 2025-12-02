export interface User {
  id: number;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  name: string;
  phone?: string;
  role: 'ADMIN' | 'WAREHOUSE_STAFF' | 'DISPATCH_OFFICER' | 'DRIVER';
  status: 'ACTIVE' | 'INACTIVE';
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  id: number;
  name: string;
  code: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  unitCategory: string;
  location: string;
  barcode?: string;
  unitPrice: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  supplier?: string;
  description?: string;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryOrder {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  deliveryAddress: string;
  contactNumber: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  orderType: string;
  paymentMethod: string;
  totalAmount: number;
  deliveryInstructions?: string;
  driverId?: number;
  vehicleId?: number;
  createdBy: number;
  scheduledDate?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: number;
  orderId: number;
  itemId: number;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
}

export interface Vehicle {
  id: number;
  plateNumber: string;
  type: string;
  capacity: number;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'UNAVAILABLE';
  lastMaintenance?: Date;
  fuelType?: string;
  vehicleModel?: string;
  year?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver {
  id: number;
  userId: number;
  name: string;
  licenseNumber: string;
  phone: string;
  status: 'AVAILABLE' | 'ON_DUTY' | 'OFF_DUTY';
  currentVehicleId?: number;
  experience?: number;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Dispatch {
  id: number;
  orderId: number;
  driverId: number;
  vehicleId: number;
  scheduledDate: Date;
  dispatchedAt?: Date;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  fuelAllowance: number;
  route?: string;
  notes?: string;
  status: 'PENDING' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

