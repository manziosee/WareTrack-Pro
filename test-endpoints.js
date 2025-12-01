const axios = require('axios');

const API_BASE_URL = 'https://waretrack-pro.onrender.com/api';
let authToken = '';
let testUserId = '';
let testItemId = '';
let testOrderId = '';
let testVehicleId = '';
let testDriverId = '';
let testDispatchId = '';

// Test data
const testUser = {
  name: 'Test User',
  email: `test${Date.now()}@example.com`,
  password: 'password123',
  phone: '+1234567890'
};

const testItem = {
  name: 'Test Item',
  code: `TEST${Date.now()}`,
  category: 'Electronics',
  quantity: 100,
  minQuantity: 10,
  unitPrice: '25.99',
  location: 'Warehouse A',
  supplier: 'Test Supplier'
};

const testOrder = {
  customerName: 'Test Customer',
  customerEmail: 'customer@test.com',
  deliveryAddress: '123 Test Street',
  totalAmount: 100.00,
  items: []
};

const testVehicle = {
  registrationNumber: `TEST${Date.now()}`,
  make: 'Toyota',
  model: 'Hiace',
  year: 2020,
  type: 'Van',
  capacity: 1000
};

const testDriver = {
  name: 'Test Driver',
  licenseNumber: `LIC${Date.now()}`,
  phone: '+1234567891',
  experience: 5
};

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, useAuth = true) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: useAuth && authToken ? { Authorization: `Bearer ${authToken}` } : {}
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status 
    };
  }
}

// Test functions
async function testHealthAndInfo() {
  console.log('\n🔍 Testing Health & Info Endpoints...');
  
  const health = await apiCall('GET', '/../health', null, false);
  console.log('Health:', health.success ? '✅' : '❌', health.status);
  
  const info = await apiCall('GET', '', null, false);
  console.log('API Info:', info.success ? '✅' : '❌', info.status);
}

async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...');
  
  // Register
  const register = await apiCall('POST', '/auth/register', testUser, false);
  console.log('Register:', register.success ? '✅' : '❌', register.status);
  
  // Login
  const login = await apiCall('POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  }, false);
  console.log('Login:', login.success ? '✅' : '❌', login.status);
  
  if (login.success && login.data.data?.token) {
    authToken = login.data.data.token;
    testUserId = login.data.data.user?.id;
    console.log('Auth token obtained ✅');
  }
  
  // Profile
  const profile = await apiCall('GET', '/auth/profile');
  console.log('Profile:', profile.success ? '✅' : '❌', profile.status);
}

async function testDashboard() {
  console.log('\n📊 Testing Dashboard...');
  
  const stats = await apiCall('GET', '/dashboard/stats');
  console.log('Dashboard Stats:', stats.success ? '✅' : '❌', stats.status);
  
  const trends = await apiCall('GET', '/dashboard/trends');
  console.log('Dashboard Trends:', trends.success ? '✅' : '❌', trends.status);
}

async function testInventory() {
  console.log('\n📦 Testing Inventory...');
  
  // Get inventory
  const getInventory = await apiCall('GET', '/inventory');
  console.log('Get Inventory:', getInventory.success ? '✅' : '❌', getInventory.status);
  
  // Get categories
  const categories = await apiCall('GET', '/inventory/categories');
  console.log('Get Categories:', categories.success ? '✅' : '❌', categories.status);
  
  // Get stats
  const stats = await apiCall('GET', '/inventory/stats');
  console.log('Get Stats:', stats.success ? '✅' : '❌', stats.status);
  
  // Create item
  const createItem = await apiCall('POST', '/inventory', testItem);
  console.log('Create Item:', createItem.success ? '✅' : '❌', createItem.status);
  
  if (createItem.success && createItem.data?.id) {
    testItemId = createItem.data.id;
    
    // Get item by ID
    const getItem = await apiCall('GET', `/inventory/${testItemId}`);
    console.log('Get Item by ID:', getItem.success ? '✅' : '❌', getItem.status);
    
    // Update item
    const updateItem = await apiCall('PUT', `/inventory/${testItemId}`, {
      ...testItem,
      quantity: 50
    });
    console.log('Update Item:', updateItem.success ? '✅' : '❌', updateItem.status);
    
    // Get item history
    const history = await apiCall('GET', `/inventory/${testItemId}/history`);
    console.log('Get Item History:', history.success ? '✅' : '❌', history.status);
  }
  
  // Get low stock
  const lowStock = await apiCall('GET', '/inventory/low-stock');
  console.log('Get Low Stock:', lowStock.success ? '✅' : '❌', lowStock.status);
}

