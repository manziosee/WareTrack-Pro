import { pgTable, serial, varchar, text, integer, decimal, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'warehouse_staff', 'dispatch_officer', 'driver']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'dispatched', 'in_transit', 'delivered', 'cancelled']);
export const orderPriorityEnum = pgEnum('order_priority', ['high', 'medium', 'low']);
export const vehicleStatusEnum = pgEnum('vehicle_status', ['available', 'in_use', 'maintenance', 'unavailable']);
export const driverStatusEnum = pgEnum('driver_status', ['available', 'on_duty', 'off_duty']);
export const inventoryStatusEnum = pgEnum('inventory_status', ['active', 'inactive', 'discontinued']);
export const dispatchStatusEnum = pgEnum('dispatch_status', ['pending', 'dispatched', 'in_transit', 'delivered', 'cancelled']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  role: userRoleEnum('role').notNull().default('warehouse_staff'),
  status: userStatusEnum('status').notNull().default('active'),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Inventory items table
export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  category: varchar('category', { length: 100 }).notNull(),
  quantity: integer('quantity').notNull().default(0),
  minQuantity: integer('min_quantity').notNull().default(0),
  unit: varchar('unit', { length: 50 }).notNull(),
  unitCategory: varchar('unit_category', { length: 50 }).notNull(),
  location: varchar('location', { length: 100 }).notNull(),
  barcode: varchar('barcode', { length: 255 }),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull().default('0'),
  status: inventoryStatusEnum('status').notNull().default('active'),
  supplier: varchar('supplier', { length: 255 }),
  description: text('description'),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Vehicles table
export const vehicles = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  plateNumber: varchar('plate_number', { length: 20 }).notNull().unique(),
  type: varchar('type', { length: 50 }).notNull(),
  capacity: integer('capacity').notNull(),
  status: vehicleStatusEnum('status').notNull().default('available'),
  lastMaintenance: timestamp('last_maintenance'),
  fuelType: varchar('fuel_type', { length: 20 }),
  vehicleModel: varchar('vehicle_model', { length: 100 }),
  year: integer('year'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Drivers table
export const drivers = pgTable('drivers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  licenseNumber: varchar('license_number', { length: 50 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }).notNull(),
  status: driverStatusEnum('status').notNull().default('available'),
  currentVehicleId: integer('current_vehicle_id').references(() => vehicles.id),
  experience: integer('experience'),
  rating: decimal('rating', { precision: 3, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Delivery orders table
export const deliveryOrders = pgTable('delivery_orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  customerId: integer('customer_id').notNull(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  deliveryAddress: text('delivery_address').notNull(),
  contactNumber: varchar('contact_number', { length: 20 }).notNull(),
  priority: orderPriorityEnum('priority').notNull().default('medium'),
  status: orderStatusEnum('status').notNull().default('pending'),
  orderType: varchar('order_type', { length: 50 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  deliveryInstructions: text('delivery_instructions'),
  driverId: integer('driver_id').references(() => drivers.id),
  vehicleId: integer('vehicle_id').references(() => vehicles.id),
  createdBy: integer('created_by').notNull().references(() => users.id),
  scheduledDate: timestamp('scheduled_date'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Order items table
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => deliveryOrders.id, { onDelete: 'cascade' }),
  itemId: integer('item_id').notNull().references(() => inventoryItems.id),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Dispatches table
export const dispatches = pgTable('dispatches', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => deliveryOrders.id, { onDelete: 'cascade' }),
  driverId: integer('driver_id').notNull().references(() => drivers.id),
  vehicleId: integer('vehicle_id').notNull().references(() => vehicles.id),
  scheduledDate: timestamp('scheduled_date').notNull(),
  dispatchedAt: timestamp('dispatched_at'),
  estimatedDelivery: timestamp('estimated_delivery'),
  actualDelivery: timestamp('actual_delivery'),
  fuelAllowance: decimal('fuel_allowance', { precision: 10, scale: 2 }).notNull().default('0'),
  route: text('route'),
  notes: text('notes'),
  status: dispatchStatusEnum('status').notNull().default('pending'),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Maintenance records table
export const maintenanceRecords = pgTable('maintenance_records', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  description: text('description').notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }).notNull().default('0'),
  odometerReading: integer('odometer_reading'),
  nextServiceOdometer: integer('next_service_odometer'),
  nextServiceDate: timestamp('next_service_date'),
  performedBy: varchar('performed_by', { length: 255 }),
  notes: text('notes'),
  scheduledDate: timestamp('scheduled_date').notNull(),
  completedDate: timestamp('completed_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Inventory history table
export const inventoryHistory = pgTable('inventory_history', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 20 }).notNull(), // stock_in, stock_out, adjustment
  quantity: integer('quantity').notNull(),
  previousQuantity: integer('previous_quantity').notNull(),
  newQuantity: integer('new_quantity').notNull(),
  orderId: integer('order_id').references(() => deliveryOrders.id),
  notes: text('notes'),
  performedBy: integer('performed_by').notNull().references(() => users.id),
  performedAt: timestamp('performed_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdOrders: many(deliveryOrders),
  createdDispatches: many(dispatches),
  driverProfile: many(drivers),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(users, {
    fields: [drivers.userId],
    references: [users.id],
  }),
  currentVehicle: one(vehicles, {
    fields: [drivers.currentVehicleId],
    references: [vehicles.id],
  }),
  orders: many(deliveryOrders),
  dispatches: many(dispatches),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  orders: many(deliveryOrders),
  dispatches: many(dispatches),
  currentDrivers: many(drivers),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const deliveryOrdersRelations = relations(deliveryOrders, ({ one, many }) => ({
  driver: one(drivers, {
    fields: [deliveryOrders.driverId],
    references: [drivers.id],
  }),
  vehicle: one(vehicles, {
    fields: [deliveryOrders.vehicleId],
    references: [vehicles.id],
  }),
  createdByUser: one(users, {
    fields: [deliveryOrders.createdBy],
    references: [users.id],
  }),
  items: many(orderItems),
  dispatches: many(dispatches),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(deliveryOrders, {
    fields: [orderItems.orderId],
    references: [deliveryOrders.id],
  }),
  item: one(inventoryItems, {
    fields: [orderItems.itemId],
    references: [inventoryItems.id],
  }),
}));

export const dispatchesRelations = relations(dispatches, ({ one }) => ({
  order: one(deliveryOrders, {
    fields: [dispatches.orderId],
    references: [deliveryOrders.id],
  }),
  driver: one(drivers, {
    fields: [dispatches.driverId],
    references: [drivers.id],
  }),
  vehicle: one(vehicles, {
    fields: [dispatches.vehicleId],
    references: [vehicles.id],
  }),
  createdByUser: one(users, {
    fields: [dispatches.createdBy],
    references: [users.id],
  }),
}));