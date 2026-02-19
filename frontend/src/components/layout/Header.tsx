import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Search, User, Settings, LogOut, ChevronDown, CheckCheck, Package, ShoppingCart, Truck, Car } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '@/services/notificationService';
import type { Notification } from '@/services/notificationService';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [expandedNotification, setExpandedNotification] = useState<number | null>(null);

  const getTimeAgo = (date: string): string => {
    const now = new Date();
    const diffInMs = now.getTime() - new Date(date).getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
  };

  // Fetch unread count and recent notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setNotificationLoading(true);
      const [statsData, notifData] = await Promise.all([
        notificationService.getStats(),
        notificationService.getNotifications({ limit: 10, unreadOnly: true }) // Only fetch unread
      ]);
      setUnreadCount(statsData.unread || 0);
      setNotifications(notifData.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setNotifications([]); // Clear all notifications from bell
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleMarkOneAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      // Remove the notification from the list
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      // Collapse after marking as read
      setTimeout(() => setExpandedNotification(null), 500);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Always expand and mark as read for unread notifications
    setExpandedNotification(notification.id);
    // Mark as read after a short delay to show the expanded state
    setTimeout(() => handleMarkOneAsRead(notification.id), 300);
  };

  const getNotificationTypeColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'warning': return 'bg-warning-500';
      case 'success': return 'bg-success-500';
      case 'error': return 'bg-error-500';
      case 'info': return 'bg-primary-500';
      default: return 'bg-gray-500';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    setShowSearchResults(true);

    try {
      const [ordersRes, inventoryRes, vehiclesRes, driversRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/orders?search=${query}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(`${import.meta.env.VITE_API_URL}/inventory?search=${query}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(`${import.meta.env.VITE_API_URL}/vehicles?search=${query}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(`${import.meta.env.VITE_API_URL}/drivers?search=${query}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()).catch(() => ({ data: [] }))
      ]);

      const results = [
        ...(ordersRes.data || []).slice(0, 3).map((item: any) => ({ ...item, type: 'order' })),
        ...(inventoryRes.data || []).slice(0, 3).map((item: any) => ({ ...item, type: 'inventory' })),
        ...(vehiclesRes.data || []).slice(0, 2).map((item: any) => ({ ...item, type: 'vehicle' })),
        ...(driversRes.data || []).slice(0, 2).map((item: any) => ({ ...item, type: 'driver' }))
      ];

      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleResultClick = (result: any) => {
    setShowSearchResults(false);
    setSearchQuery('');
    switch (result.type) {
      case 'order':
        navigate(`/orders/${result.id}`);
        break;
      case 'inventory':
        navigate('/inventory');
        break;
      case 'vehicle':
        navigate('/vehicles');
        break;
      case 'driver':
        navigate('/drivers');
        break;
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingCart className="w-4 h-4" />;
      case 'inventory': return <Package className="w-4 h-4" />;
      case 'vehicle': return <Car className="w-4 h-4" />;
      case 'driver': return <Truck className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-lg" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search orders, inventory, drivers..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Searching...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}-${index}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left flex items-center gap-3"
                      >
                        <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                          {getResultIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {result.type === 'order' && `Order ${result.orderNumber || `#${result.id}`}`}
                            {result.type === 'inventory' && result.name}
                            {result.type === 'vehicle' && result.plateNumber}
                            {result.type === 'driver' && result.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {result.type === 'order' && result.customerName}
                            {result.type === 'inventory' && `${result.code} - ${result.category}`}
                            {result.type === 'vehicle' && `${result.type} - ${result.capacity}kg`}
                            {result.type === 'driver' && result.licenseNumber}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 capitalize">{result.type}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No results found for "{searchQuery}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-error-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <p className="text-xs text-gray-500">{unreadCount} unread</p>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notificationLoading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Loading...</p>
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-all duration-300 cursor-pointer ${
                          !notification.read ? 'bg-blue-50/50' : ''
                        } ${
                          expandedNotification === notification.id 
                            ? 'scale-110 shadow-lg bg-white z-50 rounded-lg border border-primary-400' 
                            : ''
                        }`}
                        style={{
                          transformOrigin: 'center',
                          transition: 'all 0.3s ease-out'
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 transition-all ${
                            !notification.read
                              ? getNotificationTypeColor(notification.severity)
                              : 'bg-gray-300'
                          } ${
                            expandedNotification === notification.id ? 'w-2.5 h-2.5' : ''
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${
                                !notification.read ? 'text-gray-900' : 'text-gray-600'
                              }`}>{notification.title}</p>
                              {!notification.read && (
                                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0 animate-pulse"></div>
                              )}
                            </div>
                            <p className={`text-sm text-gray-500 mt-0.5 transition-all ${
                              expandedNotification === notification.id ? 'line-clamp-none' : 'line-clamp-2'
                            }`}>{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{getTimeAgo(notification.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      navigate('/notifications');
                      setShowNotifications(false);
                    }}
                    className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-3 pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-lg p-2 transition-colors"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Guest'}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ') || 'User'}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-medium">
                {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-medium">
                      {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user?.name || 'Guest'}</p>
                      <p className="text-sm text-gray-500">{user?.email || 'guest@example.com'}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ') || 'User'}</p>
                    </div>
                  </div>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>
                <div className="border-t border-gray-200 py-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
