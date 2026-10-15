import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, Truck, Users } from 'lucide-react';
import { authService } from '@/services/authService';
import toast from 'react-hot-toast';
import AuthShowcase from '@/components/layout/AuthShowcase';
import Logo from '@/components/ui/Logo';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'WAREHOUSE_STAFF'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.register(formData);
      if (response.success) {
        toast.success(response.message || 'Account created. An administrator must approve it before you can sign in.', { duration: 6000 });
        navigate('/login');
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Registration failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AuthShowcase
        title="Run a smarter warehouse, starting today."
        subtitle="Create your account. An administrator approves new accounts before the first sign-in."
      />

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <Link to="/" className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </Link>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1.5">Create Account</h2>
              <p className="text-gray-600">Join WareTrack-Pro and start managing your warehouse</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                  placeholder="Enter your full name"
                />
              </div>

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
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors bg-white"
                >
                  <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
                  <option value="DISPATCH_OFFICER">Dispatch Officer</option>
                  <option value="DRIVER">Driver</option>
                </select>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  pattern="(?=.*[A-Za-z])(?=.*\d).{8,}"
                  title="At least 8 characters, including letters and numbers"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                  placeholder="Create a secure password"
                />
                <p className="mt-1.5 text-xs text-gray-500">At least 8 characters, including letters and numbers. An administrator approves new accounts.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent-600 hover:bg-accent-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-accent-600 hover:text-accent-700 font-semibold transition-colors"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-3">
              <Package className="w-6 h-6 text-accent-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Inventory</p>
            </div>
            <div className="p-3">
              <Truck className="w-6 h-6 text-accent-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Delivery</p>
            </div>
            <div className="p-3">
              <Users className="w-6 h-6 text-accent-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Team</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}