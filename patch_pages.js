const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'apps/web/src/features/reports/pages');
const pages = [
  'ExpenseReportPage.tsx',
  'ProfitLossReportPage.tsx',
  'ReceiptsReportPage.tsx',
  'SalesReportPage.tsx',
  'SchedulesReportPage.tsx',
  'StockReportPage.tsx'
];

for (const page of pages) {
  const filePath = path.join(pagesDir, page);
  if (!fs.existsSync(filePath)) {
    console.log('Skipping ' + page);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Add imports if not present
  if (!content.includes("import { useRef }")) {
    content = `import { useRef } from 'react';\nimport { useReactToPrint } from 'react-to-print';\nimport { FileText } from 'lucide-react';\n` + content;
  }

  // Find component name
  const compMatch = content.match(/export function (\w+)\(\) \{/);
  if (!compMatch) continue;
  const compName = compMatch[1];

  // Insert useRef and useReactToPrint
  if (!content.includes("const printRef = useRef")) {
    content = content.replace(
      `export function ${compName}() {`,
      `export function ${compName}() {\n  const printRef = useRef<HTMLDivElement>(null);\n  const handlePrint = useReactToPrint({ contentRef: printRef });\n`
    );
  }

  // Insert ref={printRef}
  if (!content.includes("ref={printRef}")) {
    content = content.replace(
      `<div className="page-container"`,
      `<div ref={printRef} className="page-container"`
    );
  }

  // Update header layout
  content = content.replace(
    `borderRadius: 'var(--border-radius-lg)' }}`,
    `borderRadius: 'var(--border-radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}`
  );

  // Insert button before </header>
  if (!content.includes("Print / PDF")) {
    content = content.replace(
      `</header>`,
      `  <button onClick={() => handlePrint()} className="btn-secondary no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>\n          <FileText size={16} /> Print / PDF\n        </button>\n      </header>`
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated ' + page);
}
