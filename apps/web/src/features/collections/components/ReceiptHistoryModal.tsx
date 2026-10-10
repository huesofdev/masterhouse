import { useState } from 'react';
import { useGetContractHistory } from '../api';
import { apiClient as api } from '../../../lib/axios';
import { History, X, Printer, Map, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export function ReceiptHistoryModal({
  contractId,
  customerLat,
  customerLng,
  onClose,
}: {
  contractId: string;
  customerLat?: string | null;
  customerLng?: string | null;
  onClose: () => void;
}) {
  const { data: history, isLoading } = useGetContractHistory(contractId);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const handlePrint = async (receiptId: string) => {
    setPrintingId(receiptId);
    try {
      const res = await api.get(`/collections/receipts/${receiptId}/print`);
      const p = res.data.data;

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
              .logo { max-width: 150px; max-height: 80px; margin: 0 auto 10px; display: block; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; color: #000; font-weight: bold; }
              td { padding: 2px 0; vertical-align: top; color: #000; font-weight: bold; }
              .divider { border-bottom: 2px dashed #000; margin: 10px 0; }
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
            <div>Item: ${p.product_name}</div>
            
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
                <td>Next Due Amount:</td>
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
      }
    } catch (e: any) {
      alert("Failed to print: " + (e.response?.data?.message || e.message));
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 160 }}>
      <div style={{ width: '540px', maxHeight: '80vh', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} color="var(--brand-primary)" /> Collection & Attempt History
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>Loading history...</div>
          ) : !history || history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>No collection receipts or attempts found for this contract.</div>
          ) : (
            history.map((event: any) => {
              const isReceipt = event.type === 'RECEIPT' || event.status === 'COLLECTED';
              const isMissed = event.status === 'MISSED' || event.status === 'CUSTOMER_UNAVAILABLE';
              const isPromise = event.status === 'PROMISE_TO_PAY';

              return (
                <div key={event.id} style={{ background: 'var(--bg-secondary)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isReceipt ? (
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={16} /> Receipt: Rs. {Number(event.amount).toLocaleString('en-GB')}
                          </span>
                        ) : isMissed ? (
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={16} /> Attempt: {event.status.replace('_', ' ')}
                          </span>
                        ) : isPromise ? (
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={16} /> Promise to Pay
                          </span>
                        ) : (
                          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                            Attempt: {event.status}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {new Date(event.date).toLocaleString('en-GB')} • Logged by <strong style={{ color: 'var(--text-primary)' }}>{event.user}</strong>
                        {event.offline_receipt_number && <span style={{ fontFamily: 'monospace', marginLeft: '6px', color: 'var(--text-muted)' }}>[Offline Ref: {event.offline_receipt_number}]</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      {event.gps_lat && event.gps_lng && event.gps_lat !== 'null' && event.gps_lng !== 'null' && (
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&origin=${event.gps_lat},${event.gps_lng}&destination=${(customerLat && customerLat !== 'null') ? customerLat : event.gps_lat},${(customerLng && customerLng !== 'null') ? customerLng : event.gps_lng}&travelmode=driving`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ padding: '4px 10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', textDecoration: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Map size={13} /> Route
                        </a>
                      )}
                      {event.type === 'RECEIPT' && (
                        <button 
                          onClick={() => handlePrint(event.id)}
                          disabled={printingId === event.id}
                          style={{ padding: '4px 10px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: printingId === event.id ? 0.7 : 1 }}
                        >
                          <Printer size={13} /> {printingId === event.id ? 'Printing...' : 'Print'}
                        </button>
                      )}
                    </div>
                  </div>
                  {event.remarks && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '6px' }}>
                      {event.remarks}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
