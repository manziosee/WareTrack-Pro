import { Mail, Phone, Shield, CalendarClock, LogIn, CheckCircle2, UserRound } from 'lucide-react';
import Badge from '../ui/Badge';
import { DetailHero, DetailSection, DetailField, DetailGrid, DetailStat } from '../ui/Detail';
import { formatDate, initials } from '../../utils/formatters';

interface ViewUserModalProps {
  user: any;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'Full system access and user management',
    'Can create, edit, and delete all records',
    'Access to all reports and analytics',
  ],
  WAREHOUSE_STAFF: [
    'Inventory management and stock updates',
    'Order processing and fulfillment',
    'Access to inventory reports',
  ],
  DISPATCH_OFFICER: [
    'Dispatch management and assignment',
    'Vehicle and driver coordination',
    'Delivery tracking and updates',
  ],
  DRIVER: [
    'View assigned deliveries',
    'Update delivery status',
    'Access to delivery tracking',
  ],
};

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

  const roleLabel = (user.role || '').replace(/_/g, ' ');
  const permissions = ROLE_PERMISSIONS[user.role] || [];

  return (
    <div className="space-y-5">
      <DetailHero
        avatar={initials(user.name)}
        title={user.name}
        subtitle={user.email}
        badges={
          <>
            <Badge variant={getRoleBadgeVariant(user.role)}>{roleLabel}</Badge>
            <Badge variant={user.status === 'ACTIVE' ? 'success' : 'gray'} size="sm">{user.status}</Badge>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailStat
          label="Last Login"
          value={<span className="text-lg">{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</span>}
          icon={<LogIn className="w-4 h-4" />}
        />
        <DetailStat
          label="Member Since"
          value={<span className="text-lg">{formatDate(user.createdAt)}</span>}
          icon={<CalendarClock className="w-4 h-4" />}
          tone="accent"
        />
      </div>

      <DetailSection title="Contact" icon={<UserRound className="w-4 h-4" />}>
        <DetailGrid>
          <DetailField label="Full Name">{user.name}</DetailField>
          <DetailField label="Email Address">
            <a href={`mailto:${user.email}`} className="inline-flex items-center gap-1.5 text-primary-600 hover:underline">
              <Mail className="w-3.5 h-3.5" />
              {user.email}
            </a>
          </DetailField>
          <DetailField label="Phone Number">
            {user.phone ? (
              <a href={`tel:${user.phone}`} className="inline-flex items-center gap-1.5 text-primary-600 hover:underline">
                <Phone className="w-3.5 h-3.5" />
                {user.phone}
              </a>
            ) : 'Not provided'}
          </DetailField>
          <DetailField label="Last Updated">{formatDate(user.updatedAt)}</DetailField>
        </DetailGrid>
      </DetailSection>

      {permissions.length > 0 && (
        <DetailSection title={`${roleLabel} Permissions`} icon={<Shield className="w-4 h-4" />}>
          <ul className="grid grid-cols-1 gap-2">
            {permissions.map((permission) => (
              <li key={permission} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-success-500" />
                {permission}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}
    </div>
  );
}
