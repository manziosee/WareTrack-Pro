import { formatOrderNumber, formatDate } from '../../utils/formatters';

interface ViewOrderFormProps {
  order: {
    id: number;
    orderNumber: string;
    customerName: string;
    contactNumber: string;
    deliveryAddress: string;
    priority: string;
    status: string;
    createdAt: string;
    items: Array<{
      itemName: string;
      quantity: number;
      unit: string;
      unitPrice: number;
    }>;
  };
  onClose: () => void;
}

const ViewOrderForm = ({ order, onClose }: ViewOrderFormProps) => {
  const totalAmount = order.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Order {formatOrderNumber(order.id)}
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
            order.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
            order.status === 'dispatched' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {order.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-gray-600">Created on {formatDate(order.createdAt)}</p>
      </div>

      {/* Customer Information */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-3">Customer Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer Name</label>
            <p className="text-sm text-gray-900 mt-1">{order.customerName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Number</label>
            <p className="text-sm text-gray-900 mt-1">{order.contactNumber}</p>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
          <p className="text-sm text-gray-900 mt-1">{order.deliveryAddress}</p>
        </div>
      </div>

      {/* Order Details */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-3">Order Details</h4>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Priority</label>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
              order.priority === 'high' ? 'bg-red-100 text-red-800' :
              order.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {order.priority.toUpperCase()}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Items</label>
            <p className="text-sm text-gray-900 mt-1">{order.items.length} item(s)</p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-3">Items</h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {order.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.itemName}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.quantity} {item.unit}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.unitPrice.toLocaleString()} RWF</td>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                    {(item.quantity * item.unitPrice).toLocaleString()} RWF
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                  Total Amount:
                </td>
                <td className="px-4 py-2 text-sm font-bold text-gray-900">
                  {totalAmount.toLocaleString()} RWF
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Close Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onClose}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ViewOrderForm;