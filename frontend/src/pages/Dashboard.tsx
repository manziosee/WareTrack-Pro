import { useAuth } from '@/context/AuthContext';
import AdminDashboard from './dashboards/AdminDashboard';
import WarehouseDashboard from './dashboards/WarehouseDashboard';
import DispatchDashboard from './dashboards/DispatchDashboard';
import DriverDashboard from './dashboards/DriverDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Please log in to view dashboard</p>
      </div>
    );
  }

  // Render role-specific dashboard
  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'warehouse_staff':
      return <WarehouseDashboard />;
    case 'dispatch_officer':
      return <DispatchDashboard />;
    case 'driver':
      return <DriverDashboard />;
    default:
      return <AdminDashboard />;
  }
}