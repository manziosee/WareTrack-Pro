# 🚀 WareTrack-Pro

<div align="center">

![WareTrack-Pro Logo](https://img.shields.io/badge/WareTrack-Pro-4F46E5?style=for-the-badge&logo=warehouse&logoColor=white)

**The Ultimate Warehouse Delivery & Dispatch Tracking System**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-4F46E5?style=for-the-badge)](https://ware-track-pro.vercel.app/)
[![API Docs](https://img.shields.io/badge/📚_API_Docs-10B981?style=for-the-badge)](https://waretrack-pro-api.fly.dev/api-docs)
[![Backend API](https://img.shields.io/badge/🔗_Backend_API-F59E0B?style=for-the-badge)](https://waretrack-pro-api.fly.dev/api)
[![Postman Collection](https://img.shields.io/badge/📮_Postman-FF6C37?style=for-the-badge)](./WareTrack-Pro-API.postman_collection.json)

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socket.io&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

---

## 🎉 **Latest Updates (v2.1.1)**

### ✅ Recently Added Features
- **🔧 Build System Fixes**: Resolved TypeScript compilation errors in backend and frontend
- **📊 Reports Controller**: Added comprehensive reporting endpoints for analytics, sales, inventory, vehicles, and drivers
- **📚 Enhanced API Documentation**: Updated Swagger documentation with reports endpoints
- **🔔 Enhanced Notification System**: Real-time updates with auto-refresh, unread badge count, mark-all-as-read
- **📦 Comprehensive Seed Data**: 22 inventory items, 8 vehicles, 3 drivers ready to use
- **🚚 Improved Tracking Page**: Auto-refresh, driver/vehicle names, summary stats, better timeline
- **🎯 Role-Based Navigation**: Dynamic sidebar with proper access control for all roles
- **⚡ Performance Optimizations**: 30-second auto-refresh, optimistic UI updates
- **📚 Complete Documentation**: API reference, quick start guide, improvements summary

**📖 Recent Bug Fixes:**
- Fixed duplicate methods in dispatchController causing build failures
- Added missing reportsController with all required endpoints
- Removed unused imports in Drivers and Vehicles pages
- Updated Swagger API version to 2.1.0

**📖 New Documentation Files:**
- `CHANGELOG.md` - Complete version history
- `DEPLOYMENT.md` - Comprehensive deployment guide
- `UPDATE_SUMMARY.md` - Detailed update summary

---

## ✨ **What Makes WareTrack-Pro Special?**

WareTrack-Pro is a **production-ready**, **enterprise-grade** warehouse management system that transforms how businesses handle inventory, orders, and deliveries. Built with modern technologies and best practices, it's designed to scale from small warehouses to large distribution centers.

---

## 🚀 **Quick Start**

### **Option 1: Docker (Recommended)**

```bash
# Clone the repository
git clone https://github.com/manziosee/WareTrack-Pro.git
cd WareTrack-Pro

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Start with Docker Compose
docker-compose up -d

# Run database migrations
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed

# Access the application
# Frontend: http://localhost:3001
# Backend API: http://localhost:5000/api
# Swagger Docs: http://localhost:5000/api-docs
```

### **Option 2: Manual Setup**

```bash
# Backend setup
cd backend
npm install
cp .env.example .env
# Configure your .env file with PostgreSQL connection
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

---

## 🌐 **Live Demo & API**

<div align="center">

| **Service** | **URL** | **Status** |
|-------------|---------|------------|
| 🌐 **Frontend** | [ware-track-pro.vercel.app](https://ware-track-pro.vercel.app/) | ![Status](https://img.shields.io/badge/Status-Live-success) |
| 🔗 **Backend API** | [waretrack-pro-api.fly.dev/api](https://waretrack-pro-api.fly.dev/api) | ![Status](https://img.shields.io/badge/Status-Live-success) |
| 📚 **API Docs** | [waretrack-pro-api.fly.dev/api-docs](https://waretrack-pro-api.fly.dev/api-docs) | ![Status](https://img.shields.io/badge/Status-Live-success) |
| 📮 **Postman** | [Collection Download](./WareTrack-Pro-API.postman_collection.json) | ![Status](https://img.shields.io/badge/Status-Ready-success) |

</div>

---

## 📋 **API Documentation**

### **75+ Endpoints Available**

| **Category** | **Endpoints** | **Features** |
|--------------|---------------|--------------|
| 🔐 **Authentication** | 7 endpoints | Login, register, profile, refresh, logout, role validation |
| 📊 **Dashboard** | 8 endpoints | Role-based stats, trends, analytics, notifications |
| 📦 **Inventory** | 12 endpoints | CRUD, stats, categories, low-stock, history, view |
| 📋 **Orders** | 9 endpoints | CRUD, status updates, delete, customer orders, view |
| 🚛 **Vehicles** | 10 endpoints | Fleet management, maintenance, status sync |
| 👨💼 **Drivers** | 6 endpoints | Driver management, assignments, status sync |
| 🚚 **Dispatch** | 8 endpoints | Dispatch creation, tracking, status sync, location |
| 👥 **Users** | 7 endpoints | User management, roles, permissions, view, delete |
| 🔔 **Notifications** | 4 endpoints | Real-time notifications, mark read, delete |
| 📈 **Reports** | 6 endpoints | Analytics, sales, inventory, vehicles, drivers, export |
| 📧 **Email Testing** | 5 endpoints | Test all notification types and templates |

### **Interactive API Explorer**

Visit [waretrack-pro-api.fly.dev/api-docs](https://waretrack-pro-api.fly.dev/api-docs) for:
- 🔍 **Interactive API Testing**
- 📖 **Complete Documentation**
- 🔐 **Authentication Testing**
- 📊 **Request/Response Examples**

---

## 🐳 **Docker Configuration**

### **Development Environment**

```bash
docker-compose up -d
```

### **Production Environment**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🤝 **Contributing**

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨💻 **Author**

<div align="center">

**manziosee**

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/manziosee)

**Project Link**: [https://github.com/manziosee/WareTrack-Pro](https://github.com/manziosee/WareTrack-Pro)

</div>

---

<div align="center">

### **⭐ Star this repository if you find it helpful!**

**Made with ❤️ for the warehouse management community**

</div>
