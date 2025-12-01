export const emailTemplates = {
  welcome: {
    title: 'Welcome to WareTrack-Pro 🎉',
    getMessage: (userName: string) => 
      `Welcome to WareTrack-Pro, ${userName}! Your account has been successfully created. You can now access the warehouse management system and start managing your inventory, orders, and deliveries. Get started by exploring your dashboard and setting up your first inventory items.`
  },
  
  orderUpdate: {
    title: (orderNumber: string) => `Order ${orderNumber} Status Update 📦`,
    getMessage: (orderNumber: string, status: string, userName: string) => 
      `Hello ${userName}, your order ${orderNumber} status has been updated to: ${status.toUpperCase()}. You can track your order progress and view detailed information in the WareTrack-Pro system dashboard. Expected delivery updates will be sent as they become available.`
  },
  
  lowStock: {
    title: 'Inventory Alert - Low Stock ⚠️',
    getMessage: (itemName: string, currentStock: number, minStock: number) => 
      `URGENT: ${itemName} is running critically low on stock. Current quantity: ${currentStock} units (Minimum required: ${minStock} units). Immediate restocking is recommended to avoid stockouts and maintain service levels. Please review and update inventory as soon as possible.`
  },
  
  dispatch: {
    title: 'New Delivery Assignment 🚛',
    getMessage: (driverName: string, orderNumber: string, customerName: string, address: string) => 
      `Hello ${driverName}, you have been assigned a new delivery for order ${orderNumber}. Customer: ${customerName}. Delivery address: ${address}. Please check your dashboard for complete delivery details, route information, and customer contact details.`
  },
  
  delivery: {
    title: 'Order Delivered Successfully ✅',
    getMessage: (customerName: string, orderNumber: string, deliveryTime: string) => 
      `Dear ${customerName}, your order ${orderNumber} has been delivered successfully at ${deliveryTime}. Thank you for choosing WareTrack-Pro services. We hope you are satisfied with your delivery experience. Please rate your delivery in the system if you have a moment.`
  }
};