import { useState } from 'react';
import { BookOpen, Download, FileSpreadsheet, Receipt, Wallet, Building2, Scale, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import api from '@/services/api';

const iso = (d: Date) => d.toISOString().slice(0, 10);

const EXPORTS = [
  { type: 'sales', title: 'Sales (VAT)', icon: Receipt, text: 'Every delivered order with net, VAT 18% and total, what was paid and what is still owed. For the VAT return.' },
  { type: 'payments', title: 'Payments received', icon: Wallet, text: 'Every payment: cash, MoMo, Airtel, bank, with the order and reference.' },
  { type: 'expenses', title: 'Expenses', icon: FileSpreadsheet, text: 'Fuel, tolls, repairs and other costs with vehicle and driver.' },
  { type: 'receivables', title: 'Who owes what (aging)', icon: Building2, text: 'Balance per customer split into not due, 1–30, 31–60, 61–90 and 90+ days. Ignores the dates (it is today’s position).' },
  { type: 'quickbooks', title: 'QuickBooks invoices', icon: BookOpen, text: 'Ready for QuickBooks Online → Import invoices (one line per item, VAT 18%).' },
  { type: 'journal', title: 'Journal entries (Odoo / ledger)', icon: Scale, text: 'Double-entry lines: sales, VAT, receipts and expenses. Import into Odoo or any accounting system.' },
];

/** Download CSV files for the accountant, QuickBooks or Odoo. */
export default function Accounting() {
  const [range, setRange] = useState(() => {
    const now = new Date();
    return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
  });
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (type: string) => {
    setBusy(type);
    try {
      const res = await api.get('/accounting/export', { params: { type, ...range }, responseType: 'blob' });
      if (res.status >= 400) {
        const message = await (res.data as Blob).text().then((t) => JSON.parse(t)?.error?.message).catch(() => null);
        throw new Error(message || 'Export failed');
      }
      const name = /filename="([^"]+)"/.exec(res.headers['content-disposition'] || '')?.[1] || `waretrack-${type}.csv`;
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Downloaded ${name}`);
    } catch (error: any) {
      toast.error(error.message || 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  const setMonth = (offset: number) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = offset === 0 ? now : new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    setRange({ from: iso(start), to: iso(end) });
  };

  return (
    <div>
      <PageHeader title="Accounting export" subtitle="CSV files for your accountant, QuickBooks or Odoo" breadcrumbs={[{ label: 'Money' }]} icon={<BookOpen className="h-5 w-5" />} />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-white p-3 text-sm shadow-soft">
        <span className="font-medium text-gray-700">Period</span>
        <input type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} className="h-9 rounded-lg border border-gray-200 px-2.5" />
        <span className="text-gray-400">to</span>
        <input type="date" value={range.to} min={range.from} max={iso(new Date())} onChange={(e) => setRange({ ...range, to: e.target.value })} className="h-9 rounded-lg border border-gray-200 px-2.5" />
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <button onClick={() => setMonth(0)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50">This month</button>
        <button onClick={() => setMonth(-1)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50">Last month</button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {EXPORTS.map((x) => (
          <div key={x.type} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><x.icon className="h-5 w-5" /></span>
            <h3 className="font-semibold text-gray-900">{x.title}</h3>
            <p className="mt-1 flex-1 text-sm text-gray-500">{x.text}</p>
            <button
              onClick={() => download(x.type)}
              disabled={busy !== null}
              className="mt-4 inline-flex h-9 w-fit items-center gap-1.5 rounded-xl bg-primary-500 px-3.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
            >
              {busy === x.type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download CSV
            </button>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs text-gray-500">Prices are treated as VAT-inclusive (VAT 18%). These files don't replace RRA EBM receipts.</p>
    </div>
  );
}
