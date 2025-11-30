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
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with bcrypt
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer
- **Email**: Nodemailer
- **Validation**: Express Validator

### Frontend
- **Framework**: React 18 with TypeScript
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
- Node.js (v16 or higher)
- MongoDB
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
   npm start
   ```

### Environment Variables

Create a `.env` file in the backend directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/waretrack-pro
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
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
npm run test         # Run tests
npm run lint         # Run ESLint
```

### Frontend Development
```bash
cd frontend
npm start            # Start development server
npm run build        # Build for production
npm test             # Run tests
npm run lint         # Run ESLint
```

## 📱 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Core Endpoints
- `GET /api/inventory` - Get inventory items
- `POST /api/orders` - Create delivery order
- `GET /api/dispatch` - Get dispatch schedules
- `PUT /api/orders/:id/status` - Update order status
- `GET /api/reports/dashboard` - Get dashboard statistics

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

## 🙏 Acknowledgments

- Built as a comprehensive warehouse management solution
- Designed for scalability and real-world deployment
- Implements modern web development best practices
- Suitable for educational and commercial use
