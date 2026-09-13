import type { TripAgreementsData, TripAgreement } from '../api';

export function generateTripAgreementsHtml(data: TripAgreementsData): string {
  const { company, branch, trip, agreements } = data;

  const agreementPagesHtml = agreements.map((agreement: TripAgreement) => {
    const { sale, contract, customer, guarantor } = agreement;
    const items = sale.items || [];
    const schedules = contract.schedules || [];
    
    // Split schedules into 2 columns for compact vertical height
    const midPoint = Math.ceil(schedules.length / 2);
    const col1 = schedules.slice(0, midPoint);
    const col2 = schedules.slice(midPoint);

    const formatCurrency = (val: string | number) => 
      Number(val || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const formatDate = (d: string) => {
      try {
        return new Date(d).toLocaleDateString('en-GB');
      } catch (e) {
        return d;
      }
    };

    return `
      <div class="agreement-page">
        <!-- Formal Letterhead / Document Header (No Logo) -->
        <div class="doc-header">
          <div class="header-titles">
            <div class="company-title">${company.name || 'MASTER-H (PVT) LTD'}</div>
            <div class="company-sub">
              ${branch.name ? `${branch.name} • ` : ''}
              ${branch.address ? `${branch.address} • ` : ''}
              ${branch.phones?.length ? `Tel: ${branch.phones.join(' / ')}` : ''}
            </div>
          </div>
          
          <div class="doc-divider"></div>
          
          <div class="agreement-main-title">HIRE PURCHASE AGREEMENT & CONTRACT</div>
          
          <div class="meta-strip">
            <div><strong>Agreement Ref:</strong> ${contract.id.slice(0, 13).toUpperCase()}</div>
            <div><strong>Invoice No:</strong> ${sale.reference_number}</div>
            <div><strong>Date:</strong> ${formatDate(sale.created_at)}</div>
            <div><strong>Route / Officer:</strong> ${trip.route_name} (${sale.creator_name})</div>
          </div>
        </div>

        <!-- Section 1: The Parties (Formal Table) -->
        <div class="doc-section">
          <div class="section-heading">1. PARTIES TO THIS AGREEMENT</div>
          <table class="parties-table">
            <tr>
              <td class="party-col" style="border-right: 1px solid #000; width: 50%;">
                <div class="party-title">HIRER (CUSTOMER / BORROWER)</div>
                ${customer ? `
                  <div class="data-row"><span class="lbl">Full Name:</span> <span class="val bold">${customer.full_name}</span></div>
                  <div class="data-row"><span class="lbl">NIC / Reg No:</span> <span class="val bold">${customer.nic}</span></div>
                  <div class="data-row"><span class="lbl">Contact Tel:</span> <span class="val">${customer.mobile}</span></div>
                  <div class="data-row"><span class="lbl">Address:</span> <span class="val">${customer.address}</span></div>
                ` : '<div class="data-row italic">Hirer information not recorded</div>'}
              </td>
              <td class="party-col" style="width: 50%;">
                <div class="party-title">GUARANTOR (SURETY)</div>
                ${guarantor ? `
                  <div class="data-row"><span class="lbl">Full Name:</span> <span class="val bold">${guarantor.full_name}</span></div>
                  <div class="data-row"><span class="lbl">NIC No:</span> <span class="val bold">${guarantor.nic}</span></div>
                  <div class="data-row"><span class="lbl">Contact Tel:</span> <span class="val">${guarantor.mobile}</span></div>
                  <div class="data-row"><span class="lbl">Address:</span> <span class="val">${guarantor.address}</span></div>
                ` : '<div class="data-row italic">No guarantor required for this contract</div>'}
              </td>
            </tr>
          </table>
        </div>

        <!-- Section 2: Particulars of Goods / Collateral -->
        <div class="doc-section">
          <div class="section-heading">2. DESCRIPTION OF GOODS (PURCHASED EQUIPMENT)</div>
          <table class="formal-table">
            <thead>
              <tr>
                <th style="width: 48%;">Item Description / Model</th>
                <th style="width: 25%;">Serial Number (S/N)</th>
                <th style="width: 12%;">Warranty</th>
                <th style="width: 5%; text-align: center;">Qty</th>
                <th style="width: 10%; text-align: right;">Total (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td class="bold">${item.product_name}</td>
                  <td style="font-family: monospace; font-size: 8pt;">${item.serial_number || 'N/A'}</td>
                  <td>${item.warranty_type && item.warranty_type !== 'NONE' ? `${item.warranty_type === 'WARRANTY' ? 'War.' : 'Guar.'} ${item.warranty_period_years ? `${item.warranty_period_years}Y ` : ''}${item.warranty_period_months ? `${item.warranty_period_months}M` : ''}` : 'N/A'}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;" class="bold">${formatCurrency(item.line_total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Section 3: Financial Statement -->
        <div class="doc-section">
          <div class="section-heading">3. STATEMENT OF ACCOUNT & PAYMENT TERMS</div>
          <table class="formal-table fin-table">
            <tbody>
              <tr>
                <td style="width: 20%;"><span class="lbl">Total Cash Price:</span> <span class="bold">Rs. ${formatCurrency(sale.total)}</span></td>
                <td style="width: 20%;"><span class="lbl">Downpayment Paid:</span> <span class="bold">Rs. ${formatCurrency(contract.downpayment)}</span></td>
                <td style="width: 20%;"><span class="lbl">Principal Financed:</span> <span class="bold">Rs. ${formatCurrency(contract.principal)}</span></td>
                <td style="width: 15%;"><span class="lbl">Interest Rate:</span> <span class="bold">${Number(contract.interest_rate || 0).toFixed(1)}%</span></td>
                <td style="width: 25%;"><span class="lbl">Terms / Period:</span> <span class="bold">${contract.terms} (${contract.schedule_frequency})</span></td>
              </tr>
              <tr>
                <td colspan="3" style="background: #f4f4f4;">
                  <strong>Payment Mode:</strong> ${sale.payment_mode || 'CASH'} &nbsp;|&nbsp; <strong>Scheme:</strong> ${contract.scheme_name}
                </td>
                <td colspan="2" style="background: #f4f4f4; text-align: right;">
                  <span style="font-size: 9pt; font-weight: bold; text-transform: uppercase;">Total Balance Payable: &nbsp; Rs. ${formatCurrency(contract.balance)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Section 4: Repayment Schedule -->
        <div class="doc-section">
          <div class="section-heading">4. SCHEDULE OF REPAYMENT INSTALLMENTS (${schedules.length} Installments)</div>
          <div class="dual-sched-container">
            <table class="formal-table sched-sub-table">
              <thead>
                <tr>
                  <th style="width: 20%;">Inst #</th>
                  <th style="width: 45%;">Due Date</th>
                  <th style="width: 35%; text-align: right;">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                ${col1.map(s => `
                  <tr>
                    <td class="bold" style="text-align: center;">#${s.installment_number}</td>
                    <td>${formatDate(s.due_date)}</td>
                    <td style="text-align: right;" class="bold">${formatCurrency(s.amount_due)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            ${col2.length > 0 ? `
              <table class="formal-table sched-sub-table">
                <thead>
                  <tr>
                    <th style="width: 20%;">Inst #</th>
                    <th style="width: 45%;">Due Date</th>
                    <th style="width: 35%; text-align: right;">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  ${col2.map(s => `
                    <tr>
                      <td class="bold" style="text-align: center;">#${s.installment_number}</td>
                      <td>${formatDate(s.due_date)}</td>
                      <td style="text-align: right;" class="bold">${formatCurrency(s.amount_due)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<div style="flex: 1;"></div>'}
          </div>
        </div>

        <!-- Section 5: Legal Declaration -->
        <div class="declaration-text">
          <strong>DECLARATION & COVENANTS:</strong> I/We, the undersigned Hirer and Guarantor, hereby jointly and severally declare that we have entered into this Hire Purchase Agreement freely. We acknowledge receipt of the goods specified above in good order and working condition, and covenant to pay the installments on or before their respective due dates. We understand and agree that the title and ownership of the goods remain exclusively with <strong>${company.name || 'the Owner'}</strong> until all installments and dues under this Agreement are settled in full.
        </div>

        <!-- Section 6: Signatures Block -->
        <div class="signatures-block">
          <div class="sig-col">
            <div class="sig-image-container">
              ${contract.signature_signed_url ? `<img src="${contract.signature_signed_url}" class="sig-image" alt="Customer Signature" />` : ''}
            </div>
            <div class="sig-line"></div>
            <div class="sig-title">SIGNATURE OF HIRER</div>
            <div class="sig-name">${customer?.full_name || 'Customer'}</div>
            <div class="sig-date">Date: ${formatDate(sale.created_at)}</div>
          </div>

          <div class="sig-col">
            <div class="sig-image-container">
              ${contract.guarantor_signature_signed_url ? `<img src="${contract.guarantor_signature_signed_url}" class="sig-image" alt="Guarantor Signature" />` : ''}
            </div>
            <div class="sig-line"></div>
            <div class="sig-title">SIGNATURE OF GUARANTOR</div>
            <div class="sig-name">${guarantor?.full_name || 'Guarantor'}</div>
            <div class="sig-date">Date: ${formatDate(sale.created_at)}</div>
          </div>

          <div class="sig-col">
            <div class="sig-image-container">
              <div style="font-size: 7.5pt; color: #888; text-transform: uppercase;">Official Attestation</div>
            </div>
            <div class="sig-line"></div>
            <div class="sig-title">FOR & ON BEHALF OF OWNER</div>
            <div class="sig-name">${sale.creator_name}</div>
            <div class="sig-date">Date: ${formatDate(sale.created_at)}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Hire Purchase Agreements - Trip ${trip.id.slice(0, 8)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 1in;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: "Times New Roman", Times, Georgia, serif;
            font-size: 8.5pt;
            line-height: 1.25;
            color: #000000;
            background: #525659;
            margin: 0;
            padding: 20px 0;
          }
          .agreement-page {
            width: 210mm;
            min-height: 297mm;
            max-height: 297mm;
            margin: 0 auto 20px auto;
            background: #ffffff;
            padding: 20mm 20mm 20mm 20mm;
            box-shadow: 0 4px 16px rgba(0,0,0,0.35);
            page-break-after: always;
            break-after: page;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          @media print {
            body {
              background: #ffffff;
              padding: 0;
            }
            .agreement-page {
              width: 100% !important;
              max-width: 100% !important;
              min-height: 100% !important;
              max-height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
            .no-print {
              display: none !important;
            }
          }
          
          /* Formal Header */
          .doc-header {
            text-align: center;
            margin-bottom: 16px;
          }
          .header-titles {
            text-align: center;
          }
          .company-title {
            font-size: 14pt;
            font-weight: bold;
            letter-spacing: 0.6px;
            text-transform: uppercase;
          }
          .company-sub {
            font-size: 8.5pt;
            font-style: italic;
            color: #222;
            margin-top: 2px;
          }
          .doc-divider {
            border-bottom: 2px solid #000;
            border-top: 1px solid #000;
            height: 3px;
            margin: 8px 0 8px 0;
          }
          .agreement-main-title {
            font-size: 11pt;
            font-weight: bold;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .meta-strip {
            display: flex;
            justify-content: space-between;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 5px 10px;
            font-size: 8pt;
            background: #fafafa;
            margin-top: 4px;
          }

          /* Sections & Tables */
          .doc-section {
            margin-bottom: 16px;
          }
          .section-heading {
            font-size: 8.5pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 5px;
            border-bottom: 1px solid #333;
            padding-bottom: 2px;
          }
          .parties-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
          }
          .party-col {
            padding: 6px 10px;
            vertical-align: top;
            font-size: 8pt;
          }
          .party-title {
            font-size: 8pt;
            font-weight: bold;
            text-decoration: underline;
            margin-bottom: 4px;
          }
          .data-row {
            display: flex;
            margin-bottom: 3px;
            line-height: 1.3;
          }
          .data-row .lbl {
            width: 80px;
            font-weight: normal;
            color: #333;
            flex-shrink: 0;
          }
          .data-row .val {
            flex: 1;
            word-break: break-word;
          }
          .bold {
            font-weight: bold;
          }
          .italic {
            font-style: italic;
            color: #666;
          }

          /* Formal Tables */
          .formal-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            font-size: 8pt;
          }
          .formal-table th {
            border: 1px solid #000;
            background: #f0f0f0;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 7.5pt;
            padding: 3.5px 6px;
            text-align: left;
          }
          .formal-table td {
            border: 1px solid #000;
            padding: 3.5px 6px;
            font-size: 8pt;
          }
          .fin-table td {
            padding: 5px 8px;
            font-size: 8pt;
          }
          .fin-table .lbl {
            font-size: 7.5pt;
            color: #444;
            display: block;
            margin-bottom: 1px;
          }

          /* Dual Schedules */
          .dual-sched-container {
            display: flex;
            gap: 12px;
          }
          .sched-sub-table {
            flex: 1;
          }

          /* Declaration */
          .declaration-text {
            font-size: 7.5pt;
            line-height: 1.35;
            text-align: justify;
            border: 1px solid #000;
            padding: 7px 10px;
            background: #fafafa;
            margin: 12px 0;
          }

          /* Signatures */
          .signatures-block {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid #000;
          }
          .sig-col {
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .sig-image-container {
            height: 58px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            width: 100%;
            margin-bottom: 4px;
            background: transparent;
          }
          .sig-image {
            max-height: 56px;
            max-width: 175px;
            object-fit: contain;
            mix-blend-mode: multiply;
            background: transparent;
          }
          .sig-line {
            width: 85%;
            border-bottom: 1px solid #000;
            margin-bottom: 3px;
          }
          .sig-title {
            font-size: 7.5pt;
            font-weight: bold;
            text-transform: uppercase;
          }
          .sig-name {
            font-size: 7.5pt;
            margin-top: 1px;
          }
          .sig-date {
            font-size: 7pt;
            color: #555;
          }
        </style>
      </head>
      <body>
        ${agreementPagesHtml}
      </body>
    </html>
  `;
}

export function openTripAgreementsPrintWindow(data: TripAgreementsData) {
  if (!data.agreements || data.agreements.length === 0) {
    alert("No installment sales agreements found for this trip.");
    return;
  }

  const html = generateTripAgreementsHtml(data);

  // Remove any previous print iframe
  const existingIframe = document.getElementById('print-agreements-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Create a hidden iframe for direct native Chrome printing
  const iframe = document.createElement('iframe');
  iframe.id = 'print-agreements-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc && iframe.contentWindow) {
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow.focus();
    
    // Allow signatures and CSS styles to render before triggering direct print
    setTimeout(() => {
      iframe.contentWindow?.print();
    }, 500);
  }
}
