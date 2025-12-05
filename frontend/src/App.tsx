import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import RoleGuard from './components/ui/RoleGuard';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Vehicles from './pages/Vehicles';
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
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
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
          
          {/* Vehicles - Admin, Dispatch Officer */}
          <Route path="/vehicles" element={
            <MainLayout>
              <RoleGuard allowedRoles={['ADMIN', 'DISPATCH_OFFICER']}>
                <Vehicles />
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
          
          {/* Settings - Admin, Dispatch Officer */}
          <Route path="/settings" element={
            <MainLayout>
              <RoleGuard allowedRoles={['ADMIN', 'DISPATCH_OFFICER']}>
                <Settings />
              </RoleGuard>
            </MainLayout>
          } />
          
          {/* Profile - All authenticated users */}
          <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
          
          {/* Notifications - All authenticated users */}
          <Route path="/notifications" element={<MainLayout><Notifications /></MainLayout>} />

        </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;