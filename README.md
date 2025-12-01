# WareTrack-Pro

A comprehensive Warehouse Delivery & Dispatch Tracking System built with Node.js/TypeScript backend and React/TypeScript frontend.

## 🚀 Features

### Core Functionality
- **User Management**: Admin, Warehouse Staff, Dispatch Officer, Driver roles with permissions
- **Inventory Management**: Real-time stock tracking, low-stock alerts, barcode support
- **Order Management**: Create, assign, and track delivery orders with priority levels
- **Dispatch Management**: Schedule dispatches, assign vehicles/drivers, track progress
- **Real-Time Tracking**: Order status tracking from pending to delivered
- **Vehicle & Driver Management**: Fleet management with availability tracking
- **Delivery Confirmation**: Proof of delivery with signatures and delivery codes
- **Notifications & Alerts**: Email/SMS notifications for status changes
- **Reporting & Analytics**: Comprehensive reports and performance analytics
- **Dashboard**: Real-time overview with key metrics and quick actions
- **Audit Trail**: Complete activity logging for accountability

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis with BullMQ
- **Authentication**: JWT with bcrypt
- **Security**: Helmet, CORS, Rate Limiting
- **Email**: EmailJS
- **Documentation**: Swagger/OpenAPI 3.0

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Query
- **Forms**: React Hook Form with Yup validation
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 📁 Project Structure

```
WareTrack-Pro/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   ├── config/         # Configuration files
│   │   └── types/          # TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── contexts/       # React contexts
│   │   ├── types/          # TypeScript interfaces
│   │   └── utils/          # Utility functions
│   ├── package.json
│   └── tailwind.config.js
├── README.md
└── LICENSE
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL
- Redis (optional for caching)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/manziosee/WareTrack-Pro.git
   cd WareTrack-Pro
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Environment Variables

Create a `.env` file in the backend directory:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3001
REDIS_URL=redis://username:password@host:port
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key
```

## 📊 System Features

### User Roles & Permissions
- **Admin**: Full system access, user management, system configuration
- **Warehouse Staff**: Inventory management, order creation, stock updates
- **Dispatch Officer**: Order assignment, dispatch scheduling, route planning
- **Driver**: Order updates, delivery confirmation, status reporting

### Order Status Flow
```
Pending → Dispatched → In Transit → Delivered
```

### Inventory Management
- Real-time stock tracking
- Automated low-stock alerts
- Barcode/QR code integration
- Category-based organization
- Batch operations

### Reporting Capabilities
- Inventory reports (stock levels, movement, valuation)
- Delivery performance metrics
- Driver performance analytics
- Customer delivery history
- Export to PDF/Excel formats

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev          # Start development server
npm run build        # Build for production
npm run db:generate  # Generate database schema
npm run db:migrate   # Run database migrations
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server (port 3001)
npm run build        # Build for production
npm run preview      # Preview production build
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker
docker build -t waretrack-pro .
docker run -p 5000:5000 --env-file backend/.env waretrack-pro
```

## 🚀 Production Deployment

### Backend (Render)
- Set environment variables in Render dashboard
- Deploy from GitHub repository
- Ensure PostgreSQL and Redis are configured

### Frontend (Vercel)
- Connect GitHub repository to Vercel
- Set `REACT_APP_API_URL` environment variable
- Automatic deployments on push to main branch

## 📱 Live Demo & API Documentation

### 🌐 Live Application
- **Frontend**: [https://ware-track-pro.vercel.app/](https://ware-track-pro.vercel.app/)
- **API Documentation**: [Backend URL]/api-docs (Swagger UI)
- **Local Frontend**: http://localhost:3001
- **Local API**: http://localhost:5000

### 📧 Email Notification Testing
Test all email notifications:
```bash
# Test welcome email
curl -X POST http://localhost:5000/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"type": "welcome"}'

# Test order update email
curl -X POST http://localhost:5000/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"type": "order_update"}'

# Test low stock alert
curl -X POST http://localhost:5000/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"type": "low_stock"}'

# Test delivery assignment
curl -X POST http://localhost:5000/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"type": "delivery_assignment"}'

# Test delivery confirmation
curl -X POST http://localhost:5000/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"type": "delivery_confirmation"}'}
```

### Key API Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (first user becomes admin)
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/inventory` - Inventory management
- `POST /api/orders` - Order management
- `GET /api/dispatch` - Dispatch tracking
- `GET /api/reports` - Analytics and reports

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 👨‍💻 Author

**manziosee**
- GitHub: [@manziosee](https://github.com/manziosee)
- Project Link: [https://github.com/manziosee/WareTrack-Pro](https://github.com/manziosee/WareTrack-Pro)

## ✨ Key Features Implemented

### 📧 Email Notification System
- ✅ **Welcome Email** 🎉 - Sent on first-time login (backend checks `lastLogin` field)
- ✅ **Order Status Updates** 📦 - Sent when order status changes (triggered by API calls)
- ✅ **Low Stock Alerts** ⚠️ - Sent when inventory falls below minimum (checked on updates)
- ✅ **Delivery Assignment** 🚛 - Sent when driver is assigned to delivery (dispatch creation)
- ✅ **Delivery Confirmation** ✅ - Sent when order status changes to 'delivered'

### 👥 User Management System
- ✅ **First User Admin** - First registered user automatically becomes admin
- ✅ **Role-Based Access** - Admin, Warehouse Staff, Dispatch Officer, Driver roles
- ✅ **Account Activation** - New users start inactive, admin can activate/deactivate
- ✅ **JWT Authentication** - Access and refresh tokens with proper session management

### 🏢 Core System Features
- ✅ **Real-time Inventory** - Live stock tracking with automated low-stock alerts
- ✅ **Order Lifecycle** - Complete order management from creation to delivery
- ✅ **Dispatch Management** - Schedule dispatches, assign vehicles/drivers, track progress
- ✅ **Comprehensive Reports** - Analytics, performance metrics, and export capabilities
- ✅ **Redis & BullMQ** - Background job processing and caching system
- ✅ **Swagger Documentation** - Complete API documentation with 58+ endpoints

### 🔧 Technical Implementation
- ✅ **PostgreSQL + Supabase** - Production database with Drizzle ORM
- ✅ **EmailJS Integration** - Professional email templates and delivery
- ✅ **Docker Support** - Multi-stage production builds
- ✅ **Render Deployment** - Production-ready backend configuration
- ✅ **Vercel Frontend** - Optimized React deployment

## 🙏 Acknowledgments

- Built as a comprehensive warehouse management solution
- Designed for scalability and real-world deployment
- Implements modern web development best practices
- Production-ready with Docker support
- Suitable for educational and commercial use
