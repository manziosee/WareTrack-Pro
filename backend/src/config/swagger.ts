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
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            role: { 
              type: 'string',
              enum: ['admin', 'warehouse_staff', 'dispatch_officer', 'driver']
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive']
            },
            lastLogin: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string' },
            customerName: { type: 'string' },
            customerEmail: { type: 'string' },
            deliveryAddress: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'dispatched', 'in_transit', 'delivered', 'cancelled']
            },
            totalAmount: { type: 'number' },
            orderDate: { type: 'string', format: 'date-time' },
            deliveryDate: { type: 'string', format: 'date-time' }
          }
        },
        InventoryItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            code: { type: 'string' },
            category: { type: 'string' },
            quantity: { type: 'number' },
            minQuantity: { type: 'number' },
            unitPrice: { type: 'number' },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'discontinued']
            },
            location: { type: 'string' },
            supplier: { type: 'string' }
          }
        },
        Vehicle: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            registrationNumber: { type: 'string' },
            make: { type: 'string' },
            model: { type: 'string' },
            year: { type: 'number' },
            type: { type: 'string' },
            capacity: { type: 'number' },
            status: {
              type: 'string',
              enum: ['available', 'in_use', 'maintenance', 'unavailable']
            }
          }
        },
        Driver: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            name: { type: 'string' },
            licenseNumber: { type: 'string' },
            phone: { type: 'string' },
            status: {
              type: 'string',
              enum: ['available', 'on_duty', 'off_duty']
            },
            experience: { type: 'number' },
            rating: { type: 'string' }
          }
        },
        Dispatch: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderId: { type: 'string' },
            driverId: { type: 'string' },
            vehicleId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled']
            },
            startTime: { type: 'string', format: 'date-time' },
            estimatedArrival: { type: 'string', format: 'date-time' },
            currentLocation: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' }
              }
            }
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
      { name: 'Authentication', description: 'User authentication and authorization' },
      { name: 'Dashboard', description: 'Dashboard statistics and metrics' },
      { name: 'Orders', description: 'Order management operations' },
      { name: 'Inventory', description: 'Inventory management operations' },
      { name: 'Dispatch', description: 'Dispatch and delivery operations' },
      { name: 'Users', description: 'User management operations' },
      { name: 'Vehicles', description: 'Vehicle management operations' },
      { name: 'Drivers', description: 'Driver management operations' },
      { name: 'Reports', description: 'Reporting and analytics' },
      { name: 'Email Testing', description: 'Email notification testing' }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

export const specs = swaggerJSDoc(options);
export { swaggerUi };