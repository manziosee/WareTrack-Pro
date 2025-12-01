# WareTrack Pro API Documentation

## Table of Contents
1. [Authentication](#authentication)
2. [Dashboard](#dashboard)
3. [Reports](#reports)
4. [Dispatch](#dispatch)
5. [Inventory](#inventory)
6. [Orders](#orders)
7. [Users](#users)
8. [Vehicles](#vehicles)
9. [Drivers](#drivers)

## Base URL
```
http://localhost:5000/api
```

## Authentication

### Register User
- **URL**: `/auth/register`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "password": "string",
    "role": "admin | warehouse_staff | dispatch_officer | driver"
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "string",
        "firstName": "string",
        "lastName": "string",
        "email": "string",
        "role": "string",
        "status": "active"
      },
      "tokens": {
        "access": "string",
        "refresh": "string"
      }
    }
  }
  ```

### Login
- **URL**: `/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "string",
        "firstName": "string",
        "lastName": "string",
        "email": "string",
        "role": "string"
      },
      "tokens": {
        "access": "string",
        "refresh": "string"
      }
    }
  }
  ```

### Get Current User Profile
- **URL**: `/auth/me`
- **Method**: `GET`
- **Auth Required**: Yes
- **Headers**:
  - `Authorization: Bearer <access_token>`
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "phone": "string",
      "role": "string",
      "status": "active | inactive",
      "lastLogin": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Refresh Token
- **URL**: `/auth/refresh`
- **Method**: `POST`
- **Auth Required**: Yes (refresh token in body)
- **Request Body**:
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "access": "string",
      "refresh": "string"
    }
  }
  ```

### Logout
- **URL**: `/auth/logout`
- **Method**: `POST`
- **Auth Required**: Yes
- **Headers**:
  - `Authorization: Bearer <access_token>`
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Successfully logged out"
  }
  ```

## Dashboard

### Get Dashboard Statistics
- **URL**: `/dashboard/stats`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Params**:
  - `period`: `day | week | month | year` (optional, default: 'month')
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "totalOrders": 150,
      "completedOrders": 120,
      "pendingOrders": 20,
      "totalRevenue": 25000,
      "activeVehicles": 8,
      "inMaintenance": 2,
      "lowStockItems": 5
    }
  }
  ```

### Get Delivery Trends
- **URL**: `/dashboard/trends`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Params**:
  - `period`: `week | month | year` (optional, default: 'month')
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "date": "2023-01-01",
        "completed": 5,
        "pending": 2,
        "cancelled": 0
      },
      // ... more data points
    ]
  }
  ```

## Reports

### Generate Inventory Report
- **URL**: `/reports/inventory`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Params**:
  - `category`: string (optional)
  - `status`: `in_stock | low_stock | out_of_stock` (optional)
  - `format`: `json | pdf | csv` (optional, default: 'json')
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "report": [
        {
          "id": "string",
          "name": "string",
          "category": "string",
          "quantity": 10,
          "minStockLevel": 5,
          "status": "in_stock",
          "lastRestocked": "2023-01-01T00:00:00.000Z"
        }
      ],
      "summary": {
        "totalItems": 50,
        "inStock": 30,
        "lowStock": 10,
        "outOfStock": 10,
        "totalValue": 10000
      }
    }
  }
  ```

### Generate Orders Report
- **URL**: `/reports/orders`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Params**:
  - `startDate`: string (ISO date)
  - `endDate`: string (ISO date)
  - `status`: `pending | processing | shipped | delivered | cancelled` (optional)
  - `format`: `json | pdf | csv` (optional, default: 'json')
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "orders": [
        {
          "id": "string",
          "orderNumber": "ORD-001",
          "customerName": "string",
          "status": "delivered",
          "totalAmount": 1000,
          "orderDate": "2023-01-01T00:00:00.000Z",
          "deliveryDate": "2023-01-03T00:00:00.000Z"
        }
      ],
      "summary": {
        "totalOrders": 100,
        "totalRevenue": 50000,
        "averageOrderValue": 500,
        "deliveryRate": 95.5
      }
    }
  }
  ```

### Generate Performance Report
- **URL**: `/reports/performance`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Params**:
  - `startDate`: string (ISO date)
  - `endDate`: string (ISO date)
  - `driverId`: string (optional)
  - `vehicleId`: string (optional)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "deliveryMetrics": {
        "onTimeDeliveries": 95,
        "delayedDeliveries": 5,
        "averageDeliveryTime": 2.5
      },
      "driverPerformance": [
        {
          "driverId": "string",
          "driverName": "string",
          "totalDeliveries": 50,
          "onTimeRate": 96,
          "averageRating": 4.8
        }
      ],
      "vehicleUtilization": [
        {
          "vehicleId": "string",
          "registrationNumber": "ABC123",
          "utilizationRate": 85.5,
          "distanceCovered": 2500,
          "fuelEfficiency": 8.5
        }
      ]
    }
  }
  ```

