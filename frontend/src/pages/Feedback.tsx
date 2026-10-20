import { useCallback, useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, MessageSquare, RefreshCw } from 'lucide-react';
import api from '@/services/api';

type Report = { id: number; category: string; message: string; status: string; kind: string; order?: { id: number; orderNumber: string; customerName: string } | null; submitter?: { name: string } | null; assignee?: { id: number; name: string } | null; resolution?: string | null; createdAt: string };
const categories = ['DELAY', 'DAMAGED_GOODS', 'CUSTOMER_COMPLAINT', 'DRIVER_SAFETY', 'APP_ISSUE', 'STOCK', 'OTHER'];
const humanize = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());

export default function Feedback() {
  const [reports, setReports] = useState<Report[]>([]);
  const [queue, setQueue] = useState<Report[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [category, setCategory] = useState(categories[0]);
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const mine = await api.get('/feedback/mine');
      setReports(mine.data?.data || []);
      try { const all = await api.get('/feedback'); setQueue(all.data?.data || []); setCanReview(true); }
      catch { setCanReview(false); }
    } catch { toast.error('Could not load feedback reports'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.post('/feedback', { category, message, ...(orderId ? { orderId: Number(orderId) } : {}) });
      setMessage(''); setOrderId(''); toast.success('Report submitted'); void refresh();
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Could not submit report'); }
  };

  const updateStatus = async (report: Report, status: string) => {
    try { await api.patch(`/feedback/${report.id}`, { status }); toast.success('Report updated'); void refresh(); }
    catch { toast.error('Could not update report'); }
  };

  const card = (report: Report, review = false) => <article key={report.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-semibold">{humanize(report.category)} <span className="ml-2 text-xs font-normal text-slate-500">#{report.id}</span></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-700">{humanize(report.status)}</span></div>
    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{report.message}</p>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>{new Date(report.createdAt).toLocaleString()}</span>{report.submitter && <span>By {report.submitter.name}</span>}{report.order && <span>Order {report.order.orderNumber} · {report.order.customerName}</span>}{report.assignee && <span>Assigned to {report.assignee.name}</span>}</div>
    {report.resolution && <p className="mt-2 border-l-2 border-emerald-500 pl-3 text-sm">{report.resolution}</p>}
    {review && report.status !== 'RESOLVED' && report.status !== 'DISMISSED' && <div className="mt-3 flex gap-2"><button onClick={() => void updateStatus(report, 'IN_REVIEW')} className="rounded-lg border px-3 py-1.5 text-sm">Mark in review</button><button onClick={() => void updateStatus(report, 'RESOLVED')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white">Resolve</button></div>}
  </article>;

  return <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <header><h1 className="text-2xl font-bold">Feedback & issue reports</h1><p className="mt-1 text-sm text-slate-500">Report delivery, customer, stock, safety, or app issues and follow their resolution.</p></header>
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 className="flex items-center gap-2 font-semibold"><MessageSquare size={18}/> Submit a report</h2>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Category<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full rounded-lg border p-2.5 dark:bg-slate-900">{categories.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label><label className="text-sm">Order ID (optional)<input type="number" min="1" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Link report to an order" className="mt-1 block w-full rounded-lg border p-2.5 dark:bg-slate-900"/></label></div>
      <label className="block text-sm">Details<textarea required minLength={10} maxLength={4000} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe what happened and any follow-up needed…" className="mt-1 block w-full rounded-lg border p-2.5 dark:bg-slate-900"/></label>
      <button disabled={message.trim().length < 10} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50">Submit report</button>
    </form>
    {canReview && <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle size={19}/> Supervisor review queue</h2><button onClick={() => void refresh()} className="rounded-lg border p-2" aria-label="Refresh reports"><RefreshCw size={16}/></button></div>{queue.length ? queue.map((report) => card(report, true)) : <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">No reports in this branch.</p>}</section>}
    <section className="space-y-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><CheckCircle2 size={19}/> My reports</h2>{loading ? <p className="text-sm text-slate-500">Loading reports…</p> : reports.length ? reports.map((report) => card(report)) : <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">You have not submitted any reports.</p>}</section>
  </div>;
}
