import { Link } from 'react-router-dom';
import { Package, Truck, BarChart3, MapPin, CheckCircle, ArrowRight, Users, Zap, Clock, Bell, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function About() {
  const features = [
    {
      icon: Users,
      title: 'User Management',
      description: 'Complete role-based access control with Admin, Warehouse Staff, Dispatch Officer, and Driver roles. Manage permissions and track user activities.',
    },
    {
      icon: Package,
      title: 'Inventory Management',
      description: 'Real-time stock tracking, low-stock alerts, barcode support, and category management. Never run out of critical items again.',
    },
    {
      icon: Truck,
      title: 'Order & Dispatch Management',
      description: 'Create delivery orders, assign drivers, schedule dispatches, and track progress from warehouse to customer doorstep.',
    },
    {
      icon: MapPin,
      title: 'Real-Time Tracking',
      description: 'Monitor delivery status in real-time with automatic updates. Track orders through Pending → Dispatched → In Transit → Delivered.',
    },
    {
      icon: CheckCircle,
      title: 'Delivery Confirmation',
      description: 'Digital signature capture, photo proof of delivery, and delivery codes for secure and verified deliveries.',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Comprehensive reporting with PDF/Excel export. Track performance, inventory levels, and delivery metrics.',
    },
    {
      icon: Bell,
      title: 'Notifications & Alerts',
      description: 'Real-time notifications for status changes, low stock alerts, and dispatch reminders to keep your team informed.',
    },
    {
      icon: FileText,
      title: 'Audit Trail',
      description: 'Complete activity logging for accountability. Track who did what and when for full transparency.',
    },
  ];

  const benefits = [
    'Reduce delivery times by up to 40%',
    'Real-time inventory visibility across all locations',
    'Automated dispatch scheduling and optimization',
    'Digital proof of delivery with signatures',
    'Complete audit trail for accountability',
    'Mobile-friendly interface for field operations',
    'Export reports to PDF and Excel formats',
    'Role-based security and access control',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-xl text-gray-900">WareTrack</h1>
                <p className="text-xs text-gray-500">Pro</p>
              </div>
            </Link>
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
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Complete Logistics Solution
          </div>
          <h1 className="font-heading text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            About WareTrack Pro
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-4xl mx-auto">
            WareTrack Pro is a comprehensive warehouse delivery and dispatch tracking system designed for modern businesses. 
            Built with cutting-edge technology, it streamlines your entire logistics operation from inventory management to final delivery.
          </p>
        </div>
      </section>

      {/* What We Solve */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-heading text-4xl font-bold text-gray-900 mb-6">
              Solving Real Logistics Challenges
            </h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Manual Tracking Issues</h3>
                  <p className="text-gray-600">Eliminate paper-based tracking and reduce human errors with automated digital workflows.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Inventory Visibility</h3>
                  <p className="text-gray-600">Get real-time visibility into stock levels across all locations with automated alerts.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Delivery Coordination</h3>
                  <p className="text-gray-600">Streamline dispatch operations with intelligent routing and driver assignment.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
            <h3 className="font-heading text-2xl font-bold text-gray-900 mb-6">System Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                <span className="font-medium text-gray-900">Total Features</span>
                <span className="text-2xl font-bold text-primary-600">11+</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-accent-50 rounded-lg">
                <span className="font-medium text-gray-900">User Roles</span>
                <span className="text-2xl font-bold text-accent-600">4</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-success-50 rounded-lg">
                <span className="font-medium text-gray-900">Export Formats</span>
                <span className="text-2xl font-bold text-success-600">3</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-warning-50 rounded-lg">
                <span className="font-medium text-gray-900">Real-time Updates</span>
                <span className="text-2xl font-bold text-warning-600">✓</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl font-bold text-gray-900 mb-4">
            Complete Feature Set
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Every feature you need to manage your warehouse and delivery operations efficiently.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg hover:border-primary-200 transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl font-bold mb-6">
              Why Businesses Choose WareTrack Pro
            </h2>
            <p className="text-xl text-primary-100 max-w-3xl mx-auto">
              Proven results that help businesses optimize their logistics operations and improve customer satisfaction.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <CheckCircle className="w-6 h-6 text-accent-400 flex-shrink-0 mt-0.5" />
                <span className="text-primary-50">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-br from-primary-500 to-accent-500 rounded-3xl p-12 text-center text-white">
          <h2 className="font-heading text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-50 mb-8 max-w-2xl mx-auto">
            Join hundreds of businesses that trust WareTrack Pro for their logistics operations. 
            Start using our comprehensive system today - completely free of charge.
          </p>
          <Link to="/register">
            <Button variant="secondary" size="lg" className="bg-white text-primary-700 hover:bg-gray-100">
              Create Your Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading font-bold text-gray-900">WareTrack Pro</span>
            </Link>
            <p className="text-sm text-gray-600">
              © 2025 WareTrack Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}