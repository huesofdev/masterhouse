import { useState } from 'react';
import { useCreateReceipt } from '../api';
import { Banknote, CheckCircle2, X } from 'lucide-react';

export function ReceivePaymentModal({ 
  contract, 
  onClose 
}: { 
  contract: any; 
  onClose: () => void; 
}) {
  const [amount, setAmount] = useState<number | ''>(contract.dueAmount || '');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [isSuccess, setIsSuccess] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  
  const createReceipt = useCreateReceipt();

  const handleConfirm = async () => {
    if (!amount || amount <= 0) return alert("Enter a valid amount");
    if (amount > parseFloat(contract.balance)) {
      if (!window.confirm("Amount exceeds pending balance. Continue?")) return;
    }

    if (!window.confirm(`Confirm Collection: Are you sure you received Rs. ${amount} for this contract?`)) return;

    try {
      const receiptData = await createReceipt.mutateAsync({
        contract_id: contract.id,
        amount: Number(amount),
        payment_mode: paymentMode
      });
      setPrintData(receiptData?.print_data);
      setIsSuccess(true);
    } catch (e: any) {
      alert(e.response?.data?.message || e.message || "Failed to process payment");
    }
  };

  if (isSuccess) {
    const handlePrint = () => {
      const p = printData;
      if (!p) {
        alert("Print data is unavailable.");
        return;
      }
      
      const html = `
        <html>
          <head>
            <style>
              @page { margin: 0; }
              body {
                font-family: monospace;
                font-size: 14px;
                width: 300px;
                margin: 0;
                padding: 10px;
                color: #000;
                font-weight: bold;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; font-weight: bold; color: #000; }
              td { padding: 2px 0; vertical-align: top; color: #000; font-weight: bold; }
              .divider { border-bottom: 2px dashed #000; margin: 10px 0; }
              .logo { max-width: 150px; max-height: 80px; margin: 0 auto 10px; display: block; }
              .amt { text-align: right; }
              .header { margin-bottom: 15px; }
              .footer { margin-top: 20px; text-align: center; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header center">
              ${p.company_logo ? `<img src="${p.company_logo}" class="logo" />` : ''}
              <div class="bold" style="font-size: 18px;">${p.company_name || 'Company Name'}</div>
              ${p.branch_address ? `<div>${p.branch_address}</div>` : ''}
              ${p.branch_phone ? `<div>Tel: ${p.branch_phone}</div>` : ''}
            </div>
            
            <div class="center bold" style="font-size: 16px; margin-bottom: 10px;">PAYMENT RECEIPT</div>
            
            <div>Date: ${new Date(p.created_at).toLocaleString('en-GB')}</div>
            <div>Receipt #: ${p.receipt_no}</div>
            <div>Customer: ${p.customer_name}</div>
            <div>Item: ${p.product_name || ''}</div>
            
            <div class="divider"></div>
            
            <table>
              <tr>
                <td>Amount Paid:</td>
                <td class="amt bold">${parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Payment Mode:</td>
                <td class="amt">${p.payment_mode}</td>
              </tr>
            </table>
            
            <div class="divider"></div>
            
            <table>
              <tr>
                <td>Total Pending:</td>
                <td class="amt bold">${parseFloat(p.contract_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Next Due Date:</td>
                <td class="amt">${p.next_due_date}</td>
              </tr>
              <tr>
                <td>Next Amount:</td>
                <td class="amt">${parseFloat(p.next_due_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>

            <div class="divider"></div>
            
            <div class="footer">
              Collected by: ${p.collected_by_name}<br/>
              Thank you for your payment!<br/>
              Please retain this receipt.
            </div>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      } else {
        alert("Please allow popups to print.");
      }
    };

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
        <div style={{ width: '400px', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <CheckCircle2 size={64} color="var(--status-success)" />
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Payment Successful!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Receipt has been recorded.</p>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', width: '100%' }}>
            <button 
              onClick={onClose}
              style={{ flex: 1, padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Done
            </button>
            <button 
              onClick={handlePrint}
              style={{ flex: 1, padding: '12px', background: 'var(--brand-primary)', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ width: '400px', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Banknote size={20} color="var(--brand-primary)" /> Receive Payment
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Pending Balance</span>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Rs. {parseFloat(contract.balance).toLocaleString('en-GB')}</span>
            </div>
            {contract.dueAmount !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--brand-primary)', fontWeight: 700 }}>Current Due Amount</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-primary)' }}>Rs. {contract.dueAmount.toLocaleString('en-GB')}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Contract Status</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: contract.status === 'ACTIVE' ? 'var(--status-success)' : 'var(--status-error)' }}>{contract.status}</span>
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Amount Received (Rs.)</span>
            <input 
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value ? parseFloat(e.target.value) : '')}
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', fontSize: '18px', fontWeight: 700 }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Payment Method</span>
            <select 
              value={paymentMode}
              onChange={e => setPaymentMode(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Credit/Debit Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </label>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', background: 'var(--bg-primary)' }}>
          <button 
            onClick={onClose}
            style={{ flex: 1, padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={createReceipt.isPending || !amount || amount <= 0}
            style={{ flex: 2, padding: '12px', background: 'var(--brand-primary)', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', opacity: createReceipt.isPending ? 0.7 : 1 }}
          >
            {createReceipt.isPending ? 'Processing...' : 'Confirm Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}
