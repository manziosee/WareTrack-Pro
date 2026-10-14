import { useState } from 'react';
import { FileText, FileSpreadsheet, FileJson, TrendingUp, PieChart, Boxes, Gauge } from 'lucide-react';
import Button from '@/components/ui/Button';
import { exportToCSV, exportToPDF, exportToJSON } from '@/utils/exportUtils';
import toast from 'react-hot-toast';

interface ExportReportFormProps {
  onClose: () => void;
  analytics?: any;
  dateRange?: { startDate: string; endDate: string };
}

type ReportType = 'delivery' | 'status' | 'inventory' | 'kpi';
type ExportFormat = 'pdf' | 'csv' | 'json';

const REPORT_TYPES: { value: ReportType; label: string; hint: string; icon: typeof TrendingUp }[] = [
  { value: 'delivery', label: 'Delivery Trends', hint: 'Daily orders by stage', icon: TrendingUp },
  { value: 'status', label: 'Status Breakdown', hint: 'Orders per status', icon: PieChart },
  { value: 'inventory', label: 'Inventory by Category', hint: 'Items and units held', icon: Boxes },
  { value: 'kpi', label: 'KPI Summary', hint: 'Headline performance numbers', icon: Gauge },
];

const FORMATS: { value: ExportFormat; label: string; icon: typeof FileText }[] = [
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet },
  { value: 'json', label: 'JSON', icon: FileJson },
];

function buildRows(type: ReportType, analytics: any): any[] {
  switch (type) {
    case 'delivery':
      return (analytics?.trends || []).map((row: any) => ({
        Date: row.date,
        'Total Orders': row.orders ?? 0,
        Delivered: row.delivered ?? 0,
        'In Transit': row.inTransit ?? 0,
        Pending: row.pending ?? 0,
      }));
    case 'status':
      return (analytics?.statusDistribution || []).map((row: any) => ({
        Status: row.status,
        Orders: row.count ?? 0,
      }));
    case 'inventory':
      return (analytics?.inventoryByCategory || []).map((row: any) => ({
        Category: row.category,
        Items: row.count ?? 0,
        'Total Units': row.totalQuantity ?? 0,
      }));
    case 'kpi': {
      const s = analytics?.summary || {};
      const k = analytics?.kpis || {};
      return [
        { Metric: 'Total Orders', Value: s.totalOrders ?? 0 },
        { Metric: 'Delivery Rate (%)', Value: s.deliveryRate ?? 0 },
        { Metric: 'Avg. Delivery Time (days)', Value: s.avgDeliveryTime ?? 0 },
        { Metric: 'Active Drivers', Value: s.activeDrivers ?? 0 },
        { Metric: 'On-Time Delivery Rate (%)', Value: k.onTimeDeliveryRate ?? 0 },
        { Metric: 'Customer Satisfaction (/5)', Value: k.customerSatisfaction ?? 0 },
        { Metric: 'Fleet Utilization (%)', Value: k.fleetUtilization ?? 0 },
      ];
    }
  }
}

const ExportReportForm = ({ onClose, analytics, dateRange }: ExportReportFormProps) => {
  const [reportType, setReportType] = useState<ReportType>('delivery');
  const [format, setFormat] = useState<ExportFormat>('pdf');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rows = buildRows(reportType, analytics);
    if (rows.length === 0) {
      toast.error('There is no data for this report in the selected period');
      return;
    }

    const label = REPORT_TYPES.find((r) => r.value === reportType)!.label;
    const period = dateRange ? ` (${dateRange.startDate} to ${dateRange.endDate})` : '';
    const filename = `${reportType}-report${dateRange ? `-${dateRange.startDate}_${dateRange.endDate}` : ''}`;

    if (format === 'pdf') exportToPDF(rows, filename, `${label}${period}`);
    if (format === 'csv') exportToCSV(rows, filename);
    if (format === 'json') exportToJSON(rows, filename);

    toast.success(`${label} exported as ${format.toUpperCase()}`);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {dateRange && (
        <div className="flex items-center justify-between rounded-xl bg-primary-50 px-4 py-3 text-sm">
          <span className="text-primary-700">Reporting period</span>
          <span className="font-semibold text-primary-800">{dateRange.startDate} → {dateRange.endDate}</span>
        </div>
      )}

      <div>
        <p className="mb-3 text-sm font-medium text-gray-700">Report</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {REPORT_TYPES.map(({ value, label, hint, icon: Icon }) => {
            const selected = reportType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setReportType(value)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                  selected
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900">{label}</span>
                  <span className="block text-xs text-gray-500">{hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-gray-700">Format</p>
        <div className="flex gap-2 rounded-xl bg-gray-100 p-1">
          {FORMATS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormat(value)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                format === value ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" variant="primary" className="flex-1">
          Export {format.toUpperCase()}
        </Button>
      </div>
    </form>
  );
};

export default ExportReportForm;
