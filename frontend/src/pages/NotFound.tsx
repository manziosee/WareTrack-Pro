import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { LostIllustration } from '@/components/ui/Illustrations';
import { LogoMark } from '@/components/ui/Logo';

/** Friendly 404 page. */
export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <LogoMark className="h-9 w-9" />
        <span className="font-bold text-gray-900">WareTrack Pro</span>
      </Link>
      <LostIllustration className="h-48 w-48" />
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-accent-500">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">This delivery took a wrong turn</h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        The page you're looking for doesn't exist or has moved. Check the address, or head back to safety.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" /> Go back
        </button>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-primary-500 to-primary-600 px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:-translate-y-0.5"
        >
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </Link>
      </div>
    </div>
  );
}
