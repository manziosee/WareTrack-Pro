import { useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import Button from '../ui/Button';
import { exportToPDF, printElement, exportToExcel } from '../../utils/exportUtils';

interface ExportButtonProps {
  data?: any[];
  elementId?: string;
  filename: string;
  type?: 'pdf' | 'excel' | 'print';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
  size?: 'sm' | 'md';
}

export default function ExportButton({ 
  data, 
  elementId, 
  filename, 
  type = 'pdf',
  variant = 'secondary',
  size = 'sm'
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      switch (type) {
        case 'pdf':
          if (elementId) {
            await exportToPDF(elementId, `${filename}.pdf`);
          }
          break;
        case 'excel':
          if (data) {
            exportToExcel(data, `${filename}.csv`);
          }
          break;
        case 'print':
          if (elementId) {
            printElement(elementId);
          }
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'pdf': return FileText;
      case 'excel': return Download;
      case 'print': return Printer;
      default: return Download;
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'pdf': return 'PDF';
      case 'excel': return 'Excel';
      case 'print': return 'Print';
      default: return 'Export';
    }
  };

  const Icon = getIcon();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2"
    >
      <Icon className="w-4 h-4" />
      {isExporting ? 'Exporting...' : getLabel()}
    </Button>
  );
}