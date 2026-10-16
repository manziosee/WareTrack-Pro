import { useState } from 'react';
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { readSpreadsheet, downloadTemplate } from '@/utils/spreadsheet';

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  aliases?: string[];
  example: string | number;
}

interface ImportDialogProps {
  fields: ImportField[];
  templateName: string;
  /** Send the rows; return a short summary to show (or throw an Error). */
  onImport: (rows: Record<string, unknown>[]) => Promise<{ message: string; errors?: { row: number; message: string }[] }>;
  onDone?: () => void;
  hint?: string;
}

/** Pick an Excel/CSV file, check the columns, preview, then import. */
export default function ImportDialog({ fields, templateName, onImport, onDone, hint }: ImportDialogProps) {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ message: string; errors?: { row: number; message: string }[] } | null>(null);
  const required = fields.filter((f) => f.required);

  const pick = async (file?: File) => {
    if (!file) return;
    setProblem('');
    setResult(null);
    setRows(null);
    setFileName(file.name);
    try {
      const parsed = await readSpreadsheet(file, Object.fromEntries(fields.map((f) => [f.key, [f.label, ...(f.aliases || [])]])));
      const missing = required.filter((f) => !parsed.recognized.includes(f.key));
      if (missing.length) throw new Error(`Missing column${missing.length === 1 ? '' : 's'}: ${missing.map((f) => f.label).join(', ')}. Download the template to see the expected columns.`);
      if (!parsed.rows.length) throw new Error('No data rows found');
      setRows(parsed.rows);
    } catch (error: any) {
      setProblem(error.message || 'Could not read the file');
    }
  };

  const run = async () => {
    if (!rows) return;
    setBusy(true);
    try {
      setResult(await onImport(rows));
      onDone?.();
    } catch (error: any) {
      setProblem(error.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const preview = rows?.slice(0, 5) || [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-3 text-sm">
        <span className="text-gray-600">{hint || 'Use the template columns. Excel (.xlsx) and CSV files work.'}</span>
        <button
          type="button"
          onClick={() => downloadTemplate(templateName, fields.map((f) => f.label), [fields.map((f) => f.example)])}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100"
        ><Download className="h-3.5 w-3.5" /> Template</button>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 hover:border-primary-300 hover:text-primary-600">
        <FileSpreadsheet className="h-7 w-7" />
        {fileName ? <span className="font-medium text-gray-800">{fileName}</span> : <span>Choose an Excel or CSV file</span>}
        <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </label>

      {problem && <p className="flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{problem}</p>}

      {rows && !result && (
        <div>
          <p className="mb-2 text-sm text-gray-700"><b>{rows.length}</b> row{rows.length === 1 ? '' : 's'} ready. First {preview.length}:</p>
          <div className="max-h-56 overflow-auto rounded-xl border border-gray-100">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 text-left text-gray-500"><tr>{fields.map((f) => <th key={f.key} className="whitespace-nowrap px-2 py-1.5 font-medium">{f.label}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((r, i) => <tr key={i}>{fields.map((f) => <td key={f.key} className="whitespace-nowrap px-2 py-1.5 text-gray-700">{String(r[f.key] ?? '')}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 rounded-xl bg-success-50 p-3 text-sm text-success-800"><CheckCircle2 className="h-4 w-4" />{result.message}</p>
          {result.errors && result.errors.length > 0 && (
            <ul className="max-h-40 overflow-auto rounded-xl bg-warning-50 p-3 text-xs text-warning-800">
              {result.errors.slice(0, 50).map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
            </ul>
          )}
        </div>
      )}

      {rows && !result && (
        <div className="flex justify-end">
          <Button onClick={run} disabled={busy}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />} Import {rows.length} row{rows.length === 1 ? '' : 's'}</Button>
        </div>
      )}
    </div>
  );
}
