import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { I18nProvider } from './i18n/I18nContext';
import MainLayout from './components/layout/MainLayout';
import RoleGuard from './components/ui/RoleGuard';
import { PageSkeleton } from './components/ui/Skeleton';
import type { UserRole } from './types';

// Public pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import About from './pages/About';
import NotFound from './pages/NotFound';

// App pages are loaded on demand to keep the first load fast
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Inventory = lazy(() => import('./pages/Inventory'));
const EditInventory = lazy(() => import('./pages/EditInventory'));
const Orders = lazy(() => import('./pages/Orders'));
const ViewOrder = lazy(() => import('./pages/ViewOrder'));
const EditOrder = lazy(() => import('./pages/EditOrder'));
const OrderBoard = lazy(() => import('./pages/OrderBoard'));
const Dispatch = lazy(() => import('./pages/Dispatch'));
const LiveMap = lazy(() => import('./pages/LiveMap'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Drivers = lazy(() => import('./pages/Drivers'));
const Tracking = lazy(() => import('./pages/Tracking'));
const Returns = lazy(() => import('./pages/Returns'));
const Scanner = lazy(() => import('./pages/Scanner'));
const Warehouses = lazy(() => import('./pages/Warehouses'));
const Purchasing = lazy(() => import('./pages/Purchasing'));
const Forecasting = lazy(() => import('./pages/Forecasting'));
const Scorecards = lazy(() => import('./pages/Scorecards'));
const Reports = lazy(() => import('./pages/Reports'));
const ReportBuilder = lazy(() => import('./pages/ReportBuilder'));
const Payments = lazy(() => import('./pages/Payments'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Cash = lazy(() => import('./pages/Cash'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Accounting = lazy(() => import('./pages/Accounting'));
const Packing = lazy(() => import('./pages/Packing'));
const StockCounts = lazy(() => import('./pages/StockCounts'));
const Messages = lazy(() => import('./pages/Messages'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const MyDeliveries = lazy(() => import('./pages/MyDeliveries'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ALL: UserRole[] = ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER', 'DRIVER'];
const STAFF: UserRole[] = ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER'];
const STOCK: UserRole[] = ['ADMIN', 'WAREHOUSE_STAFF'];
const FLEET: UserRole[] = ['ADMIN', 'DISPATCH_OFFICER'];

/** Signed-in page: layout + role check + loading placeholder. */
function AppPage({ roles = ALL, children }: { roles?: UserRole[]; children: ReactNode }) {
  return (
    <MainLayout>
      <RoleGuard allowedRoles={roles}>
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </RoleGuard>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <RealtimeProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/track" element={<Suspense fallback={null}><TrackOrder /></Suspense>} />
                <Route path="/track/:orderNumber" element={<Suspense fallback={null}><TrackOrder /></Suspense>} />

                {/* Everyone signed in */}
                <Route path="/dashboard" element={<AppPage><Dashboard /></AppPage>} />
                <Route path="/messages" element={<AppPage><Messages /></AppPage>} />
                <Route path="/notifications" element={<AppPage><Notifications /></AppPage>} />
                <Route path="/settings" element={<AppPage><Settings /></AppPage>} />
                <Route path="/profile" element={<AppPage><Profile /></AppPage>} />

                {/* Drivers */}
                <Route path="/my-deliveries" element={<AppPage roles={['DRIVER']}><MyDeliveries /></AppPage>} />

                {/* Operations */}
                <Route path="/orders" element={<AppPage roles={STAFF}><Orders /></AppPage>} />
                <Route path="/orders/board" element={<AppPage roles={STAFF}><OrderBoard /></AppPage>} />
                <Route path="/orders/:id" element={<AppPage roles={STAFF}><ViewOrder /></AppPage>} />
                <Route path="/orders/:id/edit" element={<AppPage roles={STAFF}><EditOrder /></AppPage>} />
                <Route path="/dispatch" element={<AppPage roles={FLEET}><Dispatch /></AppPage>} />
                <Route path="/map" element={<AppPage roles={FLEET}><LiveMap /></AppPage>} />
                <Route path="/calendar" element={<AppPage roles={FLEET}><Calendar /></AppPage>} />
                <Route path="/tracking" element={<AppPage roles={['ADMIN', 'DISPATCH_OFFICER', 'DRIVER']}><Tracking /></AppPage>} />
                <Route path="/returns" element={<AppPage roles={STAFF}><Returns /></AppPage>} />

                {/* Warehouse */}
                <Route path="/inventory" element={<AppPage roles={STOCK}><Inventory /></AppPage>} />
                <Route path="/inventory/:id/edit" element={<AppPage roles={STOCK}><EditInventory /></AppPage>} />
                <Route path="/scanner" element={<AppPage roles={STOCK}><Scanner /></AppPage>} />
                <Route path="/warehouses" element={<AppPage roles={STOCK}><Warehouses /></AppPage>} />
                <Route path="/purchasing" element={<AppPage roles={STOCK}><Purchasing /></AppPage>} />
                <Route path="/forecasting" element={<AppPage roles={STOCK}><Forecasting /></AppPage>} />

                {/* Fleet */}
                <Route path="/vehicles" element={<AppPage roles={['ADMIN', 'DISPATCH_OFFICER', 'DRIVER']}><Vehicles /></AppPage>} />
                <Route path="/drivers" element={<AppPage roles={['ADMIN', 'DISPATCH_OFFICER', 'DRIVER']}><Drivers /></AppPage>} />
                <Route path="/scorecards" element={<AppPage roles={FLEET}><Scorecards /></AppPage>} />

                {/* Insights */}
                <Route path="/reports" element={<AppPage roles={STAFF}><Reports /></AppPage>} />
                <Route path="/reports/builder" element={<AppPage roles={STAFF}><ReportBuilder /></AppPage>} />
                <Route path="/payments" element={<AppPage roles={STAFF}><Payments /></AppPage>} />
                <Route path="/accounts" element={<AppPage roles={STAFF}><Accounts /></AppPage>} />
                <Route path="/cash" element={<AppPage roles={STAFF}><Cash /></AppPage>} />
                <Route path="/expenses" element={<AppPage roles={['ADMIN', 'DISPATCH_OFFICER', 'DRIVER']}><Expenses /></AppPage>} />
                <Route path="/accounting" element={<AppPage roles={['ADMIN']}><Accounting /></AppPage>} />
                <Route path="/packing" element={<AppPage roles={STAFF}><Packing /></AppPage>} />
                <Route path="/stock-counts" element={<AppPage roles={['ADMIN', 'WAREHOUSE_STAFF']}><StockCounts /></AppPage>} />

                {/* Administration */}
                <Route path="/users" element={<AppPage roles={['ADMIN']}><Users /></AppPage>} />
                <Route path="/audit" element={<AppPage roles={['ADMIN']}><AuditLog /></AppPage>} />

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
          </RealtimeProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
