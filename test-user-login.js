const axios = require('axios');

async function testUserLogin() {
  try {
    console.log('🔐 Testing login for test@example.com...');
    
    const response = await axios.post('https://waretrack-pro.onrender.com/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const { user, tokens } = response.data.data;
    
    console.log('✅ Login successful!');
    console.log('👤 User Details:');
    console.log('   - ID:', user.id);
    console.log('   - Name:', user.name);
    console.log('   - Email:', user.email);
    console.log('   - Role:', user.role);
    console.log('   - Status:', user.status);
    
    console.log('\n🔑 Token Details:');
    console.log('   - Access Token Length:', tokens.access.length);
    
    // Decode JWT to check if role is included
    const tokenParts = tokens.access.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    console.log('\n📋 JWT Payload:');
    console.log('   - User ID:', payload.userId);
    console.log('   - Role in JWT:', payload.role || 'NOT INCLUDED');
    console.log('   - Expires:', new Date(payload.exp * 1000).toLocaleString());
    
    if (!payload.role) {
      console.log('\n⚠️  WARNING: Role not included in JWT token!');
      console.log('   This means the frontend won\'t be able to route to the correct dashboard.');
    } else {
      console.log('\n✅ Role is properly included in JWT token!');
    }
    
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
  }
}

testUserLogin();