## Dispatch

### Get All Dispatches
- **URL**: `/dispatch`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Params**:
  - `status`: `pending | in_progress | completed | cancelled` (optional)
  - `startDate`: string (ISO date, optional)
  - `endDate`: string (ISO date, optional)
  - `page`: number (optional, default: 1)
  - `limit`: number (optional, default: 10)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "orderId": "string",
        "driverId": "string",
        "vehicleId": "string",
        "status": "in_progress",
        "startTime": "2023-01-01T10:00:00.000Z",
        "estimatedArrival": "2023-01-01T12:00:00.000Z",
        "actualArrival": null,
        "currentLocation": {
          "lat": 0,
          "lng": 0
        },
        "route": [
          {"lat": 0, "lng": 0},
          {"lat": 1, "lng": 1}
        ]
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
  ```

### Create New Dispatch
- **URL**: `/dispatch`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "orderId": "string",
    "driverId": "string",
    "vehicleId": "string",
    "estimatedArrival": "2023-01-01T12:00:00.000Z",
    "route": [
      {"lat": 0, "lng": 0},
      {"lat": 1, "lng": 1}
    ]
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "orderId": "string",
      "driverId": "string",
      "vehicleId": "string",
      "status": "pending",
      "startTime": "2023-01-01T10:00:00.000Z",
      "estimatedArrival": "2023-01-01T12:00:00.000Z",
      "currentLocation": {
        "lat": 0,
        "lng": 0
      },
      "route": [
        {"lat": 0, "lng": 0},
        {"lat": 1, "lng": 1}
      ]
    }
  }
  ```

### Get Active Dispatches
- **URL**: `/dispatch/active`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "orderId": "string",
        "driverName": "string",
        "vehicleRegistration": "ABC123",
        "status": "in_progress",
        "currentLocation": {
          "lat": 0,
          "lng": 0
        },
        "nextStop": "Customer Location",
        "estimatedArrival": "2023-01-01T12:00:00.000Z"
      }
    ]
  }
  ```

### Get Driver's Current Dispatch
- **URL**: `/dispatch/driver/{id}`
- **Method**: `GET`
- **Auth Required**: Yes
- **URL Params**:
  - `id`: string (Driver ID)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "orderId": "string",
      "orderNumber": "ORD-001",
      "customerName": "string",
      "deliveryAddress": "string",
      "status": "in_progress",
      "startTime": "2023-01-01T10:00:00.000Z",
      "estimatedArrival": "2023-01-01T12:00:00.000Z",
      "currentLocation": {
        "lat": 0,
        "lng": 0
      },
      "route": [
        {"lat": 0, "lng": 0},
        {"lat": 1, "lng": 1}
      ],
      "items": [
        {
          "id": "string",
          "name": "string",
          "quantity": 1
        }
      ]
    }
  }
  ```

### Update Dispatch Status
- **URL**: `/dispatch/{id}/status`
- **Method**: `POST`
- **Auth Required**: Yes
- **URL Params**:
  - `id`: string (Dispatch ID)
- **Request Body**:
  ```json
  {
    "status": "in_progress | completed | cancelled",
    "location": {
      "lat": 0,
      "lng": 0
    },
    "notes": "string"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "status": "in_progress",
      "updatedAt": "2023-01-01T10:30:00.000Z"
    }
  }
  ```

### Update Dispatch
- **URL**: `/dispatch/{id}`
- **Method**: `PUT`
- **Auth Required**: Yes
- **URL Params**:
  - `id`: string (Dispatch ID)
