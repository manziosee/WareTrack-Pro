import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';

export interface SignaturePadHandle {
  /** PNG data URL, or null when nothing has been drawn. */
  toDataURL: () => string | null;
  clear: () => void;
}

/** Finger / mouse signature capture on a canvas. */
const SignaturePad = forwardRef<SignaturePadHandle, { height?: number; onChange?: (hasInk: boolean) => void }>(({ height = 180, onChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const setup = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#172B3C';
  };

  useEffect(() => {
    setup();
  }, []);

  const point = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange?.(false);
  };

  useImperativeHandle(ref, () => ({
    toDataURL: () => (hasInk && canvasRef.current ? canvasRef.current.toDataURL('image/png') : null),
    clear,
  }));

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        style={{ height, touchAction: 'none' }}
        className="w-full rounded-xl border-2 border-dashed border-gray-200 bg-white"
        onPointerDown={(e) => {
          drawing.current = true;
          last.current = point(e);
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drawing.current || !last.current) return;
          const ctx = canvasRef.current!.getContext('2d')!;
          const p = point(e);
          ctx.beginPath();
          ctx.moveTo(last.current.x, last.current.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          last.current = p;
          if (!hasInk) {
            setHasInk(true);
            onChange?.(true);
          }
        }}
        onPointerUp={() => {
          drawing.current = false;
          last.current = null;
        }}
      />
      {!hasInk && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">Sign here</span>}
      <button type="button" onClick={clear} className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-gray-500 shadow-sm hover:text-gray-800">
        <Eraser className="h-3.5 w-3.5" /> Clear
      </button>
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';
export default SignaturePad;