async function testOrders() {
  console.log('\n📋 Testing Orders...');
  
  // Get orders
  const getOrders = await apiCall('GET', '/orders');
  console.log('Get Orders:', getOrders.success ? '✅' : '❌', getOrders.status);
  
  // Get order statuses
  const statuses = await apiCall('GET', '/orders/status');
  console.log('Get Order Statuses:', statuses.success ? '✅' : '❌', statuses.status);
  
  // Create order
  if (testItemId) {
    testOrder.items = [{
      inventoryItemId: testItemId,
      quantity: 2,
      unitPrice: 25.99
    }];
  }
  
  const createOrder = await apiCall('POST', '/orders', testOrder);
  console.log('Create Order:', createOrder.success ? '✅' : '❌', createOrder.status);
  
  if (createOrder.success && createOrder.data?.id) {
    testOrderId = createOrder.data.id;
    
    // Get order by ID
    const getOrder = await apiCall('GET', `/orders/${testOrderId}`);
    console.log('Get Order by ID:', getOrder.success ? '✅' : '❌', getOrder.status);
    
    // Update order status
    const updateStatus = await apiCall('POST', `/orders/${testOrderId}/status`, {
      status: 'dispatched'
    });
    console.log('Update Order Status:', updateStatus.success ? '✅' : '❌', updateStatus.status);
  }
}

async function testVehicles() {
  console.log('\n🚛 Testing Vehicles...');
  
  // Get vehicles
  const getVehicles = await apiCall('GET', '/vehicles');
  console.log('Get Vehicles:', getVehicles.success ? '✅' : '❌', getVehicles.status);
  
  // Get vehicle statuses
  const statuses = await apiCall('GET', '/vehicles/status');
  console.log('Get Vehicle Statuses:', statuses.success ? '✅' : '❌', statuses.status);
  
  // Create vehicle
  const createVehicle = await apiCall('POST', '/vehicles', testVehicle);
  console.log('Create Vehicle:', createVehicle.success ? '✅' : '❌', createVehicle.status);
  
  if (createVehicle.success && createVehicle.data?.id) {
    testVehicleId = createVehicle.data.id;
    
    // Get vehicle by ID
    const getVehicle = await apiCall('GET', `/vehicles/${testVehicleId}`);
    console.log('Get Vehicle by ID:', getVehicle.success ? '✅' : '❌', getVehicle.status);
    
    // Update vehicle
    const updateVehicle = await apiCall('PUT', `/vehicles/${testVehicleId}`, {
      ...testVehicle,
      capacity: 1200
    });
    console.log('Update Vehicle:', updateVehicle.success ? '✅' : '❌', updateVehicle.status);
  }
}

async function testDrivers() {
  console.log('\n👨‍💼 Testing Drivers...');
  
  // Get drivers
  const getDrivers = await apiCall('GET', '/drivers');
  console.log('Get Drivers:', getDrivers.success ? '✅' : '❌', getDrivers.status);
  
  // Create driver
  if (testUserId) {
    testDriver.userId = testUserId;
    
    const createDriver = await apiCall('POST', '/drivers', testDriver);
    console.log('Create Driver:', createDriver.success ? '✅' : '❌', createDriver.status);
    
    if (createDriver.success && createDriver.data?.id) {
      testDriverId = createDriver.data.id;
      
      // Update driver
      const updateDriver = await apiCall('PUT', `/drivers/${testDriverId}`, {
        ...testDriver,
        experience: 7
      });
      console.log('Update Driver:', updateDriver.success ? '✅' : '❌', updateDriver.status);
      
      // Get driver assignments
      const assignments = await apiCall('GET', `/drivers/${testDriverId}/assignments`);
      console.log('Get Driver Assignments:', assignments.success ? '✅' : '❌', assignments.status);
    }
  }
}

