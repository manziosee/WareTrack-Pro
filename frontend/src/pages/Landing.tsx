import { Link } from 'react-router-dom';
import { Package, Truck, BarChart3, MapPin, CheckCircle, ArrowRight, Users, Shield, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function Landing() {
  const features = [
    {
      icon: Package,
      title: 'Inventory Management',
      description: 'Track stock levels, manage categories, and get low-stock alerts in real-time.',
    },
    {
      icon: Truck,
      title: 'Smart Dispatch',
      description: 'Optimize delivery routes and assign drivers efficiently with our intelligent system.',
    },
    {
      icon: MapPin,
      title: 'Real-Time Tracking',
      description: 'Monitor deliveries from dispatch to doorstep with live status updates.',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Gain insights with comprehensive reports and performance metrics.',
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Manage users, roles, and permissions across your organization.',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with role-based access control.',
    },
  ];

  const benefits = [
    'Reduce delivery times by up to 40%',
    'Real-time inventory visibility',
    'Automated dispatch scheduling',
    'Comprehensive audit trails',
    'Mobile-friendly interface',
    'Export reports to PDF/Excel',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-xl text-gray-900">WareTrack</h1>
                <p className="text-xs text-gray-500">Pro</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Streamline Your Logistics
            </div>
            <h1 className="font-heading text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Warehouse Delivery & Dispatch
              <span className="block text-primary-600 mt-2">Made Simple</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Complete solution for managing inventory, tracking deliveries, and optimizing your logistics operations. 
              Built for modern warehouses and distribution centers.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register">
                <Button variant="primary" size="lg" className="shadow-lg shadow-primary-500/30">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="secondary" size="lg">
                  Learn More
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success-500" />
                Free of charge
              </div>
            </div>
          </div>
          
          {/* Hero Image/Illustration */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-accent-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Inventory</p>
                      <p className="text-2xl font-bold text-gray-900">1,547</p>
                    </div>
                  </div>
                  <div className="text-success-600 text-sm font-medium">+12%</div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-accent-50 to-warning-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-accent-500 rounded-lg flex items-center justify-center">
                      <Truck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active Deliveries</p>
                      <p className="text-2xl font-bold text-gray-900">23</p>
                    </div>
                  </div>
                  <div className="text-success-600 text-sm font-medium">+8%</div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-success-50 to-primary-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-success-500 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Completed Today</p>
                      <p className="text-2xl font-bold text-gray-900">47</p>
                    </div>
                  </div>
                  <div className="text-success-600 text-sm font-medium">+15%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Manage Logistics
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful features designed to streamline your warehouse operations and delivery management.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-xl border border-gray-200 hover:shadow-lg hover:border-primary-200 transition-all group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-heading text-4xl font-bold mb-6">
                Why Choose WareTrack Pro?
              </h2>
              <p className="text-xl text-primary-100 mb-8">
                Join hundreds of businesses that trust WareTrack Pro to manage their logistics operations efficiently.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-accent-400 flex-shrink-0 mt-0.5" />
                    <span className="text-primary-50">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="space-y-6">
                <div>
                  <p className="text-6xl font-bold mb-2">94%</p>
                  <p className="text-primary-100">Customer Satisfaction Rate</p>
                </div>
                <div className="h-px bg-white/20"></div>
                <div>
                  <p className="text-6xl font-bold mb-2">40%</p>
                  <p className="text-primary-100">Faster Delivery Times</p>
                </div>
                <div className="h-px bg-white/20"></div>
                <div>
                  <p className="text-6xl font-bold mb-2">500+</p>
                  <p className="text-primary-100">Active Businesses</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-br from-primary-500 to-accent-500 rounded-3xl p-12 text-center text-white">
          <h2 className="font-heading text-4xl font-bold mb-4">
            Ready to Transform Your Logistics?
          </h2>
          <p className="text-xl text-primary-50 mb-8 max-w-2xl mx-auto">
            Free to use it.
          </p>
          <Link to="/register">
            <Button variant="secondary" size="lg" className="bg-white text-primary-700 hover:bg-gray-100">
              Get Started Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading font-bold text-gray-900">WareTrack Pro</span>
            </div>
            <p className="text-sm text-gray-600">
              © 2025 WareTrack Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}