# 🐳 Docker Deployment Guide

## 🚀 Quick Start with Docker

### **Development Environment**

```bash
# Clone the repository
git clone https://github.com/manziosee/WareTrack-Pro.git
cd WareTrack-Pro

# Copy environment file
cp .env.example backend/.env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost:3001
# Backend: http://localhost:5000/api
# Swagger: http://localhost:5000/api-docs
# Database: localhost:5432
# Redis: localhost:6379
```

### **Production Environment**

```bash
# Set up environment variables
cp .env.example .env
# Edit .env with production values

# Deploy with load balancing
docker-compose -f docker-compose.prod.yml up -d

# Scale backend instances
docker-compose -f docker-compose.prod.yml up -d --scale backend1=2 --scale backend2=2

# Monitor services
docker-compose -f docker-compose.prod.yml ps
```

## 📊 **Service Architecture**

### **Development Stack**
```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│   React:3001    │◄──►│   Node.js:5000  │
└─────────────────┘    └─────────────────┘
                              │
                              ▼
┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   Redis         │
│   Port: 5432    │    │   Port: 6379    │
└─────────────────┘    └─────────────────┘
```

### **Production Stack**
```
                    ┌─────────────────┐
                    │   Nginx LB      │
                    │   Port: 80/443  │
                    └─────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
          ┌─────────────────┐ ┌─────────────────┐
          │   Backend-1     │ │   Backend-2     │
          │   Node.js       │ │   Node.js       │
          └─────────────────┘ └─────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              ▼
                    ┌─────────────────┐
                    │   Redis Cache   │
                    │   + BullMQ      │
                    └─────────────────┘
```

## 🔧 **Docker Services**

### **Core Services**

| **Service** | **Image** | **Port** | **Purpose** |
|-------------|-----------|----------|-------------|
| **frontend** | `node:18-alpine` | 3001 | React application |
| **backend** | `node:18-alpine` | 5000 | Express API server |
| **db** | `postgres:15-alpine` | 5432 | PostgreSQL database |
| **redis** | `redis:7-alpine` | 6379 | Cache & message queue |

### **Production Services**

| **Service** | **Replicas** | **Resources** | **Purpose** |
|-------------|--------------|---------------|-------------|
| **nginx** | 1 | 256MB | Load balancer & SSL |
| **backend1** | 1-3 | 512MB | Primary API instances |
| **backend2** | 1-3 | 512MB | Secondary API instances |
| **redis** | 1 | 256MB | Shared cache & queues |

## 🛠️ **Docker Commands**

### **Development Commands**

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Execute commands in containers
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run seed

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild services
docker-compose build --no-cache
docker-compose up -d --force-recreate
```

### **Production Commands**

```bash
# Deploy production stack
docker-compose -f docker-compose.prod.yml up -d

# Scale backend services
docker-compose -f docker-compose.prod.yml up -d --scale backend1=2

# Update services
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# Monitor resources
docker stats

# View service health
docker-compose -f docker-compose.prod.yml ps
```

## 📋 **Environment Configuration**

### **Required Environment Variables**

```env
# Application
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-super-secret-key
FRONTEND_URL=https://your-domain.com
REDIS_URL=redis://user:pass@host:port

# EmailJS
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key

# Security
REDIS_PASSWORD=secure-redis-password
GRAFANA_PASSWORD=secure-grafana-password
```

## 🔍 **Health Monitoring**

### **Health Check Endpoints**

```bash
# Backend health
curl http://localhost:5000/health

# Frontend health
curl http://localhost:3001

# Database health
docker-compose exec db pg_isready -U postgres

# Redis health
docker-compose exec redis redis-cli ping
```

### **Service Status**

```bash
# Check all services
docker-compose ps

# Check resource usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Check logs
docker-compose logs --tail=50 -f
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Port Already in Use**
```bash
# Find process using port
lsof -i :5000
lsof -i :3001

# Kill process
kill -9 <PID>
```

#### **Database Connection Issues**
```bash
# Check database logs
docker-compose logs db

# Reset database
docker-compose down -v
docker-compose up -d db
```

#### **Redis Connection Issues**
```bash
# Check Redis logs
docker-compose logs redis

# Reset Redis
docker-compose restart redis
```

#### **Build Issues**
```bash
# Clean build
docker-compose down
docker system prune -a
docker-compose build --no-cache
docker-compose up -d
```

## 📊 **Performance Optimization**

### **Resource Limits**

```yaml
# Production resource limits
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```

### **Scaling Commands**

```bash
# Scale backend horizontally
docker-compose -f docker-compose.prod.yml up -d --scale backend1=3

# Monitor scaling
docker-compose -f docker-compose.prod.yml ps
docker stats
```

## 🔒 **Security Best Practices**

- ✅ **Non-root containers** - All services run as non-root users
- ✅ **Health checks** - Automatic service health monitoring
- ✅ **Resource limits** - CPU and memory constraints
- ✅ **Network isolation** - Services communicate via internal network
- ✅ **Secret management** - Environment-based configuration
- ✅ **SSL termination** - Nginx handles HTTPS
- ✅ **Rate limiting** - API protection against abuse

## 📈 **Monitoring & Logging**

### **Prometheus Metrics**
- API response times
- Database connection pool
- Redis cache hit rates
- Memory and CPU usage

### **Grafana Dashboards**
- System overview
- API performance
- Database metrics
- User activity

### **Log Aggregation**
```bash
# Centralized logging
docker-compose logs --follow --tail=100

# Service-specific logs
docker-compose logs backend --follow
docker-compose logs frontend --follow
```

## 🎯 **Production Checklist**

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database backups configured
- [ ] Monitoring setup (Prometheus + Grafana)
- [ ] Log rotation configured
- [ ] Health checks working
- [ ] Load balancing tested
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Email notifications tested

---

**🚀 Your WareTrack-Pro is now Docker-ready for any environment!**