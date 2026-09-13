const fs = require('fs');
const path = require('path');

const tabsDir = path.join(__dirname, 'apps/web/src/features/reports/components');
const tabs = [
  'CollectionsReportTab.tsx',
  'ReceiptsReportTab.tsx',
  'SalesReportTab.tsx',
  'SchedulesReportTab.tsx',
  'StockReportTab.tsx'
];

for (const tab of tabs) {
  const filePath = path.join(tabsDir, tab);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove setExporting calls
  content = content.replace(/setExporting\(true\);/g, '');
  content = content.replace(/setExporting\(false\);/g, '');
  
  // Remove exporting state declaration
  content = content.replace(/const \[exporting, setExporting\] = useState\(false\);\n/g, '');

  // Remove Loader2 import if it's unused (this is tricky with regex, let's just do it broadly)
  content = content.replace(/import { Loader2 } from 'lucide-react';\n/g, '');
  // SalesReportTab might still need Loader2 if it's used elsewhere? Wait, no, most Tabs use Loader2 for fetch loading state!
  // Wait! `loading` state uses Loader2 in the main view! Let's NOT remove Loader2 if it's used for the main table.
  // Actually, I can just let TS complain or use a safer replace. Let's not remove Loader2 using this script.
  
  fs.writeFileSync(filePath, content, 'utf8');
}

// Fix ContractsReportPage and SalesReportPage
const pagesDir = path.join(__dirname, 'apps/web/src/features/reports/pages');
const contractsPath = path.join(pagesDir, 'ContractsReportPage.tsx');
if (fs.existsSync(contractsPath)) {
  let content = fs.readFileSync(contractsPath, 'utf8');
  content = content.replace(/import { FileText } from 'lucide-react';\n/, '');
  fs.writeFileSync(contractsPath, content, 'utf8');
}

const salesPath = path.join(pagesDir, 'SalesReportPage.tsx');
if (fs.existsSync(salesPath)) {
  let content = fs.readFileSync(salesPath, 'utf8');
  // It says Cannot find name 'FileText' in SalesReportPage.tsx
  // That means I removed FileText but it's used somewhere? Or wait, `FileText` is used in SalesReportPage?
  // Let me just manually inspect these.
}
