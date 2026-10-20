import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { barcodeSvgDataUrl } from './barcode';

/** Print a sheet of QR labels for one item. */
export async function printItemLabels(item: { name: string; code: string; barcode?: string | null; location?: string }, copies = 8) {
  const value = item.barcode || item.code;
  const dataUrl = await QRCode.toDataURL(value, { margin: 1, width: 220, color: { dark: '#172B3C', light: '#FFFFFF' } });
  const barcodeUrl = barcodeSvgDataUrl(value);
  const win = window.open('', '_blank');
  if (!win) return toast.error('Allow pop-ups to print labels');
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  const label = `<div class="l"><div class="codes"><img class="qr" src="${dataUrl}"/><img class="linear" src="${barcodeUrl}"/></div><div><b>${esc(item.name)}</b><span>Item ${esc(item.code)}</span><strong>${esc(value)}</strong>${item.location ? `<span>Loc ${esc(item.location)}</span>` : ''}</div></div>`;
  win.document.write(`<!doctype html><html><head><title>Labels · ${esc(item.name)}</title><style>
    @page{size:A4;margin:10mm}body{font-family:Arial,sans-serif;margin:0}
    .g{display:grid;grid-template-columns:repeat(2,1fr);gap:6mm}
    .l{display:flex;gap:10px;align-items:center;border:1px dashed #CBD5E1;border-radius:8px;padding:8px;page-break-inside:avoid}
    .l b{display:block;font-size:13px;color:#172B3C}.l span{display:block;font-size:11px;color:#475569;margin-top:2px}.l strong{display:block;font-family:monospace;font-size:12px;letter-spacing:.4px;margin-top:5px;color:#172B3C}.codes{display:flex;flex-direction:column;align-items:center;gap:3px}.qr{width:72px;height:72px}.linear{width:190px;height:48px}
  </style></head><body><div class="g">${Array.from({ length: copies }, () => label).join('')}</div>
  <script>window.onload=()=>{window.print();}</script></body></html>`);
  win.document.close();
}
