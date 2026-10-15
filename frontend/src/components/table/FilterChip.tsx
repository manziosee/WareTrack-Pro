import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface FilterChipProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}

/** Pill-shaped filter: shows the chosen value and a quick clear button. */
export default function FilterChip({ label, value, options, onChange }: FilterChipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition ${
          selected ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-dashed border-gray-300 text-gray-600 hover:bg-gray-50'
        }`}
      >
        {label}
        {selected && <span className="font-semibold">: {selected.label}</span>}
        {selected ? (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="-mr-1 rounded p-0.5 hover:bg-primary-100"
            aria-label={`Clear ${label}`}
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 max-h-72 w-52 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-lift animate-pop-in">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value === value ? '' : o.value);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {o.label}
              {o.value === value && <Check className="h-4 w-4 text-primary-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
