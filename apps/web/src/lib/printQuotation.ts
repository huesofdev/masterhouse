interface CartItem {
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_input?: string;
}

export function printQuotationDocument(
  cart: CartItem[],
  customer: any | null,
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    grandTotal: number;
    taxes: any[];
  },
  settings: any,
  branch?: any,
  referenceNumber?: string
) {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const quoteRef = referenceNumber || `DRAFT-QT-${Date.now().toString().slice(-6)}`;
  const validityDays = parseInt(settings?.quotation_validity_days || '30', 10);
  const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const companyName = settings?.company_name || 'MASTER-H';
  const companyLogo = settings?.company_logo_signed_url || '';
  const branchName  = branch?.name || '';
  const branchAddr  = branch?.address || '';
  const branchPhone = branch?.phones && branch.phones.length > 0 ? branch.phones.map((p: any) => p.phone_number).join(', ') : '';

  // Build logo HTML
  const logoHtml = companyLogo
    ? `<img src="${companyLogo}" alt="Logo" style="height:70px;width:auto;object-fit:contain;display:block;" />`
    : `<div style="width:70px;height:70px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#374151;">${companyName.charAt(0)}</div>`;

  // Build items rows
  let itemsHtml = '';
  cart.forEach((item, index) => {
    const lineTotal = item.quantity * item.unit_price;
    let itemDiscount = 0;
    if (item.discount_input) {
      if (item.discount_input.endsWith('%')) {
        const pct = parseFloat(item.discount_input.replace('%', '')) || 0;
        itemDiscount = (lineTotal * pct) / 100;
      } else if (item.discount_input.startsWith('*')) {
        const val = parseFloat(item.discount_input.replace('*', '')) || 0;
        itemDiscount = val * item.quantity;
      } else {
        itemDiscount = parseFloat(item.discount_input) || 0;
      }
    }
    const finalLineTotal = lineTotal - itemDiscount;
    const rowBg = index % 2 === 0 ? '#ffffff' : '#f9fafb';

    itemsHtml += `
      <tr style="background:${rowBg};">
        <td style="padding:10px 12px;text-align:center;color:#6b7280;font-size:12px;">${index + 1}</td>
        <td style="padding:10px 12px;">
          <div style="font-weight:600;color:#111827;font-size:13px;">${item.name}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px;">SKU: ${item.sku}</div>
        </td>
        <td style="padding:10px 12px;text-align:center;font-size:13px;color:#374151;">${item.quantity}</td>
        <td style="padding:10px 12px;text-align:right;font-size:13px;color:#374151;">Rs. ${item.unit_price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
        <td style="padding:10px 12px;text-align:right;font-size:13px;color:${itemDiscount>0?'#dc2626':'#9ca3af'};">${itemDiscount>0?'- Rs. '+itemDiscount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'—'}</td>
        <td style="padding:10px 12px;text-align:right;font-size:13px;font-weight:700;color:#111827;">Rs. ${finalLineTotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      </tr>`;
  });

  // Build taxes rows in summary
  let taxRowsHtml = '';
  if (totals.taxes && totals.taxes.length > 0) {
    totals.taxes.forEach(tax => {
      taxRowsHtml += `
        <tr>
          <td style="padding:5px 0;font-size:12px;color:#6b7280;">${tax.name} (${tax.rate}%) ${tax.type === 'INCLUSIVE' ? '[Incl.]' : ''}</td>
          <td style="padding:5px 0;text-align:right;font-size:12px;color:#374151;">Rs. ${tax.amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
        </tr>`;
    });
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Quotation – ${quoteRef}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 18mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; font-size: 13px; line-height: 1.5; background: #fff; }

    /* ── HEADER ── */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #111827; margin-bottom: 24px; }
    .company-info { display: flex; align-items: center; gap: 14px; }
    .company-text h1 { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
    .company-text p  { font-size: 11px; color: #6b7280; margin-top: 2px; line-height: 1.6; }
    .doc-meta { text-align: right; }
    .doc-meta .doc-title { font-size: 28px; font-weight: 900; color: #111827; letter-spacing: 2px; text-transform: uppercase; }
    .doc-meta .doc-ref   { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .doc-meta .doc-date  { font-size: 12px; color: #374151; margin-top: 2px; }

    /* ── ACCENT BAR ── */
    .accent-bar { height: 4px; background: linear-gradient(90deg, #f59e0b, #f97316); border-radius: 4px; margin-bottom: 24px; }

    /* ── BILL TO + VALIDITY ── */
    .info-row { display: flex; gap: 20px; margin-bottom: 24px; }
    .info-box { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
    .info-box h3 { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .info-box .val-name { font-size: 15px; font-weight: 700; color: #111827; }
    .info-box .val-sub  { font-size: 12px; color: #6b7280; margin-top: 3px; line-height: 1.6; }
    .validity-box { background: #fffbeb; border: 1px solid #fcd34d; }
    .validity-box .label { font-size: 11px; color: #92400e; margin-bottom: 3px; }
    .validity-box .date  { font-size: 16px; font-weight: 700; color: #92400e; }

    /* ── ITEMS TABLE ── */
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
    thead tr { background: #111827; }
    thead th { padding: 11px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #f9fafb; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th:not(:first-child):not(:nth-child(2)) { text-align: right; }
    thead th:first-child { text-align: center; width: 40px; }
    thead th:nth-child(3) { text-align: center; width: 60px; }
    tbody tr:last-child td { border-bottom: none; }
    tbody td { border-bottom: 1px solid #f3f4f6; }

    /* ── TOTALS ── */
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 30px; }
    .totals-table { width: 280px; }
    .totals-table td { padding: 5px 0; font-size: 12px; }
    .totals-table td:last-child { text-align: right; }
    .totals-divider { border: none; border-top: 1px solid #e5e7eb; margin: 8px 0; }
    .grand-total-row td { font-size: 16px; font-weight: 800; color: #111827; padding-top: 10px !important; }
    .grand-total-row td:last-child { color: #f59e0b; }

    /* ── NOTES ── */
    .notes { background: #f9fafb; border-left: 3px solid #f59e0b; border-radius: 0 6px 6px 0; padding: 12px 14px; margin-bottom: 30px; font-size: 11px; color: #6b7280; line-height: 1.7; }
    .notes strong { color: #374151; }

    /* ── SIGNATURES ── */
    .sig-section { display: flex; gap: 40px; margin-top: 10px; }
    .sig-box { flex: 1; }
    .sig-line { border-top: 1.5px solid #374151; margin-top: 50px; padding-top: 6px; }
    .sig-label { font-size: 11px; color: #374151; font-weight: 600; }
    .sig-sub   { font-size: 10px; color: #9ca3af; margin-top: 2px; }

    /* ── FOOTER ── */
    .footer { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center; font-size: 10px; color: #9ca3af; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="company-info">
      ${logoHtml}
      <div class="company-text">
        <h1>${companyName}</h1>
        <p>
          ${branchName ? branchName + '<br/>' : ''}
          ${branchAddr ? branchAddr + '<br/>' : ''}
          ${branchPhone ? 'Tel: ' + branchPhone : ''}
        </p>
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">Quotation</div>
      <div class="doc-ref">Ref # ${quoteRef}</div>
      <div class="doc-date">Date: ${dateStr}</div>
    </div>
  </div>

  <!-- ACCENT BAR -->
  <div class="accent-bar"></div>

  <!-- BILL TO + VALIDITY -->
  <div class="info-row">
    <div class="info-box">
      <h3>Bill To</h3>
      ${customer ? `
        <div class="val-name">${customer.full_name}</div>
        <div class="val-sub">
          ${customer.mobile ? 'Tel: ' + customer.mobile + '<br/>' : ''}
          ${customer.nic ? 'NIC: ' + customer.nic + '<br/>' : ''}
          ${customer.address ? customer.address : ''}
        </div>
      ` : `<div class="val-name" style="color:#9ca3af;">Walk-in Customer</div>`}
    </div>
    <div class="info-box" style="max-width:220px;">
      <h3>Quotation Details</h3>
      <div class="val-sub">
        <strong>Ref:</strong> ${quoteRef}<br/>
        <strong>Date:</strong> ${dateStr}<br/>
        <strong>Valid Until:</strong> ${validUntil}
      </div>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item Description</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Discount</th>
        <th style="text-align:right;">Line Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <!-- TOTALS -->
  <div class="totals-section">
    <table class="totals-table">
      <tr>
        <td style="color:#6b7280;">Subtotal</td>
        <td>Rs. ${totals.subtotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      </tr>
      ${totals.discount > 0 ? `
      <tr>
        <td style="color:#dc2626;">Discount</td>
        <td style="color:#dc2626;">- Rs. ${totals.discount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      </tr>` : ''}
      ${taxRowsHtml}
      <tr><td colspan="2"><hr class="totals-divider"/></td></tr>
      <tr class="grand-total-row">
        <td>Grand Total</td>
        <td>Rs. ${totals.grandTotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      </tr>
    </table>
  </div>

  <!-- NOTES -->
  <div class="notes">
    <strong>Terms & Conditions:</strong><br/>
    <div style="white-space: pre-line; margin-top: 4px;">
      ${settings?.quotation_terms || `• This quotation is valid for ${validityDays} days from the date of issue.\n• Prices are subject to change after the validity period.\n• This document is not a tax invoice. A formal invoice will be issued upon confirmation.`}
    </div>
  </div>

  <!-- SIGNATURES -->
  <div class="sig-section">
    <div class="sig-box" style="flex: 0 0 200px;">
      <div class="sig-line">
        <div class="sig-label">Authorized Signatory</div>
        <div class="sig-sub">${companyName}</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    Thank you for your business — ${companyName}
    ${branchPhone ? ' &nbsp;|&nbsp; ' + branchPhone : ''}
  </div>

</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 600);
  }
}