- **Request Body**:
  ```json
  {
    "driverId": "string",
    "vehicleId": "string",
    "estimatedArrival": "2023-01-01T12:00:00.000Z",
    "route": [
      {"lat": 0, "lng": 0},
      {"lat": 1, "lng": 1}
    ]
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "driverId": "string",
      "vehicleId": "string",
      "estimatedArrival": "2023-01-01T12:00:00.000Z",
      "updatedAt": "2023-01-01T10:30:00.000Z"
    }
  }
  ```

## Inventory

### Get Inventory Items
- **URL**: `/inventory`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Params**:
  - `category`: string (optional)
  - `status`: `in_stock | low_stock | out_of_stock` (optional)
  - `search`: string (optional)
  - `page`: number (optional, default: 1)
  - `limit`: number (optional, default: 10)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "name": "string",
        "sku": "string",
        "category": "string",
        "quantity": 10,
        "unit": "pcs | kg | l | m | box | pallet",
        "price": 100,
        "supplier": "string",
        "location": "A1-01",
        "minStockLevel": 5,
        "status": "in_stock",
        "lastRestocked": "2023-01-01T00:00:00.000Z",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
  ```

### Create Inventory Item
- **URL**: `/inventory`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "name": "string",
    "sku": "string",
    "category": "string",
    "quantity": 10,
    "unit": "pcs | kg | l | m | box | pallet",
    "price": 100,
    "supplier": "string",
    "location": "A1-01",
    "minStockLevel": 5,
    "description": "string"
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "name": "string",
      "sku": "string",
      "category": "string",
      "quantity": 10,
      "unit": "pcs",
      "price": 100,
      "supplier": "string",
      "location": "A1-01",
      "minStockLevel": 5,
      "status": "in_stock",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Get Inventory Statistics
- **URL**: `/inventory/stats`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "totalItems": 100,
      "totalValue": 50000,
      "outOfStock": 5,
      "lowStock": 10,
      "categories": [
        {
          "name": "Electronics",
          "count": 20,
          "value": 20000
        },
        {
          "name": "Clothing",
          "count": 30,
          "value": 15000
        }
      ]
    }
  }
  ```

### Get Low Stock Items
- **URL**: `/inventory/low-stock`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Params**:
  - `threshold`: number (optional, default: 10% of stock level)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "name": "string",
        "sku": "string",
        "quantity": 2,
        "minStockLevel": 10,
        "status": "low_stock",
        "supplier": "string"
      }
    ]
  }
  ```

### Get Inventory Item by ID
- **URL**: `/inventory/{id}`
- **Method**: `GET`
- **Auth Required**: Yes
- **URL Params**:
  - `id`: string (Inventory Item ID)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "name": "string",
      "sku": "string",
      "description": "string",
      "category": "string",
      "quantity": 10,
      "unit": "pcs",
      "price": 100,
      "supplier": "string",
      "location": "A1-01",
      "minStockLevel": 5,
      "status": "in_stock",
      "lastRestocked": "2023-01-01T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Update Inventory Item
- **URL**: `/inventory/{id}`
- **Method**: `PUT`
- **Auth Required**: Yes
- **URL Params**:
  - `id`: string (Inventory Item ID)
- **Request Body**:
  ```json
  {
    "name": "string",
    "category": "string",
    "quantity": 15,
    "price": 120,
    "minStockLevel": 5,
    "location": "A1-02"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "name": "string",
      "quantity": 15,
      "status": "in_stock",
      "updatedAt": "2023-01-02T00:00:00.000Z"
    }
  }
  ```

### Delete Inventory Item
- **URL**: `/inventory/{id}`
- **Method**: `DELETE`
- **Auth Required**: Yes (Admin only)
- **URL Params**:
  - `id`: string (Inventory Item ID)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Inventory item deleted successfully"
  }
  ```

### Get Inventory Categories
- **URL**: `/inventory/categories`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      "Electronics",
      "Clothing",
      "Food",
      "Beverages"
    ]
  }
  ```

### Bulk Import Inventory Items
- **URL**: `/inventory/import`
- **Method**: `POST`
- **Auth Required**: Yes (Admin only)
- **Request Body**: `multipart/form-data`
  - `file`: File (CSV/Excel file)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "total": 50,
      "imported": 48,
      "failed": 2,
      "errors": [
        {
          "row": 10,
          "error": "Invalid price format"
        },
        {
          "row": 25,
          "error": "Missing required field: name"
        }
      ]
    }
  }
  ```

