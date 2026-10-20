import toast from 'react-hot-toast';
import api from '@/services/api';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const money = (v: number, currency = 'RWF') => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(v); }
  catch { return `${currency} ${v.toLocaleString()}`; }
};
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

/** Open a branded, print-ready invoice (or receipt, when paid) for an order. */
export async function printInvoice(orderId: number) {
  const win = window.open('', '_blank');
  if (!win) {
    toast.error('Allow pop-ups to print the invoice');
    return;
  }
  win.document.write('<p style="font-family:sans-serif;padding:24px">Preparing invoice…</p>');
  const res = await api.get(`/invoices/order/${orderId}`, { params: { t: Date.now() } });
  if (!res.data?.success) {
    win.close();
    toast.error(res.data?.error?.message || 'Could not load the invoice');
    return;
  }
  const { invoice, order, payments, vatRate, company, taxLabel = 'VAT' } = res.data.data;
  const currency = company?.currency || 'RWF';
  const paid = invoice.status === 'PAID';
  const logo = `${window.location.origin}/logo.svg`;

  win.document.open();
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${paid ? 'Receipt' : 'Invoice'} ${esc(invoice.invoiceNumber)}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:16mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Space Grotesk',Arial,sans-serif;color:#1F2937;margin:0;padding:28px;font-size:13px}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
.brand{display:flex;align-items:center;gap:12px}.brand img{width:46px;height:46px}
.brand b{font-size:20px;display:block}.brand span{color:#6B7280;font-size:12px}
.doc{text-align:right}.doc h1{margin:0;font-size:28px;letter-spacing:-.02em;color:#23415A}
.doc p{margin:4px 0;color:#6B7280}
.stamp{display:inline-block;margin-top:8px;padding:4px 12px;border-radius:999px;font-weight:700;font-size:12px;${paid ? 'background:#ECFDF5;color:#047857' : 'background:#FFFBEB;color:#B45309'}}
.bar{height:4px;border-radius:4px;background:linear-gradient(90deg,#4682B4,#FF8C42);margin:22px 0}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:22px}
.box h3{margin:0 0 6px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6B7280}
.box p{margin:2px 0}
table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden}
th{background:#172B3C;color:#fff;text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;padding:10px 12px}
td{padding:10px 12px;border-top:1px solid #F1F3F6}.r{text-align:right}tbody tr:nth-child(even) td{background:#F7FAFC}
.totals{margin-left:auto;width:290px;margin-top:16px}
.totals div{display:flex;justify-content:space-between;padding:6px 0}
.totals .grand{border-top:2px solid #172B3C;margin-top:6px;padding-top:10px;font-size:17px;font-weight:700;color:#172B3C}
.foot{margin-top:36px;padding-top:12px;border-top:1px dashed #E5E7EB;color:#6B7280;font-size:11px;display:flex;justify-content:space-between}
</style></head><body>
<div class="top">
  <div class="brand"><img src="${logo}" alt=""/><div><b>${esc(company?.legalName || company?.name || 'WareTrack Pro')}</b><span>${company?.legalAddress ? `${esc(company.legalAddress)} · ` : ''}${company?.taxNumber ? `TIN ${esc(company.taxNumber)}` : 'Invoice'}</span></div></div>
  <div class="doc"><h1>${paid ? 'RECEIPT' : 'INVOICE'}</h1><p><b>${esc(invoice.invoiceNumber)}</b></p><p>Issued ${day(invoice.issuedAt)}</p>${!paid && invoice.dueDate ? `<p>Due ${day(invoice.dueDate)}</p>` : ''}<span class="stamp">${paid ? 'PAID' : 'UNPAID'}</span></div>
</div>
<div class="bar"></div>
<div class="cols">
  <div class="box"><h3>Bill to</h3><p><b>${esc(order.customerName)}</b></p><p>${esc(order.deliveryAddress)}</p><p>${esc(order.contactNumber || '')}</p>${order.customerEmail ? `<p>${esc(order.customerEmail)}</p>` : ''}</div>
  <div class="box"><h3>Order</h3><p><b>${esc(order.orderNumber)}</b></p><p>Placed ${day(order.createdAt)}</p>${order.deliveredAt ? `<p>Delivered ${day(order.deliveredAt)}</p>` : ''}<p>Payment: ${esc(String(order.paymentMethod || '').replace(/_/g, ' ').toLowerCase())}</p></div>
</div>
<table><thead><tr><th>#</th><th>Item</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead><tbody>
${order.items.map((it: any, i: number) => `<tr><td>${i + 1}</td><td>${esc(it.name)}</td><td class="r">${it.quantity} ${esc(it.unit)}</td><td class="r">${money(it.unitPrice, currency)}</td><td class="r">${money(it.total, currency)}</td></tr>`).join('')}
</tbody></table>
<div class="totals">
  <div><span>Subtotal</span><span>${money(Number(invoice.subtotal), currency)}</span></div>
  <div><span>${esc(taxLabel)} (${Math.round(vatRate * 10000) / 100}%)</span><span>${money(Number(invoice.tax), currency)}</span></div>
  <div class="grand"><span>Total</span><span>${money(Number(invoice.total), currency)}</span></div>
  ${payments.map((p: any) => `<div style="color:#047857"><span>Paid · ${esc(String(p.provider).replace(/_/g, ' '))}</span><span>${money(Number(p.amount), p.currency || currency)}</span></div>`).join('')}
</div>
<div class="foot"><span>Thank you for your business.</span><span>${esc(invoice.invoiceNumber)} · Generated ${new Date().toLocaleString('en-GB')}</span></div>
<script>window.onload=function(){(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){window.print()})}</script>
</body></html>`);
  win.document.close();
}