async function testDispatch() {
  console.log('\n🚚 Testing Dispatch...');
  
  // Get dispatches
  const getDispatches = await apiCall('GET', '/dispatch');
  console.log('Get Dispatches:', getDispatches.success ? '✅' : '❌', getDispatches.status);
  
  // Get active dispatches
  const activeDispatches = await apiCall('GET', '/dispatch/active');
  console.log('Get Active Dispatches:', activeDispatches.success ? '✅' : '❌', activeDispatches.status);
  
  // Create dispatch
  if (testOrderId && testDriverId && testVehicleId) {
    const createDispatch = await apiCall('POST', '/dispatch', {
      orderId: testOrderId,
      driverId: testDriverId,
      vehicleId: testVehicleId
    });
    console.log('Create Dispatch:', createDispatch.success ? '✅' : '❌', createDispatch.status);
    
    if (createDispatch.success && createDispatch.data?.id) {
      testDispatchId = createDispatch.data.id;
      
      // Update dispatch status
      const updateStatus = await apiCall('POST', `/dispatch/${testDispatchId}/status`, {
        status: 'in_progress'
      });
      console.log('Update Dispatch Status:', updateStatus.success ? '✅' : '❌', updateStatus.status);
    }
  }
  
  // Get driver dispatch
  if (testDriverId) {
    const driverDispatch = await apiCall('GET', `/dispatch/driver/${testDriverId}`);
    console.log('Get Driver Dispatch:', driverDispatch.success ? '✅' : '❌', driverDispatch.status);
  }
}

async function testUsers() {
  console.log('\n👥 Testing Users...');
  
  // Get users
  const getUsers = await apiCall('GET', '/users');
  console.log('Get Users:', getUsers.success ? '✅' : '❌', getUsers.status);
  
  if (testUserId) {
    // Get user by ID
    const getUser = await apiCall('GET', `/users/${testUserId}`);
    console.log('Get User by ID:', getUser.success ? '✅' : '❌', getUser.status);
    
    // Update user
    const updateUser = await apiCall('PUT', `/users/${testUserId}`, {
      name: 'Updated Test User',
      email: testUser.email
    });
    console.log('Update User:', updateUser.success ? '✅' : '❌', updateUser.status);
  }
}

async function testReports() {
  console.log('\n📈 Testing Reports...');
  
  // Inventory report
  const inventoryReport = await apiCall('GET', '/reports/inventory');
  console.log('Inventory Report:', inventoryReport.success ? '✅' : '❌', inventoryReport.status);
  
  // Orders report
  const ordersReport = await apiCall('GET', '/reports/orders');
  console.log('Orders Report:', ordersReport.success ? '✅' : '❌', ordersReport.status);
  
  // Performance report
  const performanceReport = await apiCall('GET', '/reports/performance');
  console.log('Performance Report:', performanceReport.success ? '✅' : '❌', performanceReport.status);
}

async function testEmailNotifications() {
  console.log('\n📧 Testing Email Notifications...');
  
  const emailTypes = ['welcome', 'order_update', 'low_stock', 'delivery_assignment', 'delivery_confirmation'];
  
  for (const type of emailTypes) {
    const emailTest = await apiCall('POST', '/test/email', { type }, false);
    console.log(`Email ${type}:`, emailTest.success ? '✅' : '❌', emailTest.status);
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  // Delete test item
  if (testItemId) {
    const deleteItem = await apiCall('DELETE', `/inventory/${testItemId}`);
    console.log('Delete Test Item:', deleteItem.success ? '✅' : '❌');
  }
  
  // Delete test vehicle
  if (testVehicleId) {
    const deleteVehicle = await apiCall('DELETE', `/vehicles/${testVehicleId}`);
    console.log('Delete Test Vehicle:', deleteVehicle.success ? '✅' : '❌');
  }
  
  // Delete test user
  if (testUserId) {
    const deleteUser = await apiCall('DELETE', `/users/${testUserId}`);
    console.log('Delete Test User:', deleteUser.success ? '✅' : '❌');
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting WareTrack-Pro API Endpoint Tests...');
  console.log(`Testing API: ${API_BASE_URL}`);
  
  try {
    await testHealthAndInfo();
    await testAuthentication();
    await testDashboard();
    await testInventory();
    await testOrders();
    await testVehicles();
    await testDrivers();
    await testDispatch();
    await testUsers();
    await testReports();
    await testEmailNotifications();
    await cleanup();
    
    console.log('\n✅ All tests completed!');
    console.log('\n📊 Test Summary:');
    console.log('- Health & Info: API status and documentation');
    console.log('- Authentication: Register, login, profile');
    console.log('- Dashboard: Stats and trends');
    console.log('- Inventory: CRUD operations and stats');
    console.log('- Orders: Order management and status updates');
    console.log('- Vehicles: Fleet management');
    console.log('- Drivers: Driver management and assignments');
    console.log('- Dispatch: Delivery dispatch operations');
    console.log('- Users: User management');
    console.log('- Reports: Analytics and reporting');
    console.log('- Email: Notification system testing');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
runAllTests();