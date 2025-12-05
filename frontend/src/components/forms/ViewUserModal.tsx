import Badge from '../ui/Badge';
import { formatDate } from '../../utils/formatters';

interface ViewUserModalProps {
  user: any;
}

export default function ViewUserModal({ user }: ViewUserModalProps) {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'WAREHOUSE_STAFF': return 'primary';
      case 'DISPATCH_OFFICER': return 'warning';
      case 'DRIVER': return 'success';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* User Avatar and Basic Info */}
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-medium text-xl">
          {user.name.split(' ').map((n: string) => n[0]).join('')}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
          <p className="text-gray-600">{user.email}</p>
        </div>
      </div>

      {/* User Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <p className="text-gray-900">{user.name}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <p className="text-gray-900">{user.email}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <p className="text-gray-900">{user.phone || 'Not provided'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <Badge variant={getRoleBadgeVariant(user.role)}>
              {user.role.replace(/_/g, ' ')}
            </Badge>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <Badge variant={user.status === 'ACTIVE' ? 'success' : 'gray'}>
              {user.status}
            </Badge>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Login</label>
            <p className="text-gray-900">{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</p>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="border-t pt-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Account Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Created</label>
            <p className="text-gray-900">{formatDate(user.createdAt)}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
            <p className="text-gray-900">{formatDate(user.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Role Permissions */}
      <div className="border-t pt-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Role Permissions</h4>
        <div className="space-y-2">
          {user.role === 'ADMIN' && (
            <div className="text-sm text-gray-600">
              • Full system access and user management<br/>
              • Can create, edit, and delete all records<br/>
              • Access to all reports and analytics
            </div>
          )}
          {user.role === 'WAREHOUSE_STAFF' && (
            <div className="text-sm text-gray-600">
              • Inventory management and stock updates<br/>
              • Order processing and fulfillment<br/>
              • Access to inventory reports
            </div>
          )}
          {user.role === 'DISPATCH_OFFICER' && (
            <div className="text-sm text-gray-600">
              • Dispatch management and assignment<br/>
              • Vehicle and driver coordination<br/>
              • Delivery tracking and updates
            </div>
          )}
          {user.role === 'DRIVER' && (
            <div className="text-sm text-gray-600">
              • View assigned deliveries<br/>
              • Update delivery status<br/>
              • Access to delivery tracking
            </div>
          )}
        </div>
      </div>
    </div>
  );
}