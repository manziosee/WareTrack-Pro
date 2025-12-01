// Order Status
export type OrderStatus = 'pending' | 'dispatched' | 'in_transit' | 'delivered' | 'cancelled';

// Order Priority
export type OrderPriority = 'high' | 'medium' | 'low';

// User Roles
export type UserRole = 'admin' | 'warehouse_staff' | 'dispatch_officer' | 'driver';

// Vehicle Status
export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'unavailable';

// Stock Alert Level
export type StockAlertLevel = 'critical' | 'low' | 'normal' | 'high';

// Delivery Stage
export type DeliveryStage = 'pending' | 'dispatched' | 'in_transit' | 'delivered';

// User Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  lastLogin?: Date;
}

// Auth User Types
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
}

// Inventory Types
export interface InventoryItem {
  id: number;
  name: string;
  code: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  location: string;
  barcode?: string;
  lastUpdated: Date;
  unitPrice?: number;
  status?: 'active' | 'inactive' | 'discontinued';
  supplier?: string;
  description?: string;
}

// Order Types
export interface DeliveryOrder {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  deliveryAddress: string;
  contactNumber: string;
  items: OrderItem[];
  priority: OrderPriority;
  status: OrderStatus;
  driverId?: number;
  vehicleId?: number;
  createdAt: Date;
  scheduledDate?: Date;
  deliveredAt?: Date;
  deliveryInstructions?: string;
  orderType?: string;
  paymentMethod?: string;
}

export interface OrderItem {
  itemId: number;
  itemName: string;
  quantity: number;
  unit: string;
}

// Vehicle Types
export interface Vehicle {
  id: number;
  plateNumber: string;
  type: string;
  capacity: number;
  status: VehicleStatus;
  lastMaintenance?: Date;
}

// Driver Types
export interface Driver {
  id: number;
  userId: number;
  name: string;
  licenseNumber: string;
  phone: string;
  status: 'available' | 'on_duty' | 'off_duty';
  currentVehicleId?: number;
}

// Dispatch Types
export interface Dispatch {
  id: number;
  orderId: number;
  driverId: number;
  vehicleId: number;
  scheduledDate: Date;
  dispatchedAt?: Date;
  notes?: string;
  status: OrderStatus;
}

// Delivery Tracking Types
export interface DeliveryTracking {
  orderId: number;
  stages: DeliveryStage[];
  currentStage: DeliveryStage;
  timeline: TrackingEvent[];
}

export interface TrackingEvent {
  stage: DeliveryStage;
  timestamp: Date;
  location?: string;
  notes?: string;
}

// Report Types
export interface DashboardStats {
  totalInventory: number;
  deliveriesToday: number;
  pendingDispatches: number;
  inTransit: number;
  lowStockItems: number;
}

export interface DeliveryTrend {
  date: string;
  delivered: number;
  pending: number;
  inTransit: number;
}