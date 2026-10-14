export const exportToCSV = (data: any[], filename: string) => {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Status words map to a pill colour in the printed report
const STATUS_TONES: Record<string, string> = {
  delivered: 'good', active: 'good', available: 'good', completed: 'good', in_stock: 'good',
  in_transit: 'info', dispatched: 'info', on_duty: 'info', in_use: 'info', scheduled: 'info',
  pending: 'warn', low_stock: 'warn', maintenance: 'warn', medium: 'warn', off_duty: 'warn',
  inactive: 'neutral',
  cancelled: 'bad', discontinued: 'bad', out_of_stock: 'bad', high: 'bad', out_of_service: 'bad',
};

const isStatusColumn = (key: string) => /status|priority|role|state/i.test(key);
const isNumericColumn = (key: string, rows: any[]) =>
  rows.every((row) => row[key] === null || row[key] === undefined || row[key] === '' || !Number.isNaN(Number(row[key])));

const formatCell = (key: string, value: unknown, numeric: boolean): string => {
  if (value === null || value === undefined || value === '') return '<span class="muted">—</span>';
  if (isStatusColumn(key)) {
    const norm = String(value).toLowerCase().replace(/[\s-]+/g, '_');
    const tone = STATUS_TONES[norm] || 'neutral';
    const label = String(value).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
    return `<span class="pill ${tone}"><i></i>${escapeHtml(label)}</span>`;
  }
  if (numeric) {
    const num = Number(value);
    const formatted = /price|amount|revenue|value|cost|total/i.test(key)
      ? `RWF ${num.toLocaleString()}`
      : num.toLocaleString();
    return escapeHtml(formatted);
  }
  return escapeHtml(value);
};

export const exportToPDF = async (data: any[], _filename: string, title: string) => {
  // Branded, print-ready report opened in a new window and sent to the browser's print dialog
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const headers = Object.keys(data[0] || {});
  const numericColumns = new Set(headers.filter((key) => !isStatusColumn(key) && isNumericColumn(key, data)));
  const generatedAt = new Date().toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
  const logoUrl = `${window.location.origin}/logo.svg`;

  // Summary chips: total rows plus a count per value of the first status-like column
  const statusKey = headers.find((key) => /status/i.test(key));
  const statusCounts: Record<string, number> = {};
  if (statusKey) {
    data.forEach((row) => {
      const key = String(row[statusKey] ?? 'Unknown');
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });
  }
  const summaryChips = [
    `<div class="chip primary"><span>Total Records</span><strong>${data.length.toLocaleString()}</strong></div>`,
    ...Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => {
        const tone = STATUS_TONES[label.toLowerCase().replace(/[\s-]+/g, '_')] || 'neutral';
        const pretty = label.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
        return `<div class="chip ${tone}"><span>${escapeHtml(pretty)}</span><strong>${count.toLocaleString()}</strong></div>`;
      }),
  ].join('');

  const tableRows = data.length
    ? data.map((row, index) => `
          <tr>
            <td class="idx">${index + 1}</td>
            ${headers.map((key) => `<td class="${numericColumns.has(key) ? 'num' : ''}">${formatCell(key, row[key], numericColumns.has(key))}</td>`).join('')}
          </tr>`).join('')
    : `<tr><td class="empty" colspan="${headers.length + 1}">No records to display</td></tr>`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} · WareTrack Pro</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4 landscape; margin: 14mm 12mm 16mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: 'Space Grotesk', system-ui, sans-serif;
      color: #1F2937;
      margin: 0;
      padding: 24px;
      background: #fff;
      font-size: 12px;
    }
    .header {
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      padding: 22px 26px;
      color: #fff;
      background: linear-gradient(120deg, #2F5778 0%, #4682B4 60%, #6397C2 100%);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .header::after {
      content: '';
      position: absolute;
      right: -40px;
      top: -60px;
      width: 220px;
      height: 220px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,140,66,0.55), rgba(255,140,66,0) 70%);
    }
    .brand { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }
    .brand img {
      width: 44px; height: 44px; border-radius: 12px; background: #fff; padding: 6px;
    }
    .brand small { display: block; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.8; }
    .brand h1 { margin: 2px 0 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
    .meta { text-align: right; position: relative; z-index: 1; font-size: 11px; line-height: 1.6; opacity: 0.95; }
    .meta strong { display: block; font-size: 13px; }
    .accent-bar { height: 4px; border-radius: 4px; margin: 14px 0 18px; background: linear-gradient(90deg, #4682B4, #FF8C42); width: 120px; }
    .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
    .chip {
      display: flex; flex-direction: column; gap: 2px; min-width: 120px;
      padding: 10px 14px; border-radius: 12px; border: 1px solid #E5E7EB; background: #F9FAFB;
    }
    .chip span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6B7280; }
    .chip strong { font-size: 20px; font-weight: 700; color: #111827; }
    .chip.primary { background: #E0EAF3; border-color: #C1D6E7; }
    .chip.primary strong { color: #23415A; }
    .chip.good { border-left: 4px solid #10B981; }
    .chip.info { border-left: 4px solid #3B82F6; }
    .chip.warn { border-left: 4px solid #F59E0B; }
    .chip.bad { border-left: 4px solid #EF4444; }
    .chip.neutral { border-left: 4px solid #9CA3AF; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden; }
    thead th {
      background: #172B3C; color: #fff; text-align: left; font-weight: 600;
      font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 12px;
    }
    thead th.num { text-align: right; }
    tbody td { padding: 9px 12px; border-top: 1px solid #F1F3F6; vertical-align: middle; }
    tbody tr:nth-child(even) td { background: #F7FAFC; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    td.idx { width: 36px; color: #9CA3AF; font-variant-numeric: tabular-nums; }
    td.empty { text-align: center; padding: 28px; color: #6B7280; }
    .muted { color: #9CA3AF; }
    .pill {
      display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px;
      font-size: 10.5px; font-weight: 600; white-space: nowrap;
    }
    .pill i { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
    .pill.good { background: #ECFDF5; color: #047857; } .pill.good i { background: #10B981; }
    .pill.info { background: #EFF6FF; color: #1D4ED8; } .pill.info i { background: #3B82F6; }
    .pill.warn { background: #FFFBEB; color: #B45309; } .pill.warn i { background: #F59E0B; }
    .pill.bad { background: #FEF2F2; color: #B91C1C; } .pill.bad i { background: #EF4444; }
    .pill.neutral { background: #F3F4F6; color: #374151; } .pill.neutral i { background: #9CA3AF; }
    .footer {
      margin-top: 18px; display: flex; justify-content: space-between; align-items: center;
      font-size: 10px; color: #6B7280; border-top: 1px dashed #E5E7EB; padding-top: 10px;
    }
    .footer b { color: #4682B4; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <img src="${logoUrl}" alt="" onerror="this.style.display='none'" />
      <div>
        <small>WareTrack Pro</small>
        <h1>${escapeHtml(title)}</h1>
      </div>
    </div>
    <div class="meta">
      <strong>Generated</strong>
      ${escapeHtml(generatedAt)}
    </div>
  </div>
  <div class="accent-bar"></div>
  <div class="chips">${summaryChips}</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        ${headers.map((key) => `<th class="${numericColumns.has(key) ? 'num' : ''}">${escapeHtml(key)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>${tableRows}
    </tbody>
  </table>
  <div class="footer">
    <span><b>WareTrack Pro</b> · Warehouse Delivery &amp; Dispatch Tracking</span>
    <span>${data.length.toLocaleString()} record${data.length === 1 ? '' : 's'} · ${escapeHtml(generatedAt)}</span>
  </div>
  <script>
    window.onload = function () {
      var print = function () {
        window.print();
        window.onafterprint = function () { window.close(); };
      };
      // Wait for Space Grotesk so the printout uses the right font
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(print);
      } else {
        print();
      }
    };
  </script>
</body>
</html>`;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

export const exportToJSON = (data: any[], filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};