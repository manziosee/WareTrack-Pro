import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Mail, Lock, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';

import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(formData.email, formData.password);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-7 h-7 text-primary-600" />
            </div>
            <div className="text-left">
              <h1 className="font-heading font-bold text-2xl text-white">WareTrack</h1>
              <p className="text-xs text-primary-200">Pro</p>
            </div>
          </div>
          <h2 className="font-heading text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-primary-200">Sign in to your account to continue</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Forgot password?
              </a>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full">
              Sign In
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign up for free
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 bg-primary-800/50 backdrop-blur-sm rounded-lg p-4 border border-primary-600/30">
          <p className="text-xs text-primary-200 text-center mb-3">Demo Credentials</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/10 rounded px-2 py-2">
              <p className="text-primary-300 mb-1">Admin</p>
              <p className="text-white font-mono text-[10px]">admin@waretrack.com</p>
            </div>
            <div className="bg-white/10 rounded px-2 py-2">
              <p className="text-primary-300 mb-1">Warehouse</p>
              <p className="text-white font-mono text-[10px]">warehouse@waretrack.com</p>
            </div>
            <div className="bg-white/10 rounded px-2 py-2">
              <p className="text-primary-300 mb-1">Dispatch</p>
              <p className="text-white font-mono text-[10px]">dispatch@waretrack.com</p>
            </div>
            <div className="bg-white/10 rounded px-2 py-2">
              <p className="text-primary-300 mb-1">Driver</p>
              <p className="text-white font-mono text-[10px]">driver@waretrack.com</p>
            </div>
          </div>
          <p className="text-[10px] text-primary-300 text-center mt-2">Password: demo123 (for all)</p>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-primary-200 hover:text-white transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}