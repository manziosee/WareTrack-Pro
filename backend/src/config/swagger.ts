import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WareTrack-Pro API',
      version: '1.0.0',
      description: 'Comprehensive Warehouse Delivery & Dispatch Tracking System API',
      contact: {
        name: 'WareTrack-Pro Support',
        email: 'support@waretrackpro.com'
      }
    },
    servers: [
      {
        url: 'https://waretrack-pro.onrender.com',
        description: 'Production server'
      },
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'http://localhost:5000',
        description: 'Local development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            role: { 
              type: 'string',
              enum: ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER', 'DRIVER'],
              description: 'User role with specific permissions'
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE'],
              description: 'Account activation status'
            },
            isActive: { type: 'boolean' },
            lastLogin: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        DeliveryOrder: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            orderNumber: { type: 'string', description: 'Unique order identifier' },
            customerName: { type: 'string' },
            customerEmail: { type: 'string', format: 'email' },
            customerPhone: { type: 'string' },
            deliveryAddress: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
              description: 'Current order status'
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH'],
              description: 'Order priority level'
            },
            totalAmount: { type: 'number', format: 'decimal' },
            paymentMethod: { type: 'string' },
            paymentStatus: { type: 'string' },
            scheduledDate: { type: 'string', format: 'date-time' },
            deliveredAt: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            createdById: { type: 'integer' },
            driverId: { type: 'integer' },
            vehicleId: { type: 'integer' }
          }
        },
        InventoryItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            code: { type: 'string', description: 'Unique item code/SKU' },
            category: { type: 'string' },
            quantity: { type: 'integer', minimum: 0 },
            minQuantity: { type: 'integer', minimum: 0, description: 'Minimum stock threshold' },
            unitPrice: { type: 'number', format: 'decimal', minimum: 0 },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
              description: 'Item availability status'
            },
            location: { type: 'string', description: 'Warehouse location' },
            supplier: { type: 'string' },
            description: { type: 'string' },
            barcode: { type: 'string' },
            weight: { type: 'number', format: 'decimal' },
            dimensions: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            lastUpdated: { type: 'string', format: 'date-time' }
          }
        },
        Vehicle: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            plateNumber: { type: 'string', description: 'Vehicle registration/plate number' },
            make: { type: 'string' },
            model: { type: 'string' },
            year: { type: 'integer', minimum: 1900, maximum: 2030 },
            type: { 
              type: 'string',
              enum: ['TRUCK', 'VAN', 'MOTORCYCLE', 'CAR'],
              description: 'Vehicle type for delivery'
            },
            capacity: { type: 'number', format: 'decimal', minimum: 0, description: 'Load capacity in kg' },
            status: {
              type: 'string',
              enum: ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE'],
              description: 'Current vehicle status'
            },
            fuelType: { type: 'string' },
            mileage: { type: 'number', format: 'decimal' },
            lastMaintenance: { type: 'string', format: 'date' },
            nextMaintenance: { type: 'string', format: 'date' },
            insuranceExpiry: { type: 'string', format: 'date' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Driver: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer', description: 'Reference to User table' },
            name: { type: 'string' },
            licenseNumber: { type: 'string', description: 'Driver license number' },
            phone: { type: 'string' },
            status: {
              type: 'string',
              enum: ['AVAILABLE', 'ON_DUTY', 'OFF_DUTY'],
              description: 'Current driver availability status'
            },
            experience: { type: 'integer', minimum: 0, description: 'Years of driving experience' },
            rating: { type: 'number', format: 'decimal', minimum: 0, maximum: 5 },
            licenseExpiry: { type: 'string', format: 'date' },
            emergencyContact: { type: 'string' },
            address: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date' },
            hireDate: { type: 'string', format: 'date' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Dispatch: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            orderId: { type: 'integer', description: 'Reference to DeliveryOrder' },
            driverId: { type: 'integer', description: 'Assigned driver ID' },
            vehicleId: { type: 'integer', description: 'Assigned vehicle ID' },
            status: {
              type: 'string',
              enum: ['PENDING', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'],
              description: 'Current dispatch status'
            },
            dispatchTime: { type: 'string', format: 'date-time' },
            estimatedArrival: { type: 'string', format: 'date-time' },
            actualArrival: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
            confirmationCode: { type: 'string', description: 'Delivery confirmation code' },
            currentLocation: {
              type: 'object',
              properties: {
                latitude: { type: 'number', format: 'decimal' },
                longitude: { type: 'number', format: 'decimal' },
                address: { type: 'string' }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            createdById: { type: 'integer' }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer', description: 'Target user ID (null for global notifications)' },
            type: {
              type: 'string',
              enum: ['ORDER_UPDATE', 'LOW_STOCK', 'DELIVERY_ASSIGNMENT', 'SYSTEM_ALERT', 'WELCOME'],
              description: 'Notification type'
            },
            severity: {
              type: 'string',
              enum: ['INFO', 'WARNING', 'ERROR', 'SUCCESS'],
              description: 'Notification severity level'
            },
            title: { type: 'string' },
            message: { type: 'string' },
            read: { type: 'boolean', default: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                totalPages: { type: 'number' }
              }
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: {
              type: 'string',
              example: 'John Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            },
            password: {
              type: 'string',
              minLength: 6,
              example: 'password123'
            },
            phone: {
              type: 'string',
              example: '+1234567890'
            },
            role: {
              type: 'string',
              enum: ['WAREHOUSE_STAFF', 'DISPATCH_OFFICER', 'DRIVER'],
              example: 'WAREHOUSE_STAFF',
              description: 'User role (ADMIN role is restricted to first user only)'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            },
            password: {
              type: 'string',
              example: 'password123'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                },
                tokens: {
                  type: 'object',
                  properties: {
                    access: {
                      type: 'string',
                      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    },
                    refresh: {
                      type: 'string',
                      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    }
                  }
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  example: 'Validation failed'
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication, registration, and JWT token management' },
      { name: 'Dashboard', description: 'Real-time dashboard statistics, metrics, and role-based data' },
      { name: 'Orders', description: 'Delivery order management with full CRUD operations' },
      { name: 'Inventory', description: 'Inventory management with stock tracking and alerts' },
      { name: 'Dispatch', description: 'Dispatch operations with real-time tracking and status updates' },
      { name: 'Users', description: 'User management with role-based access control (RBAC)' },
      { name: 'Vehicles', description: 'Fleet management with maintenance tracking' },
      { name: 'Drivers', description: 'Driver management with availability and performance tracking' },
      { name: 'Notifications', description: 'Real-time notification system with database storage' },
      { name: 'Reports', description: 'Advanced reporting and analytics with export capabilities' },
      { name: 'Email Testing', description: 'Email notification testing and template validation' },
      { name: 'Health Check', description: 'System health monitoring and status endpoints' }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

export const specs = swaggerJSDoc(options);
export { swaggerUi };