### Get Inventory Item History
- **URL**: `/inventory/{id}/history`
- **Method**: `GET`
- **Auth Required**: Yes
- **URL Params**:
  - `id`: string (Inventory Item ID)
- **Query Params**:
  - `startDate`: string (ISO date, optional)
  - `endDate`: string (ISO date, optional)
  - `action`: `stock_in | stock_out | adjustment` (optional)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "action": "stock_in",
        "quantity": 10,
        "previousQuantity": 5,
        "newQuantity": 15,
        "notes": "Initial stock",
        "performedBy": "John Doe",
        "performedAt": "2023-01-01T00:00:00.000Z"
      },
      {
        "id": "string",
        "action": "stock_out",
        "quantity": -3,
        "previousQuantity": 15,
        "newQuantity": 12,
        "orderId": "string",
        "notes": "Order #123",
        "performedBy": "Jane Smith",
        "performedAt": "2023-01-02T10:30:00.000Z"
      }
    ]
  }
  ```

## Orders

### Get Delivery Orders
- **URL**: `/orders`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Params**:
  - `status`: `pending | processing | shipped | delivered | cancelled` (optional)
  - `customerId`: string (optional)
  - `startDate`: string (ISO date, optional)
  - `endDate`: string (ISO date, optional)
  - `search`: string (searches in order number, customer name, email)
  - `page`: number (optional, default: 1)
  - `limit`: number (optional, default: 10)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "orderNumber": "ORD-001",
        "customerId": "string",
        "customerName": "string",
        "customerEmail": "string",
        "customerPhone": "string",
        "deliveryAddress": "string",
        "status": "processing",
        "totalAmount": 1000,
        "items": [
          {
            "id": "string",
            "name": "Product 1",
            "quantity": 2,
            "price": 500
          }
        ],
        "orderDate": "2023-01-01T00:00:00.000Z",
        "deliveryDate": null,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
  ```

### Create New Order
- **URL**: `/orders`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "customerName": "string",
    "customerEmail": "string",
    "customerPhone": "string",
    "deliveryAddress": "string",
    "items": [
      {
        "inventoryId": "string",
        "quantity": 1,
        "price": 500
      }
    ],
    "notes": "string"
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "orderNumber": "ORD-001",
      "status": "pending",
      "totalAmount": 1000,
      "orderDate": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Get Order by ID
- **URL**: `/orders/{id}`
- **Method**: `GET`
- **Auth Required**: Yes
- **URL Params**:
  - `id`: string (Order ID)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "orderNumber": "ORD-001",
      "customerId": "string",
      "customerName": "string",
      "customerEmail": "string",
      "customerPhone": "string",
      "deliveryAddress": "string",
      "status": "processing",
      "totalAmount": 1000,
      "items": [
        {
          "id": "string",
          "inventoryId": "string",
          "name": "Product 1",
          "quantity": 2,
          "price": 500,
          "total": 1000
        }
      ],
      "notes": "Handle with care",
      "orderDate": "2023-01-01T00:00:00.000Z",
      "deliveryDate": null,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Update Order
- **URL**: `/orders/{id}`
- **Method**: `PUT`
- **Auth Required**: Yes
- **URL Params**:
  - `id`: string (Order ID)
- **Request Body**:
  ```json
  {
    "customerName": "string",
    "customerEmail": "string",
    "customerPhone": "string",
    "deliveryAddress": "string",
    "items": [
      {
        "inventoryId": "string",
        "quantity": 2,
        "price": 500
      }
    ],
    "notes": "string"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "totalAmount": 1000,
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Get Order Statuses
- **URL**: `/orders/status`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "value": "pending",
        "label": "Pending"
      },
      {
        "value": "processing",
        "label": "Processing"
      },
      {
        "value": "shipped",
        "label": "Shipped"
      },
      {
        "value": "delivered",
        "label": "Delivered"
      },
      {
        "value": "cancelled",
        "label": "Cancelled"
      }
    ]
  }
  ```

### Get Orders by Customer
- **URL**: `/orders/customer/{id}`
- **Method**: `GET`
- **Auth Required**: Yes
- **URL Params**:
  - `id`: string (Customer ID)
