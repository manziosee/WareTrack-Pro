import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WareTrack-Pro API',
      version: '2.4.0',
      description: 'Warehouse and delivery operations API with company and branch isolation. Authenticated requests may select a membership using X-Company-Id and X-Branch-Id; omitted values use the account default and first assigned branch. Includes action-based permissions, inventory reservations, and auditable stock movements.',
      contact: {
        name: 'WareTrack-Pro Support',
        email: 'support@waretrackpro.com'
      }
    },
    servers: [
      {
        url: 'https://waretrack-pro.onrender.com',
        description: 'Production (Render)'
      },
      {
        url: 'http://localhost:5000',
        description: 'Local development'
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
            role: { type: 'string', description: 'Company or branch role. Built-in roles are ADMIN, WAREHOUSE_STAFF, DISPATCH_OFFICER, and DRIVER; companies may define custom roles.' },
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
  // Resolve relative to this file so it works from src/ (ts) in development and dist/ (js) in production
  apis: [
    path.join(__dirname, '../routes/*.{ts,js}'),
    path.join(__dirname, '../controllers/*.{ts,js}')
  ]
};

export const specs = swaggerJSDoc(options);
export const swaggerSpec = specs;
export { swaggerUi };
type RouterLike = { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> };

const PUBLIC_PATHS = new Set([
  '/api/auth/register', '/api/auth/login', '/api/auth/verify-login-otp', '/api/auth/refresh',
  '/api/password-reset/request-reset', '/api/password-reset/verify-otp', '/api/password-reset/reset-password',
  '/api/password-reset/resend-otp', '/api/features/customer/register', '/api/features/customer/login',
  '/api/features/customer/track/{orderNumber}', '/api/features/proof-of-delivery/verify/{code}',
  '/api/public/track/{orderNumber}', '/api/public/catalog', '/api/public/orders'
]);

/**
 * Adds a basic entry for every mounted route that has no hand-written JSDoc,
 * so Swagger always lists the full API. Documented routes are left untouched.
 */
export function addUndocumentedRoutes(spec: any, mounts: Array<[string, string, RouterLike]>) {
  spec.paths = spec.paths || {};
  spec.tags = spec.tags || [];
  spec.components = spec.components || {};
  spec.components.securitySchemes = { ...(spec.components.securitySchemes || {}), apiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } };
  spec.components.parameters = {
    ...(spec.components.parameters || {}),
    companyIdHeader: { name: 'X-Company-Id', in: 'header', required: false, description: 'Company membership to use; defaults to the account company.', schema: { type: 'integer', minimum: 1 } },
    branchIdHeader: { name: 'X-Branch-Id', in: 'header', required: false, description: 'Assigned branch to use; defaults to the first active branch membership.', schema: { type: 'integer', minimum: 1 } },
  };
  const knownTags = new Set(spec.tags.map((t: any) => t.name));

  for (const [prefix, tag, router] of mounts) {
    if (!knownTags.has(tag)) {
      spec.tags.push({ name: tag });
      knownTags.add(tag);
    }
    for (const layer of router.stack) {
      if (!layer.route) continue;
      const sub = layer.route.path === '/' ? '' : layer.route.path;
      const openApiPath = `${prefix}${sub}`.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
      const params = [...openApiPath.matchAll(/\{([^}]+)\}/g)].map((m) => ({
        name: m[1], in: 'path', required: true, schema: { type: 'string' }
      }));

      for (const method of Object.keys(layer.route.methods)) {
        spec.paths[openApiPath] = spec.paths[openApiPath] || {};
        if (spec.paths[openApiPath][method]) continue;
        const entry: any = {
          tags: [tag],
          summary: `${method.toUpperCase()} ${openApiPath}`,
          description: 'See the Postman collection for an example request body.',
          parameters: params,
          responses: {
            200: { description: 'Success' },
            401: { description: 'Missing or invalid token' },
            403: { description: 'Not allowed for your role' }
          }
        };
        if (['post', 'put', 'patch'].includes(method)) {
          entry.requestBody = { content: { 'application/json': { schema: { type: 'object' } } } };
        }
        if (openApiPath.startsWith('/api/intake/')) {
          entry.security = [{ apiKeyAuth: [] }];
          entry.description = 'Send the key from Settings → Online ordering & API in the X-API-Key header.';
        } else if (!PUBLIC_PATHS.has(openApiPath)) entry.security = [{ bearerAuth: [] }];
        spec.paths[openApiPath][method] = entry;
      }
    }
  }

  // Add tenant selection controls to documented and generated authenticated
  // routes so the Swagger UI exercises the same isolation headers as the app.
  for (const [routePath, pathItem] of Object.entries(spec.paths) as Array<[string, any]>) {
    if (!routePath.startsWith('/api/')) continue;
    for (const [method, operation] of Object.entries(pathItem) as Array<[string, any]>) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method) || !operation || PUBLIC_PATHS.has(routePath)) continue;
      operation.parameters = operation.parameters || [];
      for (const ref of ['#/components/parameters/companyIdHeader', '#/components/parameters/branchIdHeader']) {
        if (!operation.parameters.some((parameter: any) => parameter.$ref === ref)) operation.parameters.push({ $ref: ref });
      }
    }
  }
  return spec;
}
