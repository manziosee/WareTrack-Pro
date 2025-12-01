import { useState } from 'react';
import { Search, Filter, Calendar, Download } from 'lucide-react';
import Button from './Button';

interface SearchFilterProps {
  onSearch: (term: string) => void;
  onFilter: (filters: any) => void;
  onExport: (format: 'csv' | 'pdf' | 'json') => void;
  showDateRange?: boolean;
  showExport?: boolean;
  filterOptions?: Array<{ label: string; value: string; options: Array<{ label: string; value: string }> }>;
}

export default function SearchFilter({
  onSearch,
  onFilter,
  onExport,
  showDateRange = false,
  showExport = true,
  filterOptions = []
}: SearchFilterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filters, setFilters] = useState<any>({});

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter({ ...newFilters, ...dateRange });
  };

  const handleDateRangeChange = (key: 'start' | 'end', value: string) => {
    const newDateRange = { ...dateRange, [key]: value };
    setDateRange(newDateRange);
    onFilter({ ...filters, ...newDateRange });
  };

  const clearFilters = () => {
    setFilters({});
    setDateRange({ start: '', end: '' });
    setSearchTerm('');
    onSearch('');
    onFilter({});
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Filter Toggle */}
        {filterOptions.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        )}

        {/* Date Range Toggle */}
        {showDateRange && (
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Date Range
          </Button>
        )}

        {/* Export */}
        {showExport && (
          <div className="relative">
            <Button
              variant="secondary"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32">
                <button
                  onClick={() => { onExport('csv'); setShowExportMenu(false); }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg"
                >
                  CSV
                </button>
                <button
                  onClick={() => { onExport('pdf'); setShowExportMenu(false); }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50"
                >
                  PDF
                </button>
                <button
                  onClick={() => { onExport('json'); setShowExportMenu(false); }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 last:rounded-b-lg"
                >
                  JSON
                </button>
              </div>
            )}
          </div>
        )}

        {/* Clear Filters */}
        {(Object.keys(filters).length > 0 || dateRange.start || dateRange.end || searchTerm) && (
          <Button variant="outline" onClick={clearFilters}>
            Clear All
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filter Options */}
            {filterOptions.map((option) => (
              <div key={option.value}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {option.label}
                </label>
                <select
                  value={filters[option.value] || ''}
                  onChange={(e) => handleFilterChange(option.value, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All {option.label}</option>
                  {option.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {/* Date Range */}
            {showDateRange && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}