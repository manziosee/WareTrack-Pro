import { useAuth } from '@/context/AuthContext';
import AdminDashboard from './dashboards/AdminDashboard';
import WarehouseStaffDashboard from './dashboards/WarehouseStaffDashboard';
import DispatchOfficerDashboard from './dashboards/DispatchOfficerDashboard';
import DriverDashboard from './dashboards/DriverDashboard';
import GuidedSetup from '@/components/onboarding/GuidedSetup';

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
  let dashboard;
  switch (user.role) {
    case 'ADMIN':
      dashboard = <AdminDashboard />;
      break;
    case 'WAREHOUSE_STAFF':
      dashboard = <WarehouseStaffDashboard />;
      break;
    case 'DISPATCH_OFFICER':
      dashboard = <DispatchOfficerDashboard />;
      break;
    case 'DRIVER':
      dashboard = <DriverDashboard />;
      break;
    default:
      dashboard = <WarehouseStaffDashboard />;
  }
  return <><GuidedSetup />{dashboard}</>;
}