- **Query Params**:
  - `status`: `pending | processing | shipped | delivered | cancelled` (optional)
  - `startDate`: string (ISO date, optional)
  - `endDate`: string (ISO date, optional)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "orderNumber": "ORD-001",
        "status": "delivered",
        "totalAmount": 1000,
        "orderDate": "2023-01-01T00:00:00.000Z",
        "deliveryDate": "2023-01-03T00:00:00.000Z"
      }
    ]
  }
  ```

### Update Order Status
- **URL**: `/orders/{id}/status`
- **Method**: `POST`
- **Auth Required**: Yes
- **URL Params**:
  - `id`: string (Order ID)
- **Request Body**:
  ```json
  {
    "status": "processing | shipped | delivered | cancelled",
    "notes": "string"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "status": "processing",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

## Users

### Get Users
- **URL**: `/users`
- **Method**: `GET`
- **Auth Required**: Yes (Admin only)
- **Query Params**:
  - `role`: `admin | warehouse_staff | dispatch_officer | driver` (optional)
  - `status`: `active | inactive` (optional)
  - `search`: string (searches in name, email, phone)
  - `page`: number (optional, default: 1)
  - `limit`: number (optional, default: 10)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "firstName": "string",
        "lastName": "string",
        "email": "string",
        "phone": "string",
        "role": "admin",
        "status": "active",
        "lastLogin": "2023-01-01T00:00:00.000Z",
        "createdAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
  ```

### Create User
- **URL**: `/users`
- **Method**: `POST`
- **Auth Required**: Yes (Admin only)
- **Request Body**:
  ```json
  {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "password": "string",
    "role": "admin | warehouse_staff | dispatch_officer | driver",
    "status": "active | inactive"
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "role": "admin",
      "status": "active",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Get User by ID
- **URL**: `/users/{id}`
- **Method**: `GET`
- **Auth Required**: Yes
- **URL Params**:
  - `id`: string (User ID)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "phone": "string",
      "role": "admin",
      "status": "active",
      "lastLogin": "2023-01-01T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Update User
- **URL**: `/users/{id}`
- **Method**: `PUT`
- **Auth Required**: Yes (User can update own profile, Admin can update any)
- **URL Params**:
  - `id`: string (User ID)
- **Request Body**:
  ```json
  {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "role": "admin | warehouse_staff | dispatch_officer | driver",
    "status": "active | inactive"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "role": "admin",
      "status": "active",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Delete User
- **URL**: `/users/{id}`
- **Method**: `DELETE`
- **Auth Required**: Yes (Admin only)
- **URL Params**:
  - `id`: string (User ID)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "User deleted successfully"
  }
  ```

## Vehicles

### Get Vehicles
- **URL**: `/vehicles`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Params**:
  - `status`: `available | in_use | maintenance | unavailable` (optional)
  - `type`: `truck | van | bike | other` (optional)
  - `search`: string (searches in registration number, make, model)
  - `page`: number (optional, default: 1)
  - `limit`: number (optional, default: 10)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "registrationNumber": "ABC123",
        "make": "Toyota",
        "model": "Hiace",
        "year": 2020,
        "type": "van",
        "capacity": 1000,
        "status": "available",
        "lastMaintenance": "2023-01-01T00:00:00.000Z",
        "nextMaintenance": "2023-07-01T00:00:00.000Z",
        "driver": {
          "id": "string",
          "name": "John Doe"
        },
        "createdAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
  ```

### Create Vehicle
- **URL**: `/vehicles`
- **Method**: `POST`
- **Auth Required**: Yes (Admin only)
- **Request Body**:
  ```json
  {
    "registrationNumber": "ABC123",
    "make": "Toyota",
    "model": "Hiace",
    "year": 2020,
    "type": "van",
    "capacity": 1000,
    "status": "available",
    "purchaseDate": "2020-01-01",
    "lastMaintenance": "2023-01-01",
    "nextMaintenance": "2023-07-01"
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "registrationNumber": "ABC123",
      "make": "Toyota",
      "model": "Hiace",
      "status": "available",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Get Vehicle by ID
- **URL**: `/vehicles/{id}`
- **Method**: `GET`
- **Auth Required**: Yes
- **URL Params**:
  - `id`: string (Vehicle ID)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "registrationNumber": "ABC123",
      "make": "Toyota",
      "model": "Hiace",
      "year": 2020,
      "type": "van",
      "capacity": 1000,
      "status": "available",
      "purchaseDate": "2020-01-01",
      "lastMaintenance": "2023-01-01T00:00:00.000Z",
      "nextMaintenance": "2023-07-01T00:00:00.000Z",
      "driver": {
        "id": "string",
        "name": "John Doe"
      },
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Update Vehicle
- **URL**: `/vehicles/{id}`
- **Method**: `PUT`
- **Auth Required**: Yes (Admin only)
- **URL Params**:
  - `id`: string (Vehicle ID)
- **Request Body**:
  ```json
  {
    "registrationNumber": "ABC124",
    "status": "maintenance",
    "nextMaintenance": "2023-08-01"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "registrationNumber": "ABC124",
      "status": "maintenance",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Delete Vehicle
- **URL**: `/vehicles/{id}`
- **Method**: `DELETE`
- **Auth Required**: Yes (Admin only)
- **URL Params**:
  - `id`: string (Vehicle ID)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Vehicle deleted successfully"
  }
  ```

### Get Vehicle Statuses
- **URL**: `/vehicles/status`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "value": "available",
        "label": "Available"
      },
      {
        "value": "in_use",
        "label": "In Use"
      },
      {
        "value": "maintenance",
        "label": "In Maintenance"
      },
      {
        "value": "unavailable",
        "label": "Unavailable"
      }
    ]
  }
  ```

### Get Vehicle Maintenance History
- **URL**: `/vehicles/{id}/maintenance`
- **Method**: `GET`
- **Auth Required**: Yes
- **URL Params**:
  - `id`: string (Vehicle ID)
- **Query Params**:
  - `startDate`: string (ISO date, optional)
  - `endDate`: string (ISO date, optional)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "date": "2023-01-01T00:00:00.000Z",
        "type": "scheduled | repair | inspection",
        "description": "Oil change and filter replacement",
        "cost": 150,
        "odometerReading": 50000,
        "nextServiceOdometer": 55000,
        "nextServiceDate": "2023-07-01T00:00:00.000Z",
        "performedBy": "string",
        "notes": "All fluids checked and topped up"
      }
    ]
  }
  ```

