import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsCollapsed(mobile);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Filter navigation based on user role
  const getFilteredNavigation = () => {
    if (!user) return [];

    switch (user.role) {
      case 'ADMIN':
        return navigation; // Admin sees everything
      case 'WAREHOUSE_STAFF':
        return navigation.filter(item => 
          ['Dashboard', 'Inventory', 'Orders', 'Reports'].includes(item.name)
        );
      case 'DISPATCH_OFFICER':
        return navigation.filter(item => 
          ['Dashboard', 'Orders', 'Dispatch', 'Vehicles', 'Tracking', 'Reports'].includes(item.name)
        );
      case 'DRIVER':
        return navigation.filter(item => 
          ['Dashboard', 'Tracking'].includes(item.name)
        );
      default:
        return navigation.filter(item => 
          ['Dashboard'].includes(item.name)
        ); // Fallback: only dashboard
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300 relative ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-5 border-b border-gray-200`}>
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Package className="w-6 h-6 text-white" />
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-xl text-gray-900 truncate">WareTrack</h1>
            <p className="text-xs text-gray-500">Pro</p>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {getFilteredNavigation().map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group relative ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
            title={isCollapsed ? item.name : ''}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">{item.name}</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                {item.name}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="px-2 py-4 border-t border-gray-200 space-y-1">
        {/* Settings - Only for Admin and Dispatch Officers */}
        {(user?.role === 'ADMIN' || user?.role === 'DISPATCH_OFFICER') && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group relative ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
            title={isCollapsed ? 'Settings' : ''}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">Settings</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                Settings
              </div>
            )}
          </NavLink>
        )}
        <button 
          onClick={handleLogout}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors group relative`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">Logout</span>}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              Logout
            </div>
          )}
        </button>
      </div>
    </div>
  );
}