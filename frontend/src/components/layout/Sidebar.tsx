import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  Truck, 
  Car, 
  MapPin, 
  BarChart3,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Dispatch', href: '/dispatch', icon: Truck },
  { name: 'Vehicles', href: '/vehicles', icon: Car },
  { name: 'Tracking', href: '/tracking', icon: MapPin },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Filter navigation based on user role
  const getFilteredNavigation = () => {
    if (!user) return navigation;

    switch (user.role) {
      case 'admin':
        return navigation;
      case 'warehouse_staff':
        return navigation.filter(item => 
          ['Dashboard', 'Inventory', 'Orders'].includes(item.name)
        );
      case 'dispatch_officer':
        return navigation.filter(item => 
          ['Dashboard', 'Orders', 'Dispatch', 'Vehicles', 'Tracking'].includes(item.name)
        );
      case 'driver':
        return navigation.filter(item => 
          ['Dashboard', 'Tracking'].includes(item.name)
        );
      default:
        return navigation;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-xl text-gray-900">WareTrack</h1>
          <p className="text-xs text-gray-500">Pro</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {getFilteredNavigation().map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="px-3 py-4 border-t border-gray-200 space-y-1">
        <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <Settings className="w-5 h-5" />
          Settings
        </button>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-error-600 hover:bg-error-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
}