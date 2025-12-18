import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, Shield, Users, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Attempting login with:', { email, apiUrl: import.meta.env.VITE_API_URL });
      await login(email, password);
      toast.success(`Welcome back!`);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      let errorMessage = 'Login failed';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 p-12 flex-col justify-between text-white">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white/20 p-3 rounded-xl">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">WareTrack-Pro</h1>
              <p className="text-primary-100">Warehouse Management System</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Streamline Your<br />
              Warehouse Operations
            </h2>
            <p className="text-xl text-primary-100 leading-relaxed">
              Complete delivery and dispatch tracking system for modern warehouses
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
            <Truck className="w-8 h-8 mb-3" />
            <h3 className="font-semibold mb-1">Fleet Management</h3>
            <p className="text-sm text-primary-100">Track vehicles and optimize routes</p>
          </div>
          <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
            <Shield className="w-8 h-8 mb-3" />
            <h3 className="font-semibold mb-1">Secure & Reliable</h3>
            <p className="text-sm text-primary-100">Enterprise-grade security</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="bg-primary-600 p-3 rounded-xl">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WareTrack-Pro</h1>
              <p className="text-gray-600">Warehouse Management</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                >
                  Create one here
                </button>
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-3">
              <Package className="w-6 h-6 text-primary-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Inventory</p>
            </div>
            <div className="p-3">
              <Truck className="w-6 h-6 text-primary-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Delivery</p>
            </div>
            <div className="p-3">
              <Users className="w-6 h-6 text-primary-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Team</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}