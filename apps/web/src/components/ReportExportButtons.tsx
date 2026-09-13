import { FileText, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PermissionGuard } from './PermissionGuard';

interface ReportExportButtonsProps {
  onPrint: () => void;
  onExportExcel: () => void;
}

export function ReportExportButtons({ onPrint, onExportExcel }: ReportExportButtonsProps) {
  return (
    <PermissionGuard permission="reports:export" behavior="disable">
      <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={onPrint}
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '13px' }}
        >
          <FileText size={16} /> Print / PDF
        </button>
        <button 
          onClick={onExportExcel}
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--status-success)', borderColor: 'rgba(16, 185, 129, 0.2)' }}
        >
          <FileSpreadsheet size={16} /> Export Excel
        </button>
      </div>
    </PermissionGuard>
  );
}

export function exportToExcel(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert("No data available to export");
    return;
  }
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  
  // Format the file name with current date
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);
}