### Schedule Vehicle Maintenance
- **URL**: `/vehicles/{id}/maintenance`
- **Method**: `POST`
- **Auth Required**: Yes (Admin/Manager)
- **URL Params**:
  - `id`: string (Vehicle ID)
- **Request Body**:
  ```json
  {
    "date": "2023-07-01T09:00:00.000Z",
    "type": "scheduled",
    "description": "Regular maintenance",
    "odometerReading": 50000,
    "nextServiceOdometer": 55000,
    "nextServiceDate": "2024-01-01",
    "cost": 200,
    "notes": "Include tire rotation"
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "date": "2023-07-01T09:00:00.000Z",
      "type": "scheduled",
      "description": "Regular maintenance",
      "scheduledBy": "User Name",
      "status": "scheduled"
    }
  }
  ```

## Drivers

### Get Drivers
- **URL**: `/drivers`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Params**:
  - `status`: `active | inactive | on_leave` (optional)
  - `search`: string (searches in name, license number, phone)
  - `page`: number (optional, default: 1)
  - `limit`: number (optional, default: 10)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "userId": "string",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "licenseNumber": "DL1234567890",
        "licenseExpiry": "2025-12-31",
        "status": "active",
        "vehicle": {
          "id": "string",
          "registrationNumber": "ABC123"
        },
        "lastTripDate": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
  ```

### Create Driver
- **URL**: `/drivers`
- **Method**: `POST`
- **Auth Required**: Yes (Admin only)
- **Request Body**:
  ```json
  {
    "userId": "string",
    "licenseNumber": "DL1234567890",
    "licenseExpiry": "2025-12-31",
    "licenseClass": "C",
    "emergencyContact": {
      "name": "Jane Smith",
      "relationship": "Spouse",
      "phone": "+1987654321"
    },
    "address": "123 Main St, City, Country",
    "status": "active"
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "userId": "string",
      "name": "John Doe",
      "licenseNumber": "DL1234567890",
      "status": "active"
    }
  }
  ```

### Update Driver
- **URL**: `/drivers/{id}`
- **Method**: `PUT`
- **Auth Required**: Yes (Admin/Manager)
- **URL Params**:
  - `id`: string (Driver ID)
- **Request Body**:
  ```json
  {
    "licenseNumber": "DL1234567890",
    "licenseExpiry": "2026-12-31",
    "status": "active | inactive | on_leave",
    "emergencyContact": {
      "name": "Jane Smith",
      "relationship": "Spouse",
      "phone": "+1987654321"
    },
    "address": "123 Main St, City, Country"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "licenseNumber": "DL1234567890",
      "status": "active",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Get Driver Assignments
- **URL**: `/drivers/{id}/assignments`
- **Method**: `GET`
- **Auth Required**: Yes
- **URL Params**:
  - `id`: string (Driver ID)
- **Query Params**:
  - `status`: `pending | in_progress | completed` (optional)
  - `startDate`: string (ISO date, optional)
  - `endDate`: string (ISO date, optional)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "orderId": "string",
        "orderNumber": "ORD-001",
        "status": "in_progress",
        "pickupLocation": "Warehouse A",
        "deliveryAddress": "123 Main St, City",
        "scheduledPickup": "2023-01-01T09:00:00.000Z",
        "scheduledDelivery": "2023-01-01T12:00:00.000Z",
        "vehicle": {
          "id": "string",
          "registrationNumber": "ABC123"
        },
        "items": [
          {
            "id": "string",
            "name": "Product 1",
            "quantity": 2
          }
        ]
      }
    ]
  }
  ```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Pagination
Most list endpoints support pagination with the following query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

The response includes a `pagination` object with:
- `total`: Total number of items
- `page`: Current page number
- `limit`: Number of items per page
- `totalPages`: Total number of pages

## Filtering and Sorting
Most list endpoints support filtering and sorting using query parameters:

### Filtering
```
GET /api/resource?status=active&category=electronics
```

### Sorting
```
GET /api/resource?sort=createdAt:desc,name:asc
```

### Searching
```
GET /api/resource?search=keyword
```

## Authentication
All endpoints except `/api/auth/*` require authentication. Include the JWT token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

## Rate Limiting
API is rate limited to 1000 requests per 15 minutes per IP address. The following headers are included in the response:
- `X-RateLimit-Limit`: Request limit per time window
- `X-RateLimit-Remaining`: Remaining requests in current time window
- `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

## Versioning
API versioning is done through the URL path:
```
/api/v1/resource
```

## Data Formats
- **Dates**: ISO 8601 format (e.g., `2023-01-01T12:00:00.000Z`)
- **Currencies**: All monetary values are in the smallest currency unit (e.g., cents for USD)
- **IDs**: UUID v4 format
- **Pagination**: 1-based page numbers

## Webhooks
Webhooks are available for the following events:
- `order.created`
- `order.updated`
- `dispatch.started`
- `dispatch.completed`
- `inventory.low_stock`

## WebSocket
Real-time updates are available via WebSocket at `/ws`. The following events are supported:
- `order_updated`
- `dispatch_updated`
- `inventory_updated`
- `vehicle_status_changed`

## Email Notifications

### Test Email Notifications
- **URL**: `/test/email`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "type": "welcome | order_update | low_stock | delivery_assignment | delivery_confirmation"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Email sent successfully"
  }
  ```

### Email Notification Types

#### 1. Welcome Email 🎉
- **Trigger**: First-time user login (backend checks `lastLogin` field)
- **Recipient**: New user
- **Template**: Welcome message with system introduction

#### 2. Order Status Update 📦
- **Trigger**: Order status change via API
- **Recipient**: Customer
- **Template**: Order number and new status information

#### 3. Low Stock Alert ⚠️
- **Trigger**: Inventory quantity <= minimum quantity
- **Recipient**: Warehouse manager
- **Template**: Item details with current vs minimum stock levels

#### 4. Delivery Assignment 🚛
- **Trigger**: Driver assigned to delivery (dispatch creation)
- **Recipient**: Assigned driver
- **Template**: Assignment details with order info and schedule

#### 5. Delivery Confirmation ✅
- **Trigger**: Order status changed to 'delivered'
- **Recipient**: Customer
- **Template**: Delivery success notification
