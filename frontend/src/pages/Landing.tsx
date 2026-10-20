import { Link } from 'react-router-dom';
import {
  Package, Truck, BarChart3, MapPin, CheckCircle, ArrowRight, Users, Shield, Zap,
  ClipboardList, Send, PackageCheck, Warehouse, UserCog, Navigation, TrendingUp,
} from 'lucide-react';
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

  const steps = [
    { icon: ClipboardList, title: 'Create the order', description: 'Capture customer details and pick items straight from live inventory.' },
    { icon: Send, title: 'Dispatch it', description: 'Assign the right driver and vehicle, and schedule the delivery.' },
    { icon: PackageCheck, title: 'Track to the door', description: 'Follow every stage until the order is marked delivered.' },
  ];

  const roles = [
    { icon: UserCog, title: 'Admins', description: 'Full visibility across users, reports and system settings.' },
    { icon: Warehouse, title: 'Warehouse Staff', description: 'Keep stock accurate and process orders quickly.' },
    { icon: Send, title: 'Dispatch Officers', description: 'Coordinate drivers, vehicles and delivery schedules.' },
    { icon: Navigation, title: 'Drivers', description: 'See assigned deliveries and update status on the go.' },
  ];

  // Mini bar chart for the hero preview card
  const previewBars = [38, 52, 44, 68, 57, 80, 72];

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-glow">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-xl font-bold tracking-tight">WareTrack</p>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent-500">Pro</p>
              </div>
            </Link>
            <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
              <a href="#features" className="transition-colors hover:text-primary-600">Features</a>
              <a href="#how-it-works" className="transition-colors hover:text-primary-600">How it works</a>
              <a href="#roles" className="transition-colors hover:text-primary-600">Roles</a>
              <Link to="/about" className="transition-colors hover:text-primary-600">About</Link>
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/portal" className="hidden sm:block">
                <Button variant="ghost">Customer Portal</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/register" className="hidden sm:block">
                <Button variant="primary">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-primary-200/50 blur-3xl" />
          <div className="absolute -right-24 top-24 h-[24rem] w-[24rem] rounded-full bg-accent-200/50 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: 'linear-gradient(#E0EAF3 1px, transparent 1px), linear-gradient(90deg, #E0EAF3 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            }}
          />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white/80 px-4 py-2 text-sm font-medium text-primary-700 shadow-soft">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-500">
                <Zap className="h-3 w-3 text-white" />
              </span>
              Streamline Your Logistics
            </div>
            <h1 className="mb-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Warehouse Delivery &amp; Dispatch
              <span className="mt-2 block bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-gray-600 sm:text-xl">
              Complete solution for managing inventory, tracking deliveries, and optimizing your logistics operations.
              Built for modern warehouses and distribution centers.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register">
                <Button variant="primary" size="lg">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="secondary" size="lg">
                  Learn More
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-600">
              {['Free of charge', 'Role-based access', 'Real-time updates'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Hero dashboard preview */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-primary-500/20 to-accent-500/20 blur-2xl" />

            <div className="relative rounded-3xl border border-gray-100 bg-white p-6 shadow-lift">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Deliveries this week</p>
                  <p className="text-3xl font-bold">411</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +15%
                </span>
              </div>
              <div className="flex h-36 items-end gap-2.5">
                {previewBars.map((height, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col items-center gap-2">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={`w-full rounded-t-lg ${i === previewBars.length - 2 ? 'bg-gradient-to-t from-accent-500 to-accent-300' : 'bg-gradient-to-t from-primary-500 to-primary-300'}`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-gray-400">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { label: 'Inventory', value: '1,547', icon: Package, tone: 'bg-primary-500' },
                  { label: 'Active', value: '23', icon: Truck, tone: 'bg-accent-500' },
                  { label: 'Done today', value: '47', icon: CheckCircle, tone: 'bg-success-500' },
                ].map(({ label, value, icon: Icon, tone }) => (
                  <div key={label} className="rounded-2xl bg-gray-50 p-3">
                    <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-lg font-bold">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating cards */}
            <div className="absolute -right-6 -top-9 hidden animate-float items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-lift sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-50">
                <PackageCheck className="h-5 w-5 text-success-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Order delivered</p>
                <p className="text-sm font-semibold">ORD-000123</p>
              </div>
            </div>
            <div
              className="absolute -bottom-11 -left-8 hidden animate-float items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-lift sm:flex"
              style={{ animationDelay: '1.5s' }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50">
                <MapPin className="h-5 w-5 text-accent-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Driver en route</p>
                <p className="text-sm font-semibold">ETA 12 min</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="scroll-mt-24 bg-gray-50/70 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent-500">Features</p>
            <h2 className="mb-4 text-4xl font-bold tracking-tight">Everything You Need to Manage Logistics</h2>
            <p className="text-lg text-gray-600">
              Powerful features designed to streamline your warehouse operations and delivery management.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift"
              >
                <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-primary-500 to-accent-500 transition-transform duration-500 group-hover:scale-x-100" />
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-primary-500 group-hover:to-accent-500 group-hover:text-white group-hover:shadow-glow">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">{feature.title}</h3>
                <p className="leading-relaxed text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent-500">How it works</p>
            <h2 className="text-4xl font-bold tracking-tight">From order to doorstep in three steps</h2>
          </div>
          <div className="relative grid gap-8 md:grid-cols-3">
            <div className="absolute left-[16.6%] right-[16.6%] top-8 hidden h-0.5 bg-gradient-to-r from-primary-200 via-accent-300 to-primary-200 md:block" />
            {steps.map((step, i) => (
              <div key={step.title} className="relative text-center">
                <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lift ring-1 ring-gray-100">
                  <step.icon className="h-7 w-7 text-primary-600" />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="mx-auto max-w-xs text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-20 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-accent-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-primary-300/30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-4xl font-bold tracking-tight">Why Choose WareTrack Pro?</h2>
              <p className="mb-8 text-xl text-primary-100">
                Join hundreds of businesses that trust WareTrack Pro to manage their logistics operations efficiently.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-400" />
                    <span className="text-primary-50">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { value: '94%', label: 'Customer Satisfaction Rate' },
                { value: '40%', label: 'Faster Delivery Times' },
                { value: '500+', label: 'Active Businesses' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
                  <p className="mb-1 text-5xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-primary-100">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent-500">Built for every role</p>
            <h2 className="text-4xl font-bold tracking-tight">One workspace, a dashboard for each team</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <div key={role.title} className="rounded-3xl border border-gray-100 bg-gradient-to-b from-white to-gray-50 p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
                  <role.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{role.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{role.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 p-10 text-center text-white shadow-lift sm:p-14">
          <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 -right-10 h-64 w-64 rounded-full bg-white/10" />
          <h2 className="relative mb-4 text-4xl font-bold tracking-tight">Ready to Transform Your Logistics?</h2>
          <p className="relative mx-auto mb-8 max-w-2xl text-xl text-primary-50">Free to use it.</p>
          <Link to="/register" className="relative inline-block">
            <button className="inline-flex items-center rounded-xl bg-white px-6 py-3 text-lg font-semibold text-primary-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97]">
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50/70">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500">
                <Package className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold">WareTrack Pro</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <a href="#features" className="hover:text-primary-600">Features</a>
              <a href="#how-it-works" className="hover:text-primary-600">How it works</a>
              <Link to="/about" className="hover:text-primary-600">About</Link>
              <Link to="/login" className="hover:text-primary-600">Sign In</Link>
            </nav>
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} WareTrack Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
