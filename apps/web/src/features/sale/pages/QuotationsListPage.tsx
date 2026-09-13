import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Printer, FileText } from 'lucide-react';
import { useGetQuotations, useDeleteQuotation, useGetQuotation } from '../api';
import { printQuotationDocument } from '../../../lib/printQuotation';
import { useGetSettings } from '../../settings/api';
import { useBranches } from '../../branches/api';
import { useBranchStore } from '../../../hooks/useBranchStore';

export function QuotationsListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: quotations, isLoading } = useGetQuotations();
  const deleteQuotation = useDeleteQuotation();
  
  const { data: settings } = useGetSettings();
  const { data: branches } = useBranches();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const activeBranch = branches?.find((b: any) => b.id === activeBranchId);

  // Filter quotations
  const filteredQuotations = quotations?.filter((q: any) => {
    const searchLower = searchQuery.toLowerCase();
    const customerMatch = q.customer?.full_name?.toLowerCase().includes(searchLower) || q.customer?.mobile?.includes(searchLower);
    const refMatch = q.id?.toLowerCase().includes(searchLower);
    return customerMatch || refMatch;
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this quotation? This cannot be undone.')) {
      try {
        await deleteQuotation.mutateAsync(id);
      } catch (err) {
        alert('Failed to delete quotation');
      }
    }
  };


  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Quotations</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Manage all saved quotations</p>
        </div>
        <button
          onClick={() => navigate('/quotations/new')}
          style={{
            padding: '10px 16px', background: 'var(--brand-primary)', color: 'white', border: 'none',
            borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
          }}
        >
          <Plus size={18} /> Create Quotation
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '16px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
          <input
            placeholder="Search by customer or ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 36px', boxSizing: 'border-box',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
              borderRadius: '8px', color: 'var(--text-primary)', outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg-tertiary)', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ref</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Customer</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading quotations...</td></tr>
              ) : filteredQuotations?.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <FileText size={48} style={{ margin: '0 auto 16px auto', opacity: 0.2 }} />
                    <p>No quotations found.</p>
                  </td>
                </tr>
              ) : (
                filteredQuotations?.map((q: any) => (
                  <tr key={q.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-primary)' }}>
                      {new Date(q.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      QT-{q.id.slice(-8)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{q.customer?.full_name || 'Walk-in Customer'}</div>
                      {q.customer?.mobile && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{q.customer.mobile}</div>}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Rs. {parseFloat(q.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <PrintQuotationButton quotationId={q.id} activeBranch={activeBranch} settings={settings} />
                        <button
                          onClick={() => handleDelete(q.id)}
                          title="Delete Quotation"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)', border: 'none',
                            borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Separate component for print button to handle fetching the full quotation safely
function PrintQuotationButton({ quotationId, activeBranch, settings }: { quotationId: string, activeBranch: any, settings: any }) {
  const [isPrinting, setIsPrinting] = useState(false);
  const { refetch } = useGetQuotation(quotationId);

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const { data: quotation } = await refetch();
      if (!quotation) throw new Error("Could not load quotation details");

      // Reconstruct cart format
      const cart = quotation.items.map((item: any) => ({
        name: item.product?.name || 'Unknown Item',
        sku: item.product?.sku || '',
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        discount_input: parseFloat(item.discount_amount) > 0 ? String(item.discount_amount) : undefined
      }));

      const totals = {
        subtotal: parseFloat(quotation.subtotal),
        discount: parseFloat(quotation.manual_discount),
        tax: parseFloat(quotation.tax_amount),
        grandTotal: parseFloat(quotation.total),
        taxes: quotation.tax_details ? JSON.parse(quotation.tax_details) : []
      };

      printQuotationDocument(cart, quotation.customer, totals, settings, activeBranch, quotation.reference_number);
    } catch (err) {
      alert("Failed to print quotation");
      console.error(err);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <button
      onClick={handlePrint}
      disabled={isPrinting}
      title="Print Quotation"
      style={{
        background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
        borderRadius: '6px', padding: '8px', cursor: isPrinting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <Printer size={16} />
    </button>
  );
}
