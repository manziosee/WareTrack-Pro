const axios = require('axios');

const API_BASE_URL = 'https://waretrack-pro.onrender.com';

async function quickTest() {
  console.log('🚀 Quick API Test\n');
  
  try {
    // Test health
    const health = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health:', health.status, health.data.status);
    
    // Test API info
    const info = await axios.get(`${API_BASE_URL}/api`);
    console.log('✅ API Info:', info.status, info.data.name);
    
    // Test Swagger
    const swagger = await axios.get(`${API_BASE_URL}/api-docs`, { 
      headers: { 'Accept': 'text/html' }
    });
    console.log('✅ Swagger:', swagger.status, 'Available');
    
    // Test email notifications
    const email = await axios.post(`${API_BASE_URL}/api/test/email`, {
      type: 'welcome'
    });
    console.log('✅ Email Test:', email.status, 'Working');
    
    console.log('\n🎉 Core endpoints are working!');
    console.log('\n📋 Available endpoints:');
    console.log('- Health: /health');
    console.log('- API Info: /api');
    console.log('- Swagger: /api-docs');
    console.log('- Email Test: /api/test/email');
    
    console.log('\n🔐 Authentication endpoints:');
    console.log('- Register: POST /api/auth/register');
    console.log('- Login: POST /api/auth/login');
    
    console.log('\n📊 Protected endpoints (require auth):');
    console.log('- Dashboard: /api/dashboard/stats');
    console.log('- Inventory: /api/inventory');
    console.log('- Orders: /api/orders');
    console.log('- Users: /api/users');
    console.log('- Vehicles: /api/vehicles');
    console.log('- Drivers: /api/drivers');
    console.log('- Dispatch: /api/dispatch');
    console.log('- Reports: /api/reports');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
  }
}

quickTest();