import { useEffect, useRef, useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileJson } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToCSV, exportToJSON, exportToPDF } from '@/utils/exportUtils';

interface ExportMenuProps {
  /** Rows already shaped for export (human-readable column names). */
  getRows: () => Record<string, unknown>[];
  filename: string;
  title: string;
  label?: string;
}

/** "Export" dropdown for PDF, CSV and JSON. */
export default function ExportMenu({ getRows, filename, title, label = 'Export' }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const run = (format: 'pdf' | 'csv' | 'json') => {
    const rows = getRows();
    setOpen(false);
    if (!rows.length) {
      toast.error('Nothing to export');
      return;
    }
    if (format === 'pdf') exportToPDF(rows, filename, title);
    if (format === 'csv') exportToCSV(rows, filename);
    if (format === 'json') exportToJSON(rows, filename);
    toast.success(`Exported ${rows.length} row${rows.length === 1 ? '' : 's'} as ${format.toUpperCase()}`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
      >
        <Download className="h-4 w-4" /> {label}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-44 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-lift animate-pop-in">
          {[
            { f: 'pdf' as const, icon: FileText, text: 'PDF report' },
            { f: 'csv' as const, icon: FileSpreadsheet, text: 'CSV (Excel)' },
            { f: 'json' as const, icon: FileJson, text: 'JSON' },
          ].map(({ f, icon: Icon, text }) => (
            <button key={f} onClick={() => run(f)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Icon className="h-4 w-4 text-gray-400" /> {text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
