const axios = require('axios');

const API_URL = 'https://waretrack-pro.onrender.com/api';

async function fixOrderStatus() {
  try {
    // Login to get token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.tokens.access;
    console.log('✅ Login successful');
    
    // Get all orders to find ORD-000001
    console.log('📋 Fetching orders...');
    const ordersResponse = await axios.get(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const orders = ordersResponse.data.data;
    const targetOrder = orders.find(order => order.orderNumber === 'ORD-000001');
    
    if (!targetOrder) {
      console.log('❌ Order ORD-000001 not found');
      return;
    }
    
    console.log('📦 Found order:', {
      id: targetOrder.id,
      orderNumber: targetOrder.orderNumber,
      status: targetOrder.status,
      customerName: targetOrder.customerName
    });
    
    // Get all dispatches to find the one for this order
    console.log('🚛 Fetching dispatches...');
    const dispatchResponse = await axios.get(`${API_URL}/dispatch`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const dispatches = dispatchResponse.data.data;
    const targetDispatch = dispatches.find(dispatch => dispatch.orderId === targetOrder.id);
    
    if (!targetDispatch) {
      console.log('❌ No dispatch found for order ORD-000001');
      return;
    }
    
    console.log('🚚 Found dispatch:', {
      id: targetDispatch.id,
      orderId: targetDispatch.orderId,
      status: targetDispatch.status
    });
    
    // Check if statuses are mismatched
    if (targetOrder.status !== targetDispatch.status) {
      console.log(`🔄 Status mismatch detected:`);
      console.log(`   Order status: ${targetOrder.status}`);
      console.log(`   Dispatch status: ${targetDispatch.status}`);
      
      // Update dispatch status to match order status
      console.log('🔧 Updating dispatch status...');
      const updateResponse = await axios.post(`${API_URL}/dispatch/${targetDispatch.id}/status`, {
        status: targetOrder.status,
        notes: 'Status synced automatically'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (updateResponse.data.success) {
        console.log('✅ Dispatch status updated successfully');
        console.log(`   New dispatch status: ${targetOrder.status}`);
      } else {
        console.log('❌ Failed to update dispatch status');
      }
    } else {
      console.log('✅ Order and dispatch statuses are already in sync');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

fixOrderStatus();