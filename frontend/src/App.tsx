import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider } from './i18n/I18nContext';
import MainLayout from './components/layout/MainLayout';
import RoleGuard from './components/ui/RoleGuard';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Tracking from './pages/Tracking';
import Reports from './pages/Reports';
import Dispatch from './pages/Dispatch';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import EditInventory from './pages/EditInventory';
import ViewOrder from './pages/ViewOrder';
import EditOrder from './pages/EditOrder';
import About from './pages/About';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';
import ForceLight from './components/layout/ForceLight';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <I18nProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<ForceLight><Landing /></ForceLight>} />
          <Route path="/about" element={<ForceLight><About /></ForceLight>} />
          <Route path="/login" element={<ForceLight><Login /></ForceLight>} />
          <Route path="/register" element={<ForceLight><Register /></ForceLight>} />
          <Route path="/forgot-password" element={<ForceLight><ForgotPassword /></ForceLight>} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
          
          {/* Admin Only */}
          <Route path="/users" element={
            <MainLayout>
              <RoleGuard allowedRoles={['ADMIN']}>
                <Users />
              </RoleGuard>
            </MainLayout>
          } />
          
          {/* Warehouse Staff, Admin */}
          <Route path="/inventory" element={
            <MainLayout>
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE_STAFF']}>
                <Inventory />
              </RoleGuard>
            </MainLayout>
          } />
          <Route path="/inventory/:id/edit" element={
            <MainLayout>
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE_STAFF']}>
                <EditInventory />
              </RoleGuard>
            </MainLayout>
          } />
          
          {/* Orders - All except Driver */}
          <Route path="/orders" element={
            <MainLayout>
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER']}>
                <Orders />
              </RoleGuard>
            </MainLayout>
          } />
          <Route path="/orders/:id" element={
            <MainLayout>
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER']}>
                <ViewOrder />
              </RoleGuard>
            </MainLayout>
          } />
          <Route path="/orders/:id/edit" element={
            <MainLayout>
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER']}>
                <EditOrder />
              </RoleGuard>
            </MainLayout>
          } />
          
          {/* Dispatch - Admin, Dispatch Officer */}
          <Route path="/dispatch" element={
            <MainLayout>
              <RoleGuard allowedRoles={['ADMIN', 'DISPATCH_OFFICER']}>
                <Dispatch />
              </RoleGuard>
            </MainLayout>
          } />
          
          {/* Vehicles - Admin, Dispatch Officer, Driver (read-only) */}
          <Route path="/vehicles" element={
            <MainLayout>
              <RoleGuard allowedRoles={['ADMIN', 'DISPATCH_OFFICER', 'DRIVER']}>
                <Vehicles />
              </RoleGuard>
            </MainLayout>
          } />
          
          {/* Drivers - Admin, Dispatch Officer, Driver (read-only) */}
          <Route path="/drivers" element={
            <MainLayout>
              <RoleGuard allowedRoles={['ADMIN', 'DISPATCH_OFFICER', 'DRIVER']}>
                <Drivers />
              </RoleGuard>
            </MainLayout>
          } />
          
          {/* Tracking - All except Warehouse Staff */}
          <Route path="/tracking" element={
            <MainLayout>
              <RoleGuard allowedRoles={['ADMIN', 'DISPATCH_OFFICER', 'DRIVER']}>
                <Tracking />
              </RoleGuard>
            </MainLayout>
          } />
          
          {/* Reports - All except Driver */}
          <Route path="/reports" element={
            <MainLayout>
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER']}>
                <Reports />
              </RoleGuard>
            </MainLayout>
          } />
          
          {/* Settings - All authenticated users */}
          <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
          
          {/* Profile - All authenticated users */}
          <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
          
          {/* Notifications - All authenticated users */}
          <Route path="/notifications" element={<MainLayout><Notifications /></MainLayout>} />

          <Route path="*" element={<NotFound />} />

        </Routes>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            className: '!rounded-xl !bg-white !text-gray-900 !text-sm !shadow-lift !border !border-gray-100',
            success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
      </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;