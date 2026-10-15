import { Link } from 'react-router-dom';
import { TrendingUp, PackageCheck, Truck, ShieldCheck, MapPin } from 'lucide-react';
import { LogoMark } from '../ui/Logo';

interface AuthShowcaseProps {
  title: string;
  subtitle: string;
}

const bars = [42, 58, 50, 72, 64, 88, 76];

/** Left-hand brand panel for the sign-in and sign-up pages, with a product preview. */
export default function AuthShowcase({ title, subtitle }: AuthShowcaseProps) {
  return (
    <div className="relative hidden overflow-hidden bg-[linear-gradient(140deg,#172B3C_0%,#23415A_40%,#2F5778_75%,#3A6D96_100%)] p-10 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between xl:p-12">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#FF8C42]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-[#4682B4]/40 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      <Link to="/" className="relative flex items-center gap-3">
        <LogoMark className="h-10 w-10" />
        <div className="leading-tight">
          <p className="text-lg font-bold">WareTrack</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#FFB27D]">Pro</p>
        </div>
      </Link>

      <div className="relative">
        <h2 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">{title}</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">{subtitle}</p>

        {/* Product preview */}
        <div className="relative mt-8 max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">Deliveries this week</p>
                <p className="mt-1 text-3xl font-bold">411</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/20 px-2 py-0.5 text-xs font-semibold text-[#A7F3D0]">
                <TrendingUp className="h-3.5 w-3.5" /> +15%
              </span>
            </div>
            <div className="mt-4 flex h-24 items-end gap-2">
              {bars.map((h, i) => (
                <div key={i} className="flex h-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-md ${i === 5 ? 'bg-gradient-to-t from-[#FF8C42] to-[#FFC08F]' : 'bg-gradient-to-t from-[#4682B4] to-[#82ACCE]'}`}
                    style={{ height: `${h}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              {[
                { icon: PackageCheck, label: 'Delivered', value: '96%' },
                { icon: Truck, label: 'On the road', value: '23' },
                { icon: MapPin, label: 'Areas', value: '18' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-white/[0.06] p-2.5">
                  <Icon className="h-4 w-4 text-[#FFB27D]" />
                  <p className="mt-1.5 font-bold">{value}</p>
                  <p className="text-[10px] text-white/60">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -right-6 -top-5 flex animate-float items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-gray-900 shadow-lift">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#059669]">
              <PackageCheck className="h-4 w-4" />
            </span>
            <span className="text-xs">
              <span className="block text-[10px] text-gray-500">Just delivered</span>
              <b>ORD-001327</b>
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-2 text-xs text-white/60">
        <ShieldCheck className="h-4 w-4 text-[#FFB27D]" />
        Two-step sign-in, role-based access and encrypted connections.
      </div>
    </div>
  );
}
