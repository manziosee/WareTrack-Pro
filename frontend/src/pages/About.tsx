import { useNavigate } from 'react-router-dom';
import { Package, Truck, Users, BarChart3, Shield, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function About() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Package,
      title: 'Inventory Management',
      description: 'Real-time stock tracking with automated low-stock alerts and barcode support for efficient warehouse operations.'
    },
    {
      icon: Truck,
      title: 'Delivery Tracking',
      description: 'Complete order lifecycle management from creation to delivery with real-time status updates and proof of delivery.'
    },
    {
      icon: Users,
      title: 'Multi-Role Access',
      description: 'Role-based permissions for Admin, Warehouse Staff, Dispatch Officers, and Drivers with secure authentication.'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Comprehensive reporting and performance analytics to optimize your warehouse and delivery operations.'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Built with modern security practices, complete audit trails, and reliable data protection.'
    },
    {
      icon: Clock,
      title: 'Real-Time Updates',
      description: 'Live notifications and status updates keep your team informed and operations running smoothly.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="font-heading text-2xl font-bold text-gray-900">WareTrack Pro</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/')}>
                Home
              </Button>
              <Button variant="secondary" onClick={() => navigate('/login')}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary-50 to-accent-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-heading text-5xl font-bold text-gray-900 mb-6">
            About WareTrack Pro
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            A comprehensive warehouse delivery and dispatch tracking system designed to streamline your operations, 
            improve efficiency, and provide complete visibility into your supply chain.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Warehouses
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage inventory, track deliveries, and optimize your warehouse operations in one integrated platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-3 transition-all duration-300 group">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System Overview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-heading text-3xl font-bold text-gray-900 mb-6">
                Built for Scale and Efficiency
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Modern Technology Stack</h3>
                  <p className="text-gray-600">
                    Built with React, TypeScript, and Node.js for reliability and performance. 
                    Responsive design ensures seamless operation across all devices.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Workflow Management</h3>
                  <p className="text-gray-600">
                    From inventory receipt to final delivery, track every step of your operations 
                    with automated workflows and real-time notifications.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Data-Driven Insights</h3>
                  <p className="text-gray-600">
                    Make informed decisions with comprehensive analytics, performance metrics, 
                    and customizable reports that help optimize your operations.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary-50 to-accent-50 p-8 rounded-2xl hover:scale-105 transition-transform duration-300">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center hover:scale-110 transition-transform duration-200">
                  <div className="text-3xl font-bold text-primary-600 mb-2">99.9%</div>
                  <div className="text-sm text-gray-600">Uptime</div>
                </div>
                <div className="text-center hover:scale-110 transition-transform duration-200">
                  <div className="text-3xl font-bold text-primary-600 mb-2">24/7</div>
                  <div className="text-sm text-gray-600">Monitoring</div>
                </div>
                <div className="text-center hover:scale-110 transition-transform duration-200">
                  <div className="text-3xl font-bold text-primary-600 mb-2">Real-time</div>
                  <div className="text-sm text-gray-600">Updates</div>
                </div>
                <div className="text-center hover:scale-110 transition-transform duration-200">
                  <div className="text-3xl font-bold text-primary-600 mb-2">Secure</div>
                  <div className="text-sm text-gray-600">Data</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-500 to-accent-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl font-bold text-white mb-6">
            Ready to Transform Your Warehouse Operations?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of businesses already using WareTrack Pro to streamline their operations. 
            Get started today - it's completely free of charge!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="secondary" 
              size="lg" 
              onClick={() => navigate('/register')}
              className="bg-white text-primary-600 hover:bg-gray-50"
            >
              Get Started Free
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate('/login')}
              className="border-white text-white hover:bg-white hover:text-primary-600"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading text-xl font-bold">WareTrack Pro</span>
          </div>
          <p className="text-gray-400">
            © 2024 WareTrack Pro. Built with ❤️ for modern warehouses.
          </p>
        </div>
      </footer>
    </div>
  );
}