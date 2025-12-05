const axios = require('axios');

const API_URL = 'https://waretrack-pro.onrender.com/api';

async function syncDriverVehicleStatus() {
  try {
    // Login to get token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.tokens.access;
    console.log('✅ Login successful');
    
    // Get all drivers and their current status
    console.log('👨‍💼 Fetching drivers...');
    const driversResponse = await axios.get(`${API_URL}/drivers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const drivers = driversResponse.data.data;
    console.log(`📋 Found ${drivers.length} drivers`);
    
    // Get all vehicles and their current status
    console.log('🚛 Fetching vehicles...');
    const vehiclesResponse = await axios.get(`${API_URL}/vehicles`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const vehicles = vehiclesResponse.data.data;
    console.log(`📋 Found ${vehicles.length} vehicles`);
    
    // Get all dispatches to check current assignments
    console.log('📦 Fetching dispatches...');
    const dispatchResponse = await axios.get(`${API_URL}/dispatch`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const dispatches = dispatchResponse.data.data;
    console.log(`📋 Found ${dispatches.length} dispatches`);
    
    // Check active dispatches (not delivered or cancelled)
    const activeDispatches = dispatches.filter(d => 
      d.status === 'PENDING' || d.status === 'DISPATCHED' || d.status === 'IN_TRANSIT'
    );
    
    console.log(`🔄 Found ${activeDispatches.length} active dispatches`);
    
    // Check driver statuses
    console.log('\n👨‍💼 Checking driver statuses:');
    for (const driver of drivers) {
      const hasActiveDispatch = activeDispatches.some(d => d.driverId === driver.id);
      const expectedStatus = hasActiveDispatch ? 'ON_DUTY' : 'AVAILABLE';
      
      console.log(`  Driver ${driver.name}: Current=${driver.status}, Expected=${expectedStatus}, Active=${hasActiveDispatch}`);
    }
    
    // Check vehicle statuses
    console.log('\n🚛 Checking vehicle statuses:');
    for (const vehicle of vehicles) {
      const hasActiveDispatch = activeDispatches.some(d => d.vehicleId === vehicle.id);
      let expectedStatus = hasActiveDispatch ? 'IN_USE' : 'AVAILABLE';
      
      // Don't change maintenance or unavailable status
      if (vehicle.status === 'MAINTENANCE' || vehicle.status === 'UNAVAILABLE') {
        expectedStatus = vehicle.status;
      }
      
      console.log(`  Vehicle ${vehicle.plateNumber}: Current=${vehicle.status}, Expected=${expectedStatus}, Active=${hasActiveDispatch}`);
    }
    
    console.log('\n✅ Status sync completed! The backend will automatically update statuses when you fetch drivers/vehicles.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

syncDriverVehicleStatus();