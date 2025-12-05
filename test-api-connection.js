const axios = require('axios');

const API_URL = 'https://waretrack-pro.onrender.com/api';

async function testConnection() {
  console.log('Testing API connection to:', API_URL);
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_URL.replace('/api', '')}/health`, {
      timeout: 30000
    });
    console.log('✅ Health check:', healthResponse.data);
    
    // Test login endpoint
    console.log('\n2. Testing login endpoint...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful:', {
      success: loginResponse.data.success,
      hasUser: !!loginResponse.data.data?.user,
      hasToken: !!loginResponse.data.data?.tokens?.access,
      userRole: loginResponse.data.data?.user?.role
    });
    
  } catch (error) {
    console.error('❌ Connection failed:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testConnection();