export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'warehouse_staff' | 'dispatch_officer' | 'driver';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  _id: string;
  userId: string;
  licenseNumber: string;
  phoneNumber: string;
  status: 'available' | 'on_delivery' | 'off_duty';
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalInventory: number;
  deliveriesToday: number;
  pendingDispatches: number;
  inTransitShipments: number;
  lowStockItems: number;
}