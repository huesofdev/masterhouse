import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { db } from '../db';
import { settings } from '../db/schema';

import AsyncStorage from '@react-native-async-storage/async-storage';

// Dynamic CSS for 58mm and 80mm thermal receipt printers
const getCss = async () => {
  const size = await AsyncStorage.getItem('printerPaperSize') || '80mm';
  const is58 = size === '58mm';
  const css = `
    @page { margin: 0; }
    body { 
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: ${is58 ? '13px' : '15px'};
      margin: 0; 
      padding: ${is58 ? '10px' : '20px'}; 
      width: ${is58 ? '58mm' : '80mm'}; 
      color: #000 !important;
      font-weight: 900 !important;
      letter-spacing: 0.3px;
      -webkit-font-smoothing: none;
      text-rendering: optimizeSpeed;
    }
    table { width: 100%; border-collapse: collapse; color: #000 !important; font-weight: 900 !important; }
    th, td { text-align: left; padding: 2px; color: #000 !important; font-weight: 900 !important; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 900 !important; }
    .divider { border-bottom: 2px dashed #000; margin: ${is58 ? '5px 0' : '10px 0'}; }
    h2, h3, h4, div, p, span, small { color: #000 !important; font-weight: 900 !important; }
    small { font-size: ${is58 ? '11px' : '13px'} !important; font-weight: 900 !important; }
    .item-row { margin-bottom: 4px; }
    th { border-bottom: 2px dashed #000; padding-bottom: 4px; }
    .logo { max-width: ${is58 ? '100px' : '150px'}; max-height: ${is58 ? '60px' : '80px'}; margin: 0 auto ${is58 ? '5px' : '10px'}; display: block; filter: contrast(200%) grayscale(100%); background-color: white; object-fit: contain; }
    .amt { text-align: right; min-width: ${is58 ? '40px' : '60px'}; white-space: nowrap; }
    .header { margin-bottom: 10px; font-size: ${is58 ? '13px' : '15px'}; font-weight: 900 !important; }
    .footer { margin-top: 15px; text-align: center; font-size: ${is58 ? '11px' : '13px'}; font-weight: 900 !important; }
  `;
  return { css, size };
};

export class PrintService {
  
  static async getSettings() {
    try {
      const s = await db.select().from(settings).limit(1);
      if (s.length > 0) {
        const result = { ...s[0] };
        if (result.companyLogoUri && result.companyLogoUri.startsWith('file://')) {
          try {
            const ext = result.companyLogoUri.split('.').pop()?.toLowerCase() || 'png';
            const mimeType = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : (ext === 'webp' ? 'image/webp' : 'image/png');
            const base64 = await FileSystem.readAsStringAsync(result.companyLogoUri, { encoding: FileSystem.EncodingType.Base64 });
            result.companyLogoUri = `data:${mimeType};base64,${base64}`;
          } catch(e) {
            console.warn("PrintService: Failed to convert logo to base64", e);
          }
        }
        return result;
      }
    } catch (e) {
      console.warn("PrintService: Could not load settings");
    }
    return {
      companyName: 'Lushanth Pvt Ltd',
      companyLogoUri: null,
      branchName: 'Main Branch',
      branchAddress: '',
      branchPhone: '',
    };
  }

  static getHeaderHTML(s: any) {
    return `
      <div class="header center">
        ${s.companyLogoUri ? `<img src="${s.companyLogoUri}" class="logo" />` : ''}
        <div class="bold" style="font-size: 18px;">${s.companyName || 'Company Name'}</div>
        <div>${s.branchName || ''}</div>
        ${s.branchAddress ? `<div>${s.branchAddress}</div>` : ''}
        ${s.branchPhone ? `<div>Tel: ${s.branchPhone}</div>` : ''}
      </div>
    `;
  }

  static getRepHTML() {
    try {
      const { useAuthStore } = require('../store/useAuthStore');
      const user = useAuthStore.getState().user;
      if (!user) return '';
      const name = user.name || '';
      const phone = user.phone_number || (user as any).phone || (user as any).mobile || '';
      if (!name && !phone) return '';
      let html = '';
      if (name) html += `<div>Rep: ${name}</div>`;
      if (phone) html += `<div>Rep Tel: ${phone}</div>`;
      return html;
    } catch (e) {
      return '';
    }
  }

