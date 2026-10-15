interface SkeletonProps {
  className?: string;
}

/** Shimmering placeholder block shown while data loads. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-gray-100 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${count >= 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-3'}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-16" />
            </div>
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="mt-4 h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 260 }: { height?: number }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      </div>
      <div className="flex items-end gap-3" style={{ height }}>
        {[45, 70, 55, 85, 60, 90, 75, 50].map((h, i) => (
          <div key={i} className="flex h-full flex-1 items-end">
            <div className="w-full" style={{ height: `${h}%` }}>
              <Skeleton className="h-full w-full rounded-b-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft">
      <div className="flex gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-gray-50 px-5 py-4 last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={`h-3 flex-1 ${c === 0 ? 'max-w-[40%]' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Full dashboard placeholder: header, stat cards and two rows of charts. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-3 w-72" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <SkeletonStatCards />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <SkeletonStatCards count={3} />
      <SkeletonTable />
    </div>
  );
}
