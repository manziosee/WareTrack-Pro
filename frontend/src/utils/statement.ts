import toast from 'react-hot-toast';
import api from '@/services/api';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const rwf = (v: number) => `RWF ${Math.round(v).toLocaleString()}`;
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Open a print-ready customer statement (opening balance, orders, payments, running balance). */
export async function printStatement(accountId: number, range?: { from?: string; to?: string }) {
  // Open the window inside the click so pop-up blockers allow it
  const win = window.open('', '_blank');
  if (!win) {
    toast.error('Allow pop-ups to print the statement');
    return;
  }
  win.document.write('<p style="font-family:sans-serif;padding:24px">Preparing statement…</p>');
  const res = await api.get(`/accounts/${accountId}/statement`, { params: { ...range, t: Date.now() } });
  if (!res.data?.success) {
    win.close();
    toast.error(res.data?.error?.message || 'Could not load the statement');
    return;
  }
  const s = res.data.data;
  const a = s.account;
  const logo = `${window.location.origin}/logo.svg`;
  win.document.open();
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Statement ${esc(a.accountNumber)}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:16mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Space Grotesk',Arial,sans-serif;color:#1F2937;margin:0;padding:28px;font-size:12px}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
.brand{display:flex;align-items:center;gap:12px}.brand img{width:44px;height:44px}.brand b{font-size:19px;display:block}.brand span{color:#6B7280;font-size:11px}
.doc{text-align:right}.doc h1{margin:0;font-size:26px;color:#23415A}.doc p{margin:3px 0;color:#6B7280}
.bar{height:4px;border-radius:4px;background:linear-gradient(90deg,#4682B4,#FF8C42);margin:20px 0}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:18px}.box h3{margin:0 0 6px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6B7280}.box p{margin:2px 0}
.sum{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}.sum div{border:1px solid #E5E7EB;border-radius:10px;padding:10px}.sum span{display:block;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:.06em}.sum b{font-size:15px}
table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden}
th{background:#172B3C;color:#fff;text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:9px 10px}
td{padding:8px 10px;border-top:1px solid #F1F3F6}.r{text-align:right}tbody tr:nth-child(even) td{background:#F7FAFC}
.foot{margin-top:28px;padding-top:10px;border-top:1px dashed #E5E7EB;color:#6B7280;font-size:10px;display:flex;justify-content:space-between}
</style></head><body>
<div class="top">
  <div class="brand"><img src="${logo}" alt=""/><div><b>WareTrack Pro</b><span>Kigali, Rwanda</span></div></div>
  <div class="doc"><h1>STATEMENT</h1><p><b>${esc(a.accountNumber)}</b></p><p>${day(s.from)} – ${day(s.to)}</p></div>
</div>
<div class="bar"></div>
<div class="cols">
  <div class="box"><h3>Customer</h3><p><b>${esc(a.name)}</b></p>${a.address ? `<p>${esc(a.address)}</p>` : ''}${a.phone ? `<p>${esc(a.phone)}</p>` : ''}${a.tin ? `<p>TIN ${esc(a.tin)}</p>` : ''}</div>
  <div class="box"><h3>Terms</h3><p>${a.paymentTermsDays ? `Payment within ${a.paymentTermsDays} days of delivery` : 'Payment on delivery'}</p>${Number(a.creditLimit) ? `<p>Credit limit ${rwf(Number(a.creditLimit))}</p>` : ''}</div>
</div>
<div class="sum"><div><span>Opening balance</span><b>${rwf(s.opening)}</b></div><div><span>Deliveries</span><b>${rwf(s.totalDebit)}</b></div><div><span>Payments</span><b>${rwf(s.totalCredit)}</b></div><div><span>Balance due</span><b>${rwf(s.closing)}</b></div></div>
<table><thead><tr><th>Date</th><th>Reference</th><th>Description</th><th class="r">Charged</th><th class="r">Paid</th><th class="r">Balance</th></tr></thead><tbody>
<tr><td>${day(s.from)}</td><td></td><td>Opening balance</td><td></td><td></td><td class="r">${rwf(s.opening)}</td></tr>
${s.lines.map((l: any) => `<tr><td>${day(l.date)}</td><td>${esc(l.reference)}</td><td>${esc(l.description)}</td><td class="r">${l.debit ? rwf(l.debit) : ''}</td><td class="r">${l.credit ? rwf(l.credit) : ''}</td><td class="r">${rwf(l.balance)}</td></tr>`).join('')}
</tbody></table>
<div class="foot"><span>Please pay the balance due. Thank you for your business.</span><span>Generated ${new Date().toLocaleString('en-GB')}</span></div>
<script>window.onload=function(){(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){window.print()})}</script>
</body></html>`);
  win.document.close();
}
