import { useEffect, useRef, useState } from 'react';
import { FileText, Printer, Smartphone, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

/** Calls the portal API as the signed-in customer. */
export type PortalRequest = (method: 'get' | 'post', path: string, data?: unknown) => Promise<{ data: any }>;

const rwf = (v: number | string) => `${Math.round(Number(v) || 0).toLocaleString()} RWF`;
const day = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const errorOf = (e: any, fallback: string) => e?.response?.data?.error?.message || fallback;

/** Print just the given element in a clean window. */
function printElement(el: HTMLElement | null, title: string) {
  if (!el) return;
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#1F2937;margin:32px;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:6px 4px;border-bottom:1px solid #EEF1F5;text-align:left}
    th{color:#6B7280;font-size:11px;text-transform:uppercase}.r{text-align:right}h2{margin:0 0 4px}p{margin:2px 0}.muted{color:#6B7280}
    .tot td{font-weight:bold;border-bottom:none}button{display:none}
  </style></head><body>${el.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export function InvoiceDialog({ orderId, request, onClose }: { orderId: number | null; request: PortalRequest; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!orderId) return;
    setData(null);
    setError('');
    request('get', `/features/customer/orders/${orderId}/invoice`).then((r) => setData(r.data.data)).catch((e) => setError(errorOf(e, 'Could not load the invoice')));
  }, [orderId, request]);

  return (
    <Modal isOpen={orderId !== null} onClose={onClose} title="Invoice" icon={<FileText className="h-5 w-5" />} size="lg">
      {error ? <p className="text-sm text-error-700">{error}</p> : !data ? <p className="text-sm text-gray-500">Loading…</p> : (
        <>
          <div ref={ref} className="text-sm">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">{data.company.name}</h2>
                {data.company.taxNumber && <p className="muted text-gray-500">TIN {data.company.taxNumber}</p>}
                {data.company.address && <p className="muted text-gray-500">{data.company.address}</p>}
              </div>
              <div className="text-right">
                <p className="font-semibold">Invoice {data.invoice.invoiceNumber}</p>
                <p className="muted text-gray-500">Order {data.order.orderNumber}</p>
                <p className="muted text-gray-500">Date {day(data.order.deliveredAt || data.order.createdAt)}</p>
                {data.invoice.dueDate && <p className="muted text-gray-500">Due {day(data.invoice.dueDate)}</p>}
              </div>
            </div>
            <p className="mt-4"><span className="text-gray-500">Bill to:</span> {data.order.customerName} · {data.order.deliveryAddress}</p>
            <table className="mt-3 w-full">
              <thead className="text-xs text-gray-500"><tr><th className="py-1 text-left">Item</th><th className="r py-1 text-right">Qty</th><th className="r py-1 text-right">Price</th><th className="r py-1 text-right">VAT</th><th className="r py-1 text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.order.items.map((i: any, n: number) => (
                  <tr key={n}>
                    <td className="py-1.5">{i.name}{i.discount > 0 && <span className="block text-xs text-success-700">saved {rwf(i.discount * i.quantity)}</span>}</td>
                    <td className="r py-1.5 text-right">{i.quantity} {i.unit}</td>
                    <td className="r py-1.5 text-right">{rwf(i.unitPrice)}</td>
                    <td className="r py-1.5 text-right">{i.vatExempt ? 'Exempt' : `${Math.round(i.vatRate * 100)}%`}</td>
                    <td className="r py-1.5 text-right">{rwf(i.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tbody>
                <tr><td colSpan={4} className="r pt-3 text-right text-gray-500">Before {data.taxLabel}</td><td className="r pt-3 text-right">{rwf(data.invoice.subtotal)}</td></tr>
                <tr><td colSpan={4} className="r text-right text-gray-500">{data.taxLabel} included</td><td className="r text-right">{rwf(data.invoice.tax)}</td></tr>
                <tr className="tot"><td colSpan={4} className="r text-right font-bold">Total</td><td className="r text-right font-bold">{rwf(data.invoice.total)}</td></tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs text-gray-500">Status: {data.invoice.status.toLowerCase()}</p>
          </div>
          <div className="mt-4 flex justify-end"><Button variant="secondary" onClick={() => printElement(ref.current, `Invoice ${data.invoice.invoiceNumber}`)}><Printer className="mr-2 h-4 w-4" />Print or save as PDF</Button></div>
        </>
      )}
    </Modal>
  );
}

export function StatementDialog({ open, request, onClose }: { open: boolean; request: PortalRequest; onClose: () => void }) {
  const [statements, setStatements] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    setStatements(null);
    request('get', '/features/customer/statement').then((r) => setStatements(r.data.data || [])).catch((e) => setError(errorOf(e, 'Could not load your statement')));
  }, [open, request]);

  return (
    <Modal isOpen={open} onClose={onClose} title="Account statement" subtitle="Last 90 days" icon={<FileText className="h-5 w-5" />} size="lg">
      {error ? <p className="text-sm text-error-700">{error}</p> : !statements ? <p className="text-sm text-gray-500">Loading…</p> : !statements.length ? <p className="text-sm text-gray-500">You do not have a credit account with us.</p> : (
        <>
          <div ref={ref} className="space-y-6 text-sm">
            {statements.map((s) => (
              <div key={s.account.id}>
                <h2 className="font-bold">{s.account.name} <span className="font-normal text-gray-500">· {s.account.accountNumber}</span></h2>
                <p className="muted text-gray-500">{day(s.from)} – {day(s.to)}</p>
                <table className="mt-2 w-full">
                  <thead className="text-xs text-gray-500"><tr><th className="py-1 text-left">Date</th><th className="py-1 text-left">Details</th><th className="r py-1 text-right">Charged</th><th className="r py-1 text-right">Paid</th><th className="r py-1 text-right">Balance</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr><td className="py-1.5" /><td className="py-1.5 text-gray-500">Opening balance</td><td /><td /><td className="r py-1.5 text-right">{rwf(s.opening)}</td></tr>
                    {s.lines.map((l: any, n: number) => (
                      <tr key={n}>
                        <td className="py-1.5">{day(l.date)}</td>
                        <td className="py-1.5">{l.description}</td>
                        <td className="r py-1.5 text-right">{l.debit ? rwf(l.debit) : ''}</td>
                        <td className="r py-1.5 text-right">{l.credit ? rwf(l.credit) : ''}</td>
                        <td className="r py-1.5 text-right">{rwf(l.balance)}</td>
                      </tr>
                    ))}
                    <tr className="tot"><td /><td className="py-2 font-bold">{s.closing < 0 ? 'In your favour' : 'You owe'}</td><td /><td /><td className="r py-2 text-right font-bold">{rwf(Math.abs(s.closing))}</td></tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end"><Button variant="secondary" onClick={() => printElement(ref.current, 'Account statement')}><Printer className="mr-2 h-4 w-4" />Print or save as PDF</Button></div>
        </>
      )}
    </Modal>
  );
}

/** Ask for a Mobile Money payment and wait for the customer to approve it on their phone. */
export function PayDialog({ order, defaultPhone, request, onClose, onPaid }: {
  order: { id: number; orderNumber: string } | null; defaultPhone?: string | null; request: PortalRequest; onClose: () => void; onPaid: () => void;
}) {
  const [provider, setProvider] = useState('MTN_MOMO');
  const [phone, setPhone] = useState(defaultPhone || '');
  const [state, setState] = useState<'form' | 'waiting' | 'paid' | 'failed'>('form');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    if (!order) return;
    setState('form');
    setInfo('');
    setPhone(defaultPhone || '');
    return () => window.clearTimeout(timer.current);
  }, [order, defaultPhone]);

  const watch = (paymentId: number, tries = 0) => {
    timer.current = window.setTimeout(async () => {
      try {
        const p = (await request('get', `/features/customer/payments/${paymentId}`)).data.data;
        if (p.status === 'SUCCESSFUL') { setState('paid'); onPaid(); return; }
        if (p.status === 'FAILED') { setState('failed'); setInfo(p.message || 'The payment was not approved.'); return; }
      } catch { /* keep waiting */ }
      if (tries < 30) watch(paymentId, tries + 1);
      else { setState('failed'); setInfo('We did not hear back from your phone. If you approved it, refresh in a minute.'); }
    }, 4000);
  };

  const pay = async () => {
    setBusy(true);
    setInfo('');
    try {
      const p = (await request('post', `/features/customer/orders/${order!.id}/pay`, { provider, phoneNumber: phone })).data.data;
      setInfo(`Approve ${rwf(p.amount)} on your phone.`);
      setState('waiting');
      watch(p.id);
    } catch (e) {
      setInfo(errorOf(e, 'Could not start the payment'));
    } finally {
      setBusy(false);
    }
  };

  const field = 'mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary-400';
  return (
    <Modal isOpen={order !== null} onClose={onClose} title="Pay with Mobile Money" subtitle={order?.orderNumber} icon={<Smartphone className="h-5 w-5" />} size="sm">
      {state === 'form' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[['MTN_MOMO', 'MTN MoMo'], ['AIRTEL_MONEY', 'Airtel Money']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setProvider(v)} className={`rounded-xl border p-3 text-sm font-semibold ${provider === v ? 'border-primary-400 bg-primary-50 text-primary-800' : 'border-gray-200 text-gray-700'}`}>{l}</button>
            ))}
          </div>
          <label className="block text-sm font-medium">Phone number<input className={field} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="078…" /></label>
          {info && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{info}</p>}
          <Button className="w-full" onClick={pay} disabled={busy || phone.replace(/\D/g, '').length < 9}>{busy ? 'Sending…' : 'Send payment request'}</Button>
        </div>
      )}
      {state === 'waiting' && <div className="py-6 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" /><p className="mt-3 font-semibold">{info}</p><p className="mt-1 text-sm text-gray-500">Enter your PIN when your phone asks. This page updates by itself.</p></div>}
      {state === 'paid' && <div className="py-6 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-success-600" /><p className="mt-3 font-semibold">Payment received. Thank you!</p><Button className="mt-4" onClick={onClose}>Done</Button></div>}
      {state === 'failed' && <div className="py-6 text-center"><XCircle className="mx-auto h-10 w-10 text-error-600" /><p className="mt-3 text-sm">{info}</p><Button className="mt-4" variant="secondary" onClick={() => setState('form')}>Try again</Button></div>}
    </Modal>
  );
}
