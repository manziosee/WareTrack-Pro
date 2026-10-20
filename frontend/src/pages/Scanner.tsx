import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, Camera, CameraOff, Keyboard, Minus, Plus, Package, Printer, History, Warehouse } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/services/api';
import { printItemLabels } from '@/utils/labels';
import { cameraErrorMessage, startQrScanner } from '@/utils/camera';

const stockLevel = (i: any) => (i.quantity === 0 ? 'OUT_OF_STOCK' : i.quantity <= i.minQuantity ? 'LOW_STOCK' : 'IN_STOCK');

/** Scan barcodes or QR labels with the camera (or type a code) to look up and move stock. */
export default function Scanner() {
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState('');
  const [item, setItem] = useState<any>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [amount, setAmount] = useState(1);
  const [warehouseId, setWarehouseId] = useState('');
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<{ name: string; delta: number; at: Date }[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastCode = useRef<{ code: string; at: number } | null>(null);

  const lookup = async (code: string) => {
    const value = code.trim();
    if (!value) return;
    const res = await api.get(`/inventory-lookup/${encodeURIComponent(value)}`, { params: { t: Date.now() } });
    if (res.data?.success) {
      setItem(res.data.data);
      setNotFound(null);
      setAmount(1);
      setWarehouseId(res.data.data.warehouseStock?.[0]?.warehouse?.id ? String(res.data.data.warehouseStock[0].warehouse.id) : '');
      navigator.vibrate?.(60);
    } else {
      setItem(null);
      setNotFound(value);
    }
  };

  const stop = async () => {
    try {
      if (scannerRef.current?.isScanning) await scannerRef.current.stop();
    } catch {
      // Already stopped
    }
    setScanning(false);
  };

  const start = async () => {
    try {
      const scanner = scannerRef.current || new Html5Qrcode('scanner-view', { verbose: false });
      scannerRef.current = scanner;
      await startQrScanner(scanner, (decoded) => {
          // Ignore the same code read twice within 2 seconds
          const now = Date.now();
          if (lastCode.current && lastCode.current.code === decoded && now - lastCode.current.at < 2000) return;
          lastCode.current = { code: decoded, at: now };
          lookup(decoded);
        });
      setScanning(true);
    } catch (error) {
      toast.error(cameraErrorMessage(error), { duration: 7000 });
      setScanning(false);
    }
  };

  useEffect(() => () => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adjust = async (direction: 1 | -1) => {
    if (!item || amount <= 0) return;
    setBusy(true);
    const res = await api.post(`/inventory/${item.id}/adjust`, {
      delta: direction * amount,
      reason: direction > 0 ? 'Scanned in' : 'Scanned out',
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
    });
    setBusy(false);
    if (res.data?.success) {
      setItem((prev: any) => ({ ...prev, quantity: res.data.data.quantity }));
      setRecent((list) => [{ name: item.name, delta: direction * amount, at: new Date() }, ...list].slice(0, 8));
      toast.success(`${direction > 0 ? 'Added' : 'Removed'} ${amount} ${item.unit} · now ${res.data.data.quantity}`);
    } else {
      toast.error(res.data?.error?.message || 'Could not update stock');
    }
  };

  return (
    <div>
      <PageHeader title="Scanner" subtitle="Scan a barcode or QR label to look up an item and move stock" breadcrumbs={[{ label: 'Warehouse' }]} icon={<ScanLine className="h-5 w-5" />} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-900">
            <div id="scanner-view" className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-white/80">
                <Camera className="h-10 w-10" />
                <p className="text-sm">Camera is off</p>
              </div>
            )}
            {scanning && <div className="pointer-events-none absolute inset-x-10 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-accent-400 shadow-[0_0_12px_2px_rgba(255,140,66,0.7)]" />}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {scanning ? (
              <Button variant="secondary" onClick={stop}><CameraOff className="mr-1.5 h-4 w-4" /> Stop camera</Button>
            ) : (
              <Button onClick={start}><Camera className="mr-1.5 h-4 w-4" /> Start scanning</Button>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              lookup(manual);
            }}
            className="mt-4 flex gap-2"
          >
            <div className="relative flex-1">
              <Keyboard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Or type a barcode / item code (e.g. FB-RICE25)" className="h-10 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100" />
            </div>
            <Button type="submit" variant="secondary">Look up</Button>
          </form>
          <p className="mt-2 text-xs text-gray-500">Works with handheld USB scanners too: click the box and scan.</p>
        </section>

        <section className="space-y-5">
          {item ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft animate-pop-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600"><Package className="h-6 w-6" /></span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                    <p className="font-mono text-xs text-gray-500">{item.code}{item.barcode ? ` · ${item.barcode}` : ''}</p>
                  </div>
                </div>
                <StatusBadge status={stockLevel(item)} size="md" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] uppercase tracking-wide text-gray-500">In stock</p><p className="text-2xl font-bold text-gray-900">{item.quantity}</p><p className="text-[11px] text-gray-500">{item.unit}</p></div>
                <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] uppercase tracking-wide text-gray-500">Minimum</p><p className="text-2xl font-bold text-gray-900">{item.minQuantity}</p></div>
                <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] uppercase tracking-wide text-gray-500">Location</p><p className="text-lg font-bold text-gray-900">{item.location}</p></div>
              </div>

              {item.warehouseStock?.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500"><Warehouse className="h-3.5 w-3.5" /> By warehouse</p>
                  <div className="flex flex-wrap gap-2">
                    {item.warehouseStock.map((w: any) => (
                      <span key={w.id} className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-600">{w.warehouse.name}: <b className="text-gray-900">{w.quantity}</b></span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-xl border border-gray-100 p-4">
                <p className="mb-3 text-sm font-semibold text-gray-800">Move stock</p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center rounded-xl border border-gray-200">
                    <button onClick={() => setAmount((a) => Math.max(1, a - 1))} className="flex h-10 w-10 items-center justify-center text-gray-600 hover:bg-gray-50"><Minus className="h-4 w-4" /></button>
                    <input type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))} className="h-10 w-16 border-x border-gray-200 text-center text-sm font-semibold outline-none" />
                    <button onClick={() => setAmount((a) => a + 1)} className="flex h-10 w-10 items-center justify-center text-gray-600 hover:bg-gray-50"><Plus className="h-4 w-4" /></button>
                  </div>
                  {item.warehouseStock?.length > 0 && (
                    <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="h-10 rounded-xl border border-gray-200 px-2 text-sm">
                      {item.warehouseStock.map((w: any) => <option key={w.warehouse.id} value={w.warehouse.id}>{w.warehouse.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="success" disabled={busy} onClick={() => adjust(1)}><Plus className="mr-1.5 h-4 w-4" /> Stock in</Button>
                  <Button variant="error" disabled={busy || item.quantity === 0} onClick={() => adjust(-1)}><Minus className="mr-1.5 h-4 w-4" /> Stock out</Button>
                </div>
              </div>
              <button onClick={() => printItemLabels(item)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:underline">
                <Printer className="h-3.5 w-3.5" /> Print QR labels for this item
              </button>
            </div>
          ) : notFound ? (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-soft">
              <EmptyState variant="search" title={`No item matches “${notFound}”`} description="Check the code, or add the barcode to the item in Inventory." />
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-soft">
              <EmptyState variant="search" title="Scan something to begin" description="The item's stock, location and quick actions will appear here." />
            </div>
          )}

          {recent.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"><History className="h-4 w-4 text-primary-500" /> This session</p>
              <ul className="space-y-1.5 text-sm">
                {recent.map((r, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="truncate text-gray-700">{r.name}</span>
                    <span className={`font-semibold ${r.delta > 0 ? 'text-success-600' : 'text-error-600'}`}>{r.delta > 0 ? '+' : ''}{r.delta}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
