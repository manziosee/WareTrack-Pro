export const mockAuditEntries = [
  {
    id: '1',
    action: 'Order Created',
    user: 'John Smith',
    timestamp: '2024-01-15 10:30:00',
    details: 'Created order ORD-000001 for TechCorp Inc.',
    type: 'order' as const
  },
  {
    id: '2',
    action: 'Inventory Updated',
    user: 'Sarah Johnson',
    timestamp: '2024-01-15 10:25:00',
    details: 'Updated stock for Wireless Mouse - Quantity changed from 15 to 8',
    type: 'inventory' as const
  },
  {
    id: '3',
    action: 'Dispatch Scheduled',
    user: 'Mike Wilson',
    timestamp: '2024-01-15 10:20:00',
    details: 'Scheduled dispatch for order ORD-000001 - Driver: David Brown, Vehicle: VAN-001',
    type: 'dispatch' as const
  },
  {
    id: '4',
    action: 'Order Status Updated',
    user: 'David Brown',
    timestamp: '2024-01-15 10:15:00',
    details: 'Order ORD-000001 status changed from Pending to Dispatched',
    type: 'order' as const
  },
  {
    id: '5',
    action: 'User Login',
    user: 'Admin User',
    timestamp: '2024-01-15 09:00:00',
    details: 'User logged into the system',
    type: 'user' as const
  },
  {
    id: '6',
    action: 'Delivery Confirmed',
    user: 'David Brown',
    timestamp: '2024-01-15 14:30:00',
    details: 'Order ORD-000001 delivered successfully with customer signature',
    type: 'delivery' as const
  }
];