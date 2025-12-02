# 🚀 WareTrack-Pro Deployment Guide

## 📋 Prerequisites

- Docker & Docker Compose
- PostgreSQL database
- Node.js 18+ (for manual setup)
- Git

## 🐳 Docker Deployment (Recommended)

### Development Environment

```bash
# Clone repository
git clone https://github.com/manziosee/WareTrack-Pro.git
cd WareTrack-Pro

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start services
docker-compose up -d

# Run database setup
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed

# Access application
# Frontend: http://localhost:3001
# Backend: http://localhost:5000/api
# API Docs: http://localhost:5000/api-docs
```

### Production Environment

```bash
# Setup production environment
cp .env.example .env.production
# Configure production values in .env.production

# Deploy with production compose
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

## 🔧 Manual Setup

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Configure DATABASE_URL and other variables

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Configure VITE_API_URL

# Start development server
npm run dev
```

## ☁️ Cloud Deployment

### Backend (Render/Railway)

1. **Connect Repository**: Link your GitHub repository
2. **Environment Variables**:
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://user:pass@host:port/db
   JWT_SECRET=your-secret-key
   FRONTEND_URL=https://your-frontend-domain.com
   ```
3. **Build Command**: `npm install && npx prisma generate && npm run build`
4. **Start Command**: `npm start`

### Frontend (Vercel/Netlify)

1. **Connect Repository**: Link your GitHub repository
2. **Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-domain.com/api
   ```

### Database (PostgreSQL)

#### Option 1: Render PostgreSQL
- Create PostgreSQL instance on Render
- Use connection string in `DATABASE_URL`

#### Option 2: Supabase
- Create project on Supabase
- Use provided connection string

#### Option 3: AWS RDS
- Create PostgreSQL instance on AWS RDS
- Configure security groups and connection string

## 🔐 Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Application
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-domain.com

# Email (Optional)
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key
```

## 📊 Database Migrations

### Development
```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# View database
npx prisma studio
```

### Production
```bash
# Deploy migrations
npx prisma migrate deploy

# Generate client
npx prisma generate
```

## 🔍 Health Checks

### Backend Health Check
```bash
curl http://localhost:5000/health
```

### Database Health Check
```bash
# Inside backend container
npx prisma db execute --stdin < "SELECT 1"
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check DATABASE_URL format
   # Ensure PostgreSQL is running
   # Verify network connectivity
   ```

2. **Prisma Client Not Generated**
   ```bash
   npx prisma generate
   ```

3. **Migration Errors**
   ```bash
   # Check migration status
   npx prisma migrate status
   
   # Resolve migration issues
   npx prisma migrate resolve --applied "migration_name"
   ```

4. **Port Already in Use**
   ```bash
   # Kill process on port
   lsof -ti:5000 | xargs kill -9
   ```

### Logs

```bash
# Docker logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Application logs
tail -f backend/logs/app.log
```

## 🔄 Updates & Maintenance

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose build --no-cache

# Restart services
docker-compose up -d

# Run new migrations
docker-compose exec backend npx prisma migrate deploy
```

### Backup Database
```bash
# Create backup
docker-compose exec db pg_dump -U postgres waretrack > backup.sql

# Restore backup
docker-compose exec -T db psql -U postgres waretrack < backup.sql
```

## 📈 Scaling

### Horizontal Scaling
- Use load balancer (Nginx)
- Multiple backend instances
- Shared PostgreSQL database

### Vertical Scaling
- Increase container resources
- Optimize database queries
- Add database indexes

## 🛡️ Security

### Production Security Checklist
- [ ] Strong JWT secret
- [ ] HTTPS enabled
- [ ] Database credentials secured
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] Regular security updates

### SSL/TLS Setup
```bash
# Using Let's Encrypt with Certbot
certbot --nginx -d your-domain.com
```

## 📞 Support

For deployment issues:
1. Check logs first
2. Verify environment variables
3. Ensure database connectivity
4. Review Docker container status
5. Check network configuration

**Need help?** Create an issue on GitHub with:
- Deployment method used
- Error messages/logs
- Environment details
- Steps to reproduce