const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'apps/web/src/features/reports/pages');
const pages = [
  'ExpenseReportPage.tsx',
  'ProfitLossReportPage.tsx',
  'ReceiptsReportPage.tsx',
  'SalesReportPage.tsx',
  'SchedulesReportPage.tsx',
  'StockReportPage.tsx',
  'ContractsReportPage.tsx'
];

for (const page of pages) {
  const filePath = path.join(pagesDir, page);
  if (!fs.existsSync(filePath)) {
    console.log('Skipping ' + page);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove imports
  content = content.replace(/import { useRef } from 'react';\n/, '');
  content = content.replace(/import { useReactToPrint } from 'react-to-print';\n/, '');
  // Because SalesReportPage had FileText imported twice, maybe just remove one
  content = content.replace(/import { FileText } from 'lucide-react';\n/, '');

  // Find component name
  const compMatch = content.match(/export function (\w+)\(\) \{/);
  if (!compMatch) continue;
  const compName = compMatch[1];

  // Remove useRef and useReactToPrint
  content = content.replace(
    `  const printRef = useRef<HTMLDivElement>(null);\n  const handlePrint = useReactToPrint({ contentRef: printRef });\n`,
    ``
  );

  // Remove ref={printRef}
  content = content.replace(
    `<div ref={printRef} className="page-container"`,
    `<div className="page-container"`
  );

  // Revert header layout
  content = content.replace(
    `borderRadius: 'var(--border-radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}`,
    `borderRadius: 'var(--border-radius-lg)' }}`
  );

  // Remove button before </header>
  content = content.replace(
    `  <button onClick={() => handlePrint()} className="btn-secondary no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>\n          <FileText size={16} /> Print / PDF\n        </button>\n      </header>`,
    `</header>`
  );
  
  // also handle the case if it was formatted slightly differently
  content = content.replace(
    /<button onClick={\(\) => handlePrint\(\)} className="btn-secondary no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>\s*<FileText size={16} \/> Print \/ PDF\s*<\/button>\s*<\/header>/g,
    `</header>`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Reverted ' + page);
}
