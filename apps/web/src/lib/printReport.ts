export interface PrintColumn {
  header: string;
  accessorKey?: string;
  cell?: (item: any) => string | number;
}

export interface PrintOptions {
  orientation?: 'portrait' | 'landscape';
}

export function formatDateGB(dateStr?: string | Date | null): string {
  if (!dateStr) return 'Any';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-GB');
}

export function printReportDocument(
  title: string, 
  filtersText: string, 
  columns: PrintColumn[], 
  data: any[],
  options?: PrintOptions
) {
  if (!data || data.length === 0) {
    alert("No data to print.");
    return;
  }

  const orientation = options?.orientation || (columns.length >= 5 ? 'landscape' : 'portrait');
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const timeStr = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Auto-convert any YYYY-MM-DD input date strings in filtersText to DD/MM/YYYY format
  const formattedFiltersText = filtersText.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1');
  
  let tableRowsHtml = data.map((item, index) => {
    let rowHtml = `<tr class="${index % 2 === 1 ? 'even-row' : ''}">`;
    columns.forEach(col => {
      let val = '';
      if (col.cell) {
        val = String(col.cell(item));
      } else if (col.accessorKey) {
        val = item[col.accessorKey] != null ? String(item[col.accessorKey]) : '-';
      }
      rowHtml += `<td>${val}</td>`;
    });
    rowHtml += '</tr>';
    return rowHtml;
  }).join('');

  let tableHeadersHtml = columns.map(col => `<th>${col.header}</th>`).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page { 
            size: A4 ${orientation}; 
            margin: 8mm 10mm; 
          }
          
          * { 
            box-sizing: border-box; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            color: #111827; 
            margin: 0; 
            padding: 0; 
            font-size: 10px;
            line-height: 1.3;
          }

          .report-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #111827;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }

          .brand-title {
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #111827;
            margin: 0 0 2px 0;
          }

          .report-subtitle {
            font-size: 13px;
            font-weight: 700;
            color: #374151;
            margin: 0;
          }

          .meta-box {
            text-align: right;
            font-size: 9.5px;
            color: #4b5563;
          }

          .meta-box div {
            margin-bottom: 2px;
          }

          .filters-bar {
            background-color: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 6px 10px;
            font-size: 9.5px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 10px;
          }

          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 15px; 
            table-layout: auto;
          }

          th { 
            background-color: #e5e7eb !important; 
            color: #111827;
            font-weight: 700; 
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            padding: 5px 6px; 
            border: 1px solid #9ca3af;
            text-align: left; 
          }

          td { 
            border: 1px solid #d1d5db; 
            padding: 4px 6px; 
            text-align: left; 
            font-size: 9.5px;
            word-break: break-word;
          }

          tr.even-row {
            background-color: #f9fafb !important;
          }

          .report-footer {
            border-top: 1px solid #d1d5db;
            padding-top: 6px;
            font-size: 9px;
            color: #6b7280;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <h1 class="brand-title">Master House</h1>
            <h2 class="report-subtitle">${title}</h2>
          </div>
          <div class="meta-box">
            <div><strong>Generated:</strong> ${dateStr} ${timeStr}</div>
            <div><strong>Total Records:</strong> ${data.length}</div>
          </div>
        </div>

        ${formattedFiltersText ? `<div class="filters-bar"><strong>Applied Filters:</strong> ${formattedFiltersText}</div>` : ''}

        <table>
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="report-footer">
          <span>Master House ERP &bull; Official Business Report</span>
          <span>Confidential</span>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  }
}
