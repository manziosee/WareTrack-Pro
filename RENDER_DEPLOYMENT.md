# Render Deployment Guide for WareTrack-Pro Backend

## 🚀 Quick Deployment Steps

### 1. Environment Variables Setup
Set these environment variables in your Render dashboard:

```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:8p%21_q4fq2RhV9FU@db.exxpofcteuatggdxgbdk.supabase.co:5432/postgres
JWT_SECRET=vLldZX01a3j77gp4Owrf9TsW2bKXDXi0PeLS1xbVTAu
JWT_EXPIRE=7d
FRONTEND_URL=https://ware-track-pro.vercel.app
BACKEND_URL=https://waretrack-pro-backend.onrender.com
REDIS_URL=redis://default:AIdDsSCoXEfTZh6nvaC53D0F2hsdIIkO@redis-13712.c73.us-east-1-2.ec2.cloud.redislabs.com:13712
EMAILJS_SERVICE_ID=service_7hizj8v
EMAILJS_TEMPLATE_ID=template_wh4q8sa
EMAILJS_PUBLIC_KEY=zkK2mVNTo5OTMhvQv
EMAILJS_PRIVATE_KEY=GXalvYErebOEaD_teqZb6
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

### 2. Render Service Configuration
- **Service Type**: Web Service
- **Environment**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`

### 3. Accessible Endpoints After Deployment

#### 🌐 Main Endpoints
- **API Base**: `https://waretrack-pro-backend.onrender.com/api`
- **Health Check**: `https://waretrack-pro-backend.onrender.com/health`
- **API Info**: `https://waretrack-pro-backend.onrender.com/api`

#### 📚 Swagger Documentation
- **Swagger UI**: `https://waretrack-pro-backend.onrender.com/api-docs`
- **Interactive API Explorer**: Available in production
- **Authentication**: Bearer token support enabled

#### 🔐 Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

#### 📦 Core API Endpoints
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/inventory` - Inventory management
- `POST /api/orders` - Order management
- `GET /api/dispatch` - Dispatch tracking
- `GET /api/vehicles` - Vehicle management
- `GET /api/drivers` - Driver management
- `GET /api/users` - User management
- `GET /api/reports` - Analytics and reports

#### 📧 Email Testing
- `POST /api/test/email` - Test all email notifications

## ✅ Production Features Enabled

### 🔒 Security
- ✅ **Helmet Security Headers** - XSS protection, CSP, etc.
- ✅ **CORS Configuration** - Proper origin handling
- ✅ **Rate Limiting** - 1000 requests per 15 minutes
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Input Validation** - Request sanitization

### 📊 Performance
- ✅ **Compression** - Gzip compression enabled
- ✅ **Redis Caching** - Response and session caching
- ✅ **Connection Pooling** - Optimized database connections
- ✅ **Graceful Shutdown** - Proper process handling

### 📚 Documentation
- ✅ **Swagger UI** - Interactive API documentation
- ✅ **Health Monitoring** - Detailed health checks
- ✅ **Error Handling** - Standardized error responses
- ✅ **Request Logging** - Comprehensive logging

### 📧 Email System
- ✅ **EmailJS Integration** - Professional email templates
- ✅ **5 Notification Types**:
  - Welcome emails (🎉)
  - Order updates (📦)
  - Low stock alerts (⚠️)
  - Delivery assignments (🚛)
  - Delivery confirmations (✅)

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl https://waretrack-pro-backend.onrender.com/health
```

### 2. API Info
```bash
curl https://waretrack-pro-backend.onrender.com/api
```

### 3. Test Registration
```bash
curl -X POST https://waretrack-pro-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Admin",
    "email": "admin@test.com",
    "password": "password123",
    "phone": "+1234567890"
  }'
```

### 4. Test Login
```bash
curl -X POST https://waretrack-pro-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'
```

### 5. Test Email Notifications
```bash
# Test welcome email
curl -X POST https://waretrack-pro-backend.onrender.com/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"type": "welcome"}'

# Test order update
curl -X POST https://waretrack-pro-backend.onrender.com/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"type": "order_update"}'
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Swagger Not Loading
- **Solution**: CSP headers updated to allow Swagger UI scripts
- **Check**: Visit `/api-docs` directly in browser

#### 2. CORS Errors
- **Solution**: Frontend URL properly configured in CORS
- **Check**: Verify `FRONTEND_URL` environment variable

#### 3. Database Connection Issues
- **Solution**: Supabase connection string properly encoded
- **Check**: Test with `/health` endpoint

#### 4. Redis Connection Issues
- **Solution**: System gracefully handles Redis unavailability
- **Check**: Health endpoint shows Redis status

#### 5. Email Notifications Not Working
- **Solution**: EmailJS credentials properly configured
- **Check**: Test with `/api/test/email` endpoint

### Environment Variable Checklist
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` (Supabase connection string)
- [ ] `JWT_SECRET` (secure random string)
- [ ] `FRONTEND_URL` (Vercel deployment URL)
- [ ] `BACKEND_URL` (Render service URL)
- [ ] `REDIS_URL` (Redis Cloud connection string)
- [ ] EmailJS credentials (4 variables)
- [ ] Rate limiting settings

## 📱 Frontend Integration

Update your frontend `.env` file:
```env
REACT_APP_API_URL=https://waretrack-pro-backend.onrender.com/api
```

## 🎯 Success Indicators

After deployment, you should see:
- ✅ Health check returns 200 status
- ✅ Swagger UI loads at `/api-docs`
- ✅ Authentication endpoints work
- ✅ Email notifications send successfully
- ✅ All API endpoints return proper JSON responses
- ✅ CORS allows frontend requests
- ✅ Rate limiting protects against abuse

## 📞 Support

If you encounter issues:
1. Check Render service logs
2. Verify all environment variables
3. Test individual endpoints
4. Check database connectivity
5. Verify Redis connection

Your WareTrack-Pro backend is now production-ready on Render! 🚀