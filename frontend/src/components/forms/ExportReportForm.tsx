import { useState } from 'react';

interface ExportReportFormProps {
  onClose: () => void;
}

const ExportReportForm = ({ onClose }: ExportReportFormProps) => {
  const [formData, setFormData] = useState({
    reportType: 'delivery',
    startDate: '',
    endDate: '',
    format: 'pdf',
    includeCharts: true,
    includeDetails: true,
    filterBy: 'all'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Exporting ${formData.reportType} report from ${formData.startDate} to ${formData.endDate} as ${formData.format.toUpperCase()}`);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
          <select
            value={formData.reportType}
            onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="delivery">Delivery Report</option>
            <option value="inventory">Inventory Report</option>
            <option value="performance">Performance Report</option>
            <option value="financial">Financial Report</option>
            <option value="driver">Driver Report</option>
            <option value="vehicle">Vehicle Report</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter By</label>
          <select
            value={formData.filterBy}
            onChange={(e) => setFormData({ ...formData, filterBy: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Records</option>
            <option value="priority">High Priority Only</option>
            <option value="status">By Status</option>
            <option value="driver">By Driver</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            required
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            required
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Export Format</label>
        <select
          value={formData.format}
          onChange={(e) => setFormData({ ...formData, format: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="pdf">PDF Document</option>
          <option value="excel">Excel Spreadsheet</option>
          <option value="csv">CSV File</option>
          <option value="json">JSON Data</option>
        </select>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="includeCharts"
            checked={formData.includeCharts}
            onChange={(e) => setFormData({ ...formData, includeCharts: e.target.checked })}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="includeCharts" className="ml-2 text-sm text-gray-700">
            Include charts and graphs
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="includeDetails"
            checked={formData.includeDetails}
            onChange={(e) => setFormData({ ...formData, includeDetails: e.target.checked })}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="includeDetails" className="ml-2 text-sm text-gray-700">
            Include detailed records
          </label>
        </div>
      </div>
      
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Export Report
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ExportReportForm;