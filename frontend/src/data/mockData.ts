import type { User, InventoryItem, DeliveryOrder, Vehicle, Driver, DashboardStats, DeliveryTrend } from '@/types';

export const mockUsers: User[] = [
  { id: 1, name: 'John Admin', email: 'admin@waretrack.com', role: 'admin', phone: '+1234567890', status: 'active', createdAt: new Date('2024-01-15'), lastLogin: new Date() },
  { id: 2, name: 'Sarah Wilson', email: 'sarah@waretrack.com', role: 'warehouse_staff', phone: '+1234567891', status: 'active', createdAt: new Date('2024-02-10'), lastLogin: new Date() },
  { id: 3, name: 'Mike Johnson', email: 'mike@waretrack.com', role: 'dispatch_officer', phone: '+1234567892', status: 'active', createdAt: new Date('2024-03-05'), lastLogin: new Date() },
  { id: 4, name: 'David Brown', email: 'david@waretrack.com', role: 'driver', phone: '+1234567893', status: 'active', createdAt: new Date('2024-03-20'), lastLogin: new Date() },
  { id: 5, name: 'Emma Davis', email: 'emma@waretrack.com', role: 'driver', phone: '+1234567894', status: 'active', createdAt: new Date('2024-04-01') },
];

export const mockInventory: InventoryItem[] = [
  { id: 1, name: 'Laptop Dell XPS 15', code: 'ELEC-001', category: 'Electronics', quantity: 45, minQuantity: 20, unit: 'pcs', location: 'A-01', barcode: '123456789', lastUpdated: new Date() },
  { id: 2, name: 'Office Chair Ergonomic', code: 'FURN-001', category: 'Furniture', quantity: 12, minQuantity: 15, unit: 'pcs', location: 'B-03', lastUpdated: new Date() },
  { id: 3, name: 'Printer HP LaserJet', code: 'ELEC-002', category: 'Electronics', quantity: 8, minQuantity: 10, unit: 'pcs', location: 'A-05', lastUpdated: new Date() },
  { id: 4, name: 'Standing Desk', code: 'FURN-002', category: 'Furniture', quantity: 25, minQuantity: 10, unit: 'pcs', location: 'B-01', lastUpdated: new Date() },
  { id: 5, name: 'Monitor 27" 4K', code: 'ELEC-003', category: 'Electronics', quantity: 60, minQuantity: 30, unit: 'pcs', location: 'A-02', lastUpdated: new Date() },
  { id: 6, name: 'Wireless Mouse', code: 'ELEC-004', category: 'Electronics', quantity: 5, minQuantity: 50, unit: 'pcs', location: 'A-10', lastUpdated: new Date() },
];

export const mockOrders: DeliveryOrder[] = [
  {
    id: 1,
    orderNumber: 'ORD-000001',
    customerId: 101,
    customerName: 'TechCorp Inc.',
    deliveryAddress: '123 Business Ave, Tech City, TC 12345',
    contactNumber: '+1555123456',
    items: [{ itemId: 1, itemName: 'Laptop Dell XPS 15', quantity: 5, unit: 'pcs', unitPrice: 850000 }],
    priority: 'high',
    status: 'in_transit',
    driverId: 4,
    vehicleId: 1,
    createdAt: new Date('2024-11-28'),
    scheduledDate: new Date('2024-11-30'),
  },
  {
    id: 2,
    orderNumber: 'ORD-000002',
    customerId: 102,
    customerName: 'Office Solutions Ltd.',
    deliveryAddress: '456 Commerce St, Business Park, BP 67890',
    contactNumber: '+1555123457',
    items: [
      { itemId: 2, itemName: 'Office Chair Ergonomic', quantity: 10, unit: 'pcs', unitPrice: 125000 },
      { itemId: 4, itemName: 'Standing Desk', quantity: 5, unit: 'pcs', unitPrice: 275000 }
    ],
    priority: 'medium',
    status: 'dispatched',
    driverId: 5,
    vehicleId: 2,
    createdAt: new Date('2024-11-29'),
    scheduledDate: new Date('2024-12-01'),
  },
  {
    id: 3,
    orderNumber: 'ORD-000003',
    customerId: 103,
    customerName: 'StartUp Hub',
    deliveryAddress: '789 Innovation Blvd, Startup City, SC 11111',
    contactNumber: '+1555123458',
    items: [{ itemId: 5, itemName: 'Monitor 27" 4K', quantity: 15, unit: 'pcs', unitPrice: 320000 }],
    priority: 'high',
    status: 'pending',
    createdAt: new Date('2024-11-30'),
    scheduledDate: new Date('2024-12-02'),
  },
  {
    id: 4,
    orderNumber: 'ORD-000004',
    customerId: 104,
    customerName: 'Digital Agency Pro',
    deliveryAddress: '321 Creative Lane, Design District, DD 22222',
    contactNumber: '+1555123459',
    items: [{ itemId: 3, itemName: 'Printer HP LaserJet', quantity: 3, unit: 'pcs', unitPrice: 180000 }],
    priority: 'low',
    status: 'delivered',
    driverId: 4,
    vehicleId: 1,
    createdAt: new Date('2024-11-25'),
    scheduledDate: new Date('2024-11-27'),
    deliveredAt: new Date('2024-11-27'),
  },
];

export const mockVehicles: Vehicle[] = [
  { id: 1, plateNumber: 'TRK-001', type: 'Box Truck', capacity: 5000, status: 'in_use', lastMaintenance: new Date('2024-10-15') },
  { id: 2, plateNumber: 'VAN-002', type: 'Cargo Van', capacity: 2000, status: 'in_use', lastMaintenance: new Date('2024-11-01') },
  { id: 3, plateNumber: 'TRK-003', type: 'Box Truck', capacity: 5000, status: 'available', lastMaintenance: new Date('2024-11-20') },
  { id: 4, plateNumber: 'VAN-004', type: 'Cargo Van', capacity: 2000, status: 'maintenance' },
];

export const mockDrivers: Driver[] = [
  { id: 1, userId: 4, name: 'David Brown', licenseNumber: 'DL-12345', phone: '+1234567893', status: 'on_duty', currentVehicleId: 1 },
  { id: 2, userId: 5, name: 'Emma Davis', licenseNumber: 'DL-67890', phone: '+1234567894', status: 'on_duty', currentVehicleId: 2 },
];

export const mockDashboardStats: DashboardStats = {
  totalInventory: 155,
  deliveriesToday: 8,
  pendingDispatches: 5,
  inTransit: 3,
  lowStockItems: 3,
};

export const mockDeliveryTrends: DeliveryTrend[] = [
  { date: '2024-11-24', delivered: 12, pending: 3, inTransit: 2 },
  { date: '2024-11-25', delivered: 15, pending: 4, inTransit: 3 },
  { date: '2024-11-26', delivered: 10, pending: 5, inTransit: 2 },
  { date: '2024-11-27', delivered: 18, pending: 2, inTransit: 4 },
  { date: '2024-11-28', delivered: 14, pending: 6, inTransit: 3 },
  { date: '2024-11-29', delivered: 16, pending: 4, inTransit: 5 },
  { date: '2024-11-30', delivered: 8, pending: 5, inTransit: 3 },
];