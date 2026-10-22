import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Mail } from 'lucide-react';
import Button from '@/components/ui/Button';
import { reportsService, type SummaryPeriod } from '@/services/reportsService';

const PERIODS: [SummaryPeriod, string, string][] = [
  ['day', 'Yesterday', 'The last full day'],
  ['week', 'Last week', 'Monday to Sunday'],
  ['month', 'Last month', 'The last calendar month'],
];

/** Download or email the one-page manager summary PDF. */
export default function SummaryReportForm({ onClose }: { onClose: () => void }) {
  const [period, setPeriod] = useState<SummaryPeriod>('day');
  const [busy, setBusy] = useState<'download' | 'email' | null>(null);

  const run = async (kind: 'download' | 'email') => {
    setBusy(kind);
    try {
      if (kind === 'download') {
        await reportsService.downloadSummary(period);
      } else {
        const result = await reportsService.emailSummary(period);
        toast.success(result.message);
        onClose();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not get the summary');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Orders, on-time rate, money collected, expenses, best sellers and low stock for this branch on one page.
        Admins receive the weekly summary by email every Monday; change how often you get it under Settings → Reports.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {PERIODS.map(([key, label, hint]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={`rounded-xl border p-3 text-left transition ${period === key ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <div className="text-sm font-semibold text-gray-900">{label}</div>
            <div className="text-xs text-gray-500">{hint}</div>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => run('email')} disabled={!!busy}>
          <Mail className="mr-1.5 h-4 w-4" /> {busy === 'email' ? 'Sending…' : 'Email it to me'}
        </Button>
        <Button onClick={() => run('download')} disabled={!!busy}>
          <Download className="mr-1.5 h-4 w-4" /> {busy === 'download' ? 'Preparing…' : 'Download PDF'}
        </Button>
      </div>
    </div>
  );
}