  static async printSaleReceipt(
    saleId: string, 
    customerName: string, 
    saleType: string, 
    items: any[], 
    subtotal: number, 
    discount: number, 
    downpayment: number, 
    grossTotal: number,
    appliedTaxes: any = [],
    scheme?: any,
    bookingDeposit: number = 0,
    partialDownpaymentRecoveryDate?: string | null
  ) {
    const s = await this.getSettings();
    const date = new Date().toLocaleString();

    // Calculate interest & total payable for installment receipts
    let interestAmount = 0;
    let totalPayableWithInterest = grossTotal;
    if (saleType === 'INSTALLMENT' && scheme) {
      const minPercent = parseFloat(scheme.minDownpaymentPercent || scheme.min_downpayment_percent || 0);
      const requiredDownpayment = items.reduce((sum, item) => {
        const flatDp = (item.minDownpaymentAmount || 0) * item.qty;
        const baseLineTotal = item.qty * item.price;
        let actualDiscount = 0;
        if (item.discountAmount && item.discountAmount > 0) {
          actualDiscount = item.discountAmount;
        } else if (item.discountInput) {
          if (item.discountInput.endsWith('%')) {
            const pct = parseFloat(item.discountInput.replace('%', '')) || 0;
            actualDiscount = (baseLineTotal * pct) / 100;
          } else if (item.discountInput.startsWith('*')) {
            const val = parseFloat(item.discountInput.replace('*', '')) || 0;
            actualDiscount = val * item.qty;
          } else {
            actualDiscount = parseFloat(item.discountInput) || 0;
          }
        }
        const lineTotal = baseLineTotal - actualDiscount;
        const schemeDp = (lineTotal * minPercent) / 100;
        return sum + Math.max(flatDp, schemeDp);
      }, 0);
      
      const effectiveDp = downpayment < requiredDownpayment ? requiredDownpayment : downpayment;
      const principal = grossTotal - effectiveDp;
      interestAmount = principal * (parseFloat(scheme.interestRate || scheme.interest_rate || 0) / 100);
      totalPayableWithInterest = grossTotal + interestAmount;
    }

    let itemsHtml = items.map(i => {
      const lineTotal = i.qty * i.price;
      
      // Use pre-computed, clamped discount amounts if provided by checkout
      let itemDiscount = i.computedDiscountAmount !== undefined ? i.computedDiscountAmount : 0;
      let finalLineAmt = i.computedLineTotal !== undefined ? i.computedLineTotal : (lineTotal - itemDiscount);
      let discountLabel = '';
      
      if (itemDiscount > 0) {
        if (i.discountInput && i.discountInput.endsWith('%')) {
          discountLabel = `(-${parseFloat(i.discountInput)}%)`;
        } else if (i.discountInput && i.discountInput.startsWith('*')) {
          discountLabel = `(-${parseFloat(i.discountInput.replace('*', ''))}/ea)`;
        } else {
          discountLabel = `(-Rs. ${itemDiscount.toLocaleString()})`;
        }
      }

      return `
      <tr>
        <td colspan="3">
          ${i.name}
          ${i.serialNumber ? `<br/><small style="font-weight:900;color:#000;">SN: ${i.serialNumber}</small>` : ''}
          ${(() => {
            const wType = i.warrantyType || 'NONE';
            if (wType === 'NONE') return '';
            const totalMonths = ((i.warrantyYears || 0) * 12) + (i.warrantyMonths || 0);
            if (totalMonths <= 0) return '';
            const label = wType === 'GUARANTEE' ? 'Guarantee' : 'Warranty';
            let period = '';
            const yrs = Math.floor(totalMonths / 12);
            const mos = totalMonths % 12;
            if (yrs > 0 && mos > 0) period = `${yrs} Year${yrs > 1 ? 's' : ''} ${mos} Month${mos > 1 ? 's' : ''}`;
            else if (yrs > 0) period = `${yrs} Year${yrs > 1 ? 's' : ''}`;
            else period = `${mos} Month${mos > 1 ? 's' : ''}`;
            return `<br/><small style="font-weight:900;color:#000;">${label}: ${period}</small>`;
          })()}
        </td>
      </tr>
      <tr>
        <td>${i.qty}</td>
        <td>x ${i.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${itemDiscount > 0 ? `<br/><small style="color: #000; font-weight: bold;">Discount: ${discountLabel}</small>` : ''}</td>
        <td class="amt">${finalLineAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      `;
    }).join('');

    const { css, size } = await getCss();
    
    const taxesList = Array.isArray(appliedTaxes) ? appliedTaxes : [];
    const html = `
      <html>
        <head><style>${css}</style></head>
        <body>
          ${this.getHeaderHTML(s)}
          
          <div class="center bold" style="font-size: 16px; margin-bottom: 10px;">SALES RECEIPT</div>
          
          <div>Date: ${date}</div>
          <div>Receipt #: ${saleId.split('-')[0].toUpperCase()}</div>
          <div>Customer: ${customerName || 'Walk-in'}</div>
          <div>Type: ${saleType}</div>
          ${this.getRepHTML()}
          
          <div class="divider"></div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 20%;">Qty</th>
                <th style="width: 40%;">Price</th>
                <th class="amt" style="width: 40%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <table style="font-weight: bold;">
            <tr>
              <td>Subtotal</td>
              <td class="amt">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ${discount > 0 ? `
            <tr>
              <td>Discount</td>
              <td class="amt">- ${discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ` : ''}
            ${taxesList.length > 0 ? taxesList.map(t => `
            <tr style="font-size: 13px;">
              <td>${t.name} (${t.rate}%) ${t.type === 'INCLUSIVE' ? ' [Incl]' : ''}</td>
              <td class="amt">${t.type === 'EXCLUSIVE' ? '+' : ''} ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            `).join('') : ''}
            ${typeof appliedTaxes === 'number' && appliedTaxes > 0 ? `
            <tr>
              <td>Taxes</td>
              <td class="amt">${appliedTaxes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ` : ''}
             <tr style="font-size: 16px;">
              <td>GRAND TOTAL</td>
              <td class="amt">${(saleType === 'INSTALLMENT' ? totalPayableWithInterest : grossTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ${bookingDeposit > 0 ? `
            <tr style="font-size: 14px; color: #555;">
              <td>(Includes Booking Deposit)</td>
              <td class="amt">Rs. ${bookingDeposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ` : ''}
            ${saleType === 'INSTALLMENT' ? `
            <tr>
              <td>Amount Paid (Downpayment)</td>
              <td class="amt">${downpayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Remaining Balance</td>
              <td class="amt">${(totalPayableWithInterest - downpayment).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ` : ''}
          </table>

          ${(() => {
            if (saleType !== 'INSTALLMENT' || !scheme) return '';
            const minPercent = parseFloat(scheme.minDownpaymentPercent || scheme.min_downpayment_percent || 0);
            const requiredDownpayment = items.reduce((sum, item) => {
              const flatDp = (item.minDownpaymentAmount || 0) * item.qty;
              const baseLineTotal = item.qty * item.price;
              // Reconstruct discount from stored discountAmount/discountType fields
              let actualDiscount = 0;
              if (item.discountAmount && item.discountAmount > 0) {
                actualDiscount = item.discountAmount;
              } else if (item.discountInput) {
                if (item.discountInput.endsWith('%')) {
                  const pct = parseFloat(item.discountInput.replace('%', '')) || 0;
                  actualDiscount = (baseLineTotal * pct) / 100;
                } else if (item.discountInput.startsWith('*')) {
                  const val = parseFloat(item.discountInput.replace('*', '')) || 0;
                  actualDiscount = val * item.qty;
                } else {
                  actualDiscount = parseFloat(item.discountInput) || 0;
                }
              }
              const lineTotal = baseLineTotal - actualDiscount;
              const schemeDp = (lineTotal * minPercent) / 100;
              return sum + Math.max(flatDp, schemeDp);
            }, 0);
            const hasRecovery = downpayment < requiredDownpayment;

            const recoveryAmount = hasRecovery ? requiredDownpayment - downpayment : 0;
            const effectiveDp = hasRecovery ? requiredDownpayment : downpayment;
            const principal = grossTotal - effectiveDp;
            const interest = principal * (parseFloat(scheme.interestRate || scheme.interest_rate || 0) / 100);
            const installmentAmount = (principal + interest) / parseFloat(scheme.terms || 1);

            const formatPrintDate = (dateStr: string) => {
              const d = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
              const parts = d.split('-');
              if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
              return dateStr;
            };

            const recoveryDateLabel = (hasRecovery && partialDownpaymentRecoveryDate)
              ? ` (Due: ${formatPrintDate(partialDownpaymentRecoveryDate)})`
              : '';

            return `
              <div class="divider"></div>
              <div class="center">
                <div class="bold" style="font-size: 12px;">Installment Structure</div>
                ${hasRecovery ? `<div class="bold" style="margin-bottom: 2px; color: #000; font-weight: bold;">Downpayment Recovery: Rs. ${recoveryAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${recoveryDateLabel}</div>` : ''}
                <div class="bold">Rs. ${installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} X ${scheme.terms} ${scheme.frequency.toLowerCase()}s</div>
                <div class="bold" style="margin-top: 2px;">Next Due: ${
                  (() => {
                    const d = new Date();
                    if(scheme.frequency === 'MONTHLY') d.setMonth(d.getMonth() + 1);
                    else if(scheme.frequency === 'WEEKLY') d.setDate(d.getDate() + 7);
                    else if(scheme.frequency === 'DAILY') d.setDate(d.getDate() + 1);
                    return d.toLocaleDateString('en-GB');
                  })()
                }</div>
              </div>
            `;
          })()}
          
          <div class="divider"></div>
          
          <div class="footer">
            Thank you for your business!<br/>
            Please retain this receipt.<br/>
          </div>
        </body>
      </html>
    `;

    try {
      await Print.printAsync({ html });
    } catch (e) {
      console.warn("Print error", e);
    }
  }

  static async printCollectionReceipt(
    receiptNumber: string,
    customerName: string,
    amount: number,
    paymentMode: string,
    newBalance: number,
    contractId?: string
  ) {
    const s = await this.getSettings();
    const date = new Date().toLocaleString();

    let nextDueDate: string | null = null;
    let nextDueAmount: number | null = null;

    if (contractId) {
      try {
        const { installmentSchedules } = require('../db/schema');
        const { eq } = require('drizzle-orm');
        
        const schedulesList = await db.select()
          .from(installmentSchedules)
          .where(eq(installmentSchedules.contractId, contractId));

        const unpaid = schedulesList
          .filter((s: any) => s.status !== 'PAID' && s.status !== 'WAIVED')
          .sort((a: any, b: any) => a.dueDate < b.dueDate ? -1 : 1);

        if (unpaid.length > 0) {
          const nextSched = unpaid[0];
          nextDueDate = nextSched.dueDate;
          nextDueAmount = nextSched.amountDue - nextSched.amountPaid;
        }
      } catch (e) {
        console.warn("PrintService: Failed to query next due date", e);
      }
    }

    const formatPrintDate = (dateStr: string) => {
      const d = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const parts = d.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateStr;
    };

    const { css, size } = await getCss();
    const html = `
      <html>
        <head><style>${css}</style></head>
        <body>
          ${this.getHeaderHTML(s)}
          
          <div class="center bold" style="font-size: 16px; margin-bottom: 10px;">PAYMENT RECEIPT</div>
          
          <div>Date: ${date}</div>
          <div>Receipt #: ${receiptNumber}</div>
          <div>Customer: ${customerName}</div>
          ${this.getRepHTML()}
          
          <div class="divider"></div>
          
          <table style="font-size: 15px;">
            <tr>
              <td>Amount Paid:</td>
              <td class="amt bold">${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Payment Mode:</td>
              <td class="amt">${paymentMode}</td>
            </tr>
          </table>
          
          <div class="divider"></div>
          
          <table style="font-size: 14px;">
            <tr>
              <td>Remaining Balance:</td>
              <td class="amt bold">${newBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ${nextDueDate ? `
            <tr>
              <td>Next Due Date:</td>
              <td class="amt">${formatPrintDate(nextDueDate)}</td>
            </tr>
            ${nextDueAmount !== null ? `
            <tr>
              <td>Next Amount:</td>
              <td class="amt bold">Rs. ${nextDueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ` : ''}
            ` : ''}
          </table>

          <div class="divider"></div>
          
          <div class="footer">
            Thank you for your payment!<br/>
            Please retain this receipt.<br/>
          </div>
        </body>
      </html>
    `;
    try {
      await Print.printAsync({ html });
    } catch (e) {
      console.warn("Print error", e);
    }
  }

  static async printLastSale() {
    try {
      const { sales, saleItems, customers, products, tripStock } = require('../db/schema');
      const { desc, eq } = require('drizzle-orm');
      const { Alert } = require('react-native');

      const lastSaleArray = await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(1);
      if (lastSaleArray.length === 0) {
        Alert.alert('Not Found', 'No recent sales found to print.');
        return;
      }
      
      const lastSale = lastSaleArray[0];
      
      let customerName = 'Walk-in';
      if (lastSale.customerId) {
        const cust = await db.select().from(customers).where(eq(customers.id, lastSale.customerId)).limit(1);
        if (cust.length > 0) customerName = cust[0].name;
      }
      
      const rawItems = await db.select({
        qty: saleItems.qty,
        price: saleItems.unitPrice,
        name: products.name,
        serialNumber: tripStock.serialNumber,
        discountAmount: saleItems.discountAmount,
        discountType: saleItems.discountType,
        minDownpaymentAmount: products.minDownpaymentAmount,
        warrantyType: products.warrantyType,
        warrantyYears: products.warrantyYears,
        warrantyMonths: products.warrantyMonths,
      })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(tripStock, eq(saleItems.serialItemId, tripStock.serialItemId))
      .where(eq(saleItems.saleId, lastSale.id));
      
      let subtotal = 0;
      let discount = 0;
      rawItems.forEach((i: any) => {
        subtotal += (i.qty * i.price);
        discount += (i.discountAmount || 0);
      });
      
      const trueGrossTotal = Math.max(0, subtotal - discount);
      
      let scheme = null;
      if (lastSale.saleType === 'INSTALLMENT' && lastSale.schemeId) {
        const { installmentSchemes } = require('../db/schema');
        const sch = await db.select().from(installmentSchemes).where(eq(installmentSchemes.id, lastSale.schemeId)).limit(1);
        if (sch.length > 0) scheme = sch[0];
      }

      let bookingDeposit = 0;
      if (lastSale.preOrderId) {
        const { preOrders } = require('../db/schema');
        const po = await db.select().from(preOrders).where(eq(preOrders.id, lastSale.preOrderId)).limit(1);
        if (po.length > 0) bookingDeposit = po[0].advancePayment || 0;
      }

      let appliedTaxes: any = lastSale.taxAmount || 0;
      if (lastSale.taxDetails) {
        try {
          appliedTaxes = JSON.parse(lastSale.taxDetails);
        } catch (e) {}
      }

      await this.printSaleReceipt(
        lastSale.id,
        customerName,
        lastSale.saleType,
        rawItems as any[],
        subtotal,
        discount,
        lastSale.downpayment,
        trueGrossTotal,
        appliedTaxes,
        scheme,
        bookingDeposit,
        lastSale.partialDownpaymentRecoveryDate
      );
    } catch (e) {
      console.warn("Failed to print last sale", e);
    }
  }

  static async printSpecificSale(saleId: string) {
    try {
      const { sales, saleItems, customers, products, tripStock } = require('../db/schema');
      const { eq } = require('drizzle-orm');
      const { Alert } = require('react-native');

      const saleArray = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
      if (saleArray.length === 0) {
        Alert.alert('Not Found', 'Sale not found.');
        return;
      }
      
      const sale = saleArray[0];
      
      let customerName = 'Walk-in';
      if (sale.customerId) {
        const cust = await db.select().from(customers).where(eq(customers.id, sale.customerId)).limit(1);
        if (cust.length > 0) customerName = cust[0].name;
      }
      
      const rawItems = await db.select({
        qty: saleItems.qty,
        price: saleItems.unitPrice,
        name: products.name,
        serialNumber: tripStock.serialNumber,
        discountAmount: saleItems.discountAmount,
        discountType: saleItems.discountType,
        minDownpaymentAmount: products.minDownpaymentAmount,
        warrantyType: products.warrantyType,
        warrantyYears: products.warrantyYears,
        warrantyMonths: products.warrantyMonths,
      })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(tripStock, eq(saleItems.serialItemId, tripStock.serialItemId))
      .where(eq(saleItems.saleId, sale.id));
      
      let subtotal = 0;
      let discount = 0;
      rawItems.forEach((i: any) => {
        subtotal += (i.qty * i.price);
        discount += (i.discountAmount || 0);
      });
      
      const trueGrossTotal = Math.max(0, subtotal - discount);
      
      let scheme = null;
      if (sale.saleType === 'INSTALLMENT' && sale.schemeId) {
        const { installmentSchemes } = require('../db/schema');
        const sch = await db.select().from(installmentSchemes).where(eq(installmentSchemes.id, sale.schemeId)).limit(1);
        if (sch.length > 0) scheme = sch[0];
      }

      let bookingDeposit = 0;
      if (sale.preOrderId) {
        const { preOrders } = require('../db/schema');
        const po = await db.select().from(preOrders).where(eq(preOrders.id, sale.preOrderId)).limit(1);
        if (po.length > 0) bookingDeposit = po[0].advancePayment || 0;
      }

      let appliedTaxes: any = sale.taxAmount || 0;
      if (sale.taxDetails) {
        try {
          appliedTaxes = JSON.parse(sale.taxDetails);
        } catch (e) {}
      }

      await this.printSaleReceipt(
        sale.id,
        customerName,
        sale.saleType,
        rawItems as any[],
        subtotal,
        discount,
        sale.downpayment,
        trueGrossTotal,
        appliedTaxes,
        scheme,
        bookingDeposit,
        sale.partialDownpaymentRecoveryDate
      );
    } catch (e) {
      console.warn("Failed to print specific sale", e);
    }
  }

  /**
   * Print a Booking / Pre-Order receipt on the mobile thermal printer.
   * offlineReceiptNumber: short ID shown on the printout (e.g. "550E8400")
   */
  static async printBookingReceipt(
    offlineReceiptNumber: string,
    customerName: string,
    items: { name: string; qty: number; unitPrice: number }[],
    advancePayment: number,
    cartTotal: number,
    paymentMethod: string,
    saleTypePreference: 'DIRECT' | 'INSTALLMENT' | null,
    remarks?: string
  ) {
    const s = await this.getSettings();
    const date = new Date().toLocaleString();

    const itemsHtml = items.map(i => `
      <tr>
        <td colspan="3">${i.name}</td>
      </tr>
      <tr>
        <td>${i.qty}</td>
        <td>x ${i.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="amt">${(i.qty * i.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const { css, size } = await getCss();
    const html = `
      <html>
        <head><style>${css}</style></head>
        <body>
          ${this.getHeaderHTML(s)}
          
          <div class="center bold" style="font-size: 16px; margin-bottom: 10px;">BOOKING RECEIPT</div>
          
          <div>Date: ${date}</div>
          <div>Booking #: ${offlineReceiptNumber}</div>
          <div>Customer: ${customerName}</div>
          ${saleTypePreference ? `<div>Preference: ${saleTypePreference}</div>` : ''}
          ${this.getRepHTML()}
          
          <div class="divider"></div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 15%;">Qty</th>
                <th style="width: 45%;">Price</th>
                <th class="amt" style="width: 40%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <table style="font-weight: bold;">
            <tr>
              <td>Order Total</td>
              <td class="amt">${cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Advance Paid</td>
              <td class="amt">${advancePayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr style="border-top: 1px solid #000;">
              <td>Balance Due</td>
              <td class="amt">${(cartTotal - advancePayment).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </table>
          
          <div class="divider"></div>
          
          <div>Payment: ${paymentMethod}</div>
          ${remarks ? `<div style="margin-top: 6px; font-size: 12px;">Note: ${remarks}</div>` : ''}
          
          <div class="footer">
            <div>*** BOOKING CONFIRMATION ***</div>
            <div style="font-size: 11px; margin-top: 6px;">This is a booking receipt. Balance due on delivery.</div>
            <div style="margin-top: 6px;">Thank You!</div>
          </div>
        </body>
      </html>
    `;

    await Print.printAsync({ html });
  }
}
