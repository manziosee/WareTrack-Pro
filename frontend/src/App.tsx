import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
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
          <Route path="/users" element={<MainLayout><Users /></MainLayout>} />
          <Route path="/inventory" element={<MainLayout><Inventory /></MainLayout>} />
          <Route path="/orders" element={<MainLayout><Orders /></MainLayout>} />
          <Route path="/dispatch" element={<MainLayout><Dispatch /></MainLayout>} />
          <Route path="/vehicles" element={<MainLayout><Vehicles /></MainLayout>} />
          <Route path="/tracking" element={<MainLayout><Tracking /></MainLayout>} />
          <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
          <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
          <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
          <Route path="/inventory/:id/edit" element={<MainLayout><EditInventory /></MainLayout>} />
          <Route path="/orders/:id" element={<MainLayout><ViewOrder /></MainLayout>} />
          <Route path="/orders/:id/edit" element={<MainLayout><EditOrder /></MainLayout>} />

        </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;