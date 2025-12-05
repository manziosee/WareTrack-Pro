import { useAuth } from '@/context/AuthContext';
import AdminDashboard from './dashboards/AdminDashboard';
import WarehouseStaffDashboard from './dashboards/WarehouseStaffDashboard';
import DispatchOfficerDashboard from './dashboards/DispatchOfficerDashboard';
import DriverDashboard from './dashboards/DriverDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'WAREHOUSE_STAFF':
      return <WarehouseStaffDashboard />;
    case 'DISPATCH_OFFICER':
      return <DispatchOfficerDashboard />;
    case 'DRIVER':
      return <DriverDashboard />;
    default:
      return <WarehouseStaffDashboard />;
  }
}