import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';

interface ScanInputProps {
  onScan: (code: string) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Barcode entry: works with USB/Bluetooth scanners (they type the code and
 * press Enter), typing by hand, or the phone camera.
 */
export default function ScanInput({ onScan, placeholder = 'Scan or type a barcode, then Enter', disabled }: ScanInputProps) {
  const [value, setValue] = useState('');
  const [camera, setCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const last = useRef<{ code: string; at: number } | null>(null);
  const viewId = `scan-${useId().replace(/:/g, '')}`;

  const submit = async (code: string) => {
    const clean = code.trim();
    if (!clean || disabled) return;
    setValue('');
    await onScan(clean);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!camera) return;
    let stopped = false;
    const scanner = new Html5Qrcode(viewId, { verbose: false });
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 140 } },
        (decoded) => {
          const now = Date.now();
          if (last.current && last.current.code === decoded && now - last.current.at < 1500) return;
          last.current = { code: decoded, at: now };
          submit(decoded);
        },
        () => undefined
      )
      .catch(() => {
        if (!stopped) {
          toast.error('Could not open the camera. Allow camera access, or type the code.');
          setCamera(false);
        }
      });
    return () => {
      stopped = true;
      if (scanner.isScanning) scanner.stop().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            autoFocus
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(value); } }}
            placeholder={placeholder}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 font-mono text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-50"
          />
        </div>
        <button
          type="button"
          onClick={() => setCamera((v) => !v)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${camera ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
          title={camera ? 'Stop camera' : 'Use camera'}
        >
          {camera ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
        </button>
      </div>
      {camera && <div id={viewId} className="overflow-hidden rounded-xl bg-black" />}
    </div>
  );
}
