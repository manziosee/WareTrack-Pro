import Badge from '../ui/Badge';
import { formatDate } from '../../utils/formatters';

interface ViewInventoryModalProps {
  item: any;
}

export default function ViewInventoryModal({ item }: ViewInventoryModalProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'gray';
      case 'DISCONTINUED': return 'error';
      default: return 'gray';
    }
  };

  const getStockBadgeVariant = (current: number, min: number) => {
    const percentage = (current / min) * 100;
    if (percentage <= 25) return 'error';
    if (percentage <= 50) return 'warning';
    return 'success';
  };

  const getStockStatus = (current: number, min: number) => {
    if (current === 0) return 'Out of Stock';
    if (current <= min) return 'Low Stock';
    return 'In Stock';
  };

  return (
    <div className="space-y-6">
      {/* Item Header */}
      <div className="border-b pb-4">
        <h3 className="text-xl font-semibold text-gray-900">{item.name}</h3>
        <p className="text-gray-600 mt-1">Item Code: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{item.code}</code></p>
      </div>

      {/* Item Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
            <p className="text-gray-900">{item.name}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <Badge variant="gray">{item.category}</Badge>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <p className="text-gray-900">{item.location}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <p className="text-gray-900">{item.unit}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Category</label>
            <p className="text-gray-900">{item.unitCategory || 'Not specified'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">{item.quantity}</span>
              <span className="text-gray-500">{item.unit}</span>
              <Badge variant={getStockBadgeVariant(item.quantity, item.minQuantity)}>
                {getStockStatus(item.quantity, item.minQuantity)}
              </Badge>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Quantity</label>
            <p className="text-gray-900">{item.minQuantity} {item.unit}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
            <p className="text-gray-900 text-lg font-semibold">RWF {Number(item.unitPrice).toLocaleString()}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Value</label>
            <p className="text-gray-900 text-lg font-semibold">RWF {(item.quantity * item.unitPrice).toLocaleString()}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <Badge variant={getStatusBadgeVariant(item.status)}>
              {item.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="border-t pt-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <p className="text-gray-900">{item.supplier || 'Not specified'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
            <p className="text-gray-900">{item.barcode || 'Not specified'}</p>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <p className="text-gray-900">{item.description || 'No description provided'}</p>
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="border-t pt-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Record Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
            <p className="text-gray-900">{formatDate(item.createdAt)}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
            <p className="text-gray-900">{formatDate(item.lastUpdated)}</p>
          </div>
        </div>
      </div>

      {/* Stock Alert */}
      {item.quantity <= item.minQuantity && (
        <div className="border-t pt-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Stock Alert</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  This item is {item.quantity === 0 ? 'out of stock' : 'running low'}. 
                  Consider restocking soon to avoid shortages.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}