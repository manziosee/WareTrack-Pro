import readXlsxFile from 'read-excel-file';

/** Lower-case letters and digits only, so "Credit Limit (RWF)" matches "creditlimitrwf". */
export const normalizeHeader = (h: unknown) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',' || c === ';' || c === '\t') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

/**
 * Read an .xlsx or .csv file into objects keyed by normalized header.
 * `aliases` maps a field name to the header spellings people use.
 */
export async function readSpreadsheet(file: File, aliases: Record<string, string[]>) {
  const name = file.name.toLowerCase();
  let table: unknown[][];
  if (name.endsWith('.xlsx')) table = (await readXlsxFile(file)) as unknown[][];
  else if (name.endsWith('.csv') || name.endsWith('.txt')) table = parseCsv(await file.text());
  else throw new Error('Use an Excel (.xlsx) or CSV file');
  if (table.length < 2) throw new Error('The file has no rows under the header');

  const headers = table[0].map(normalizeHeader);
  const lookup = new Map<string, string>();
  for (const [field, names] of Object.entries(aliases)) {
    for (const n of [field, ...names]) lookup.set(normalizeHeader(n), field);
  }
  const columns = headers.map((h) => lookup.get(h) || null);
  const missing = Object.keys(aliases).filter((f) => !columns.includes(f));
  const rows = table.slice(1).map((r) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((field, i) => {
      if (!field) return;
      const v = r[i];
      obj[field] = v instanceof Date ? v.toISOString() : typeof v === 'string' ? v.trim() : v ?? '';
    });
    return obj;
  }).filter((o) => Object.values(o).some((v) => v !== '' && v !== null && v !== undefined));
  return { rows, recognized: columns.filter(Boolean) as string[], missing, unknownHeaders: table[0].filter((_, i) => !columns[i]).map(String) };
}

/** Download a CSV template with the given headers and example rows. */
export function downloadTemplate(filename: string, headers: string[], examples: (string | number)[][]) {
  const esc = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const csv = [headers, ...examples].map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
