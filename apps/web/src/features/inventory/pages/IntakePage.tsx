import { useState } from 'react';
import { PackagePlus, Search, Trash2, Barcode as BarcodeIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIntakes, useDeleteIntake } from '../api';
import { IntakeForm } from '../components/IntakeForm';
import { ImportIntakeModal } from '../components/ImportIntakeModal';
import { Upload } from 'lucide-react';
import { PermissionGuard } from '../../../components/PermissionGuard';

export function IntakePage() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);

  const { data: result, isLoading } = useIntakes(page, limit, search);
  const deleteIntake = useDeleteIntake();
  const paginatedIntakes = result?.data || [];
  const meta = result?.meta || { total_pages: 1, total_records: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-2)' }}>Inventory Intake</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Receive stock from suppliers into your warehouses.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => navigate('/inventory/print-barcodes')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', background: 'var(--bg-tertiary)',
              color: 'var(--brand-primary)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-md)', fontWeight: 600, cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <BarcodeIcon size={20} />
            Bulk Barcode Printer
          </button>
          <PermissionGuard permission="inventory:adjust" behavior="disable">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-md)', fontWeight: 600, cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <Upload size={20} />
              Bulk Import
            </button>
          </PermissionGuard>
          <PermissionGuard permission="inventory:adjust" behavior="disable">
            <button 
              onClick={() => setShowForm(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', background: 'var(--brand-primary)',
                color: 'var(--bg-primary)', border: 'none', borderRadius: 'var(--border-radius-md)',
                fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              <PackagePlus size={20} />
              Receive Stock
            </button>
          </PermissionGuard>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
          <div style={{ 
            flex: 1, display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'var(--bg-tertiary)', padding: '8px 16px', 
            borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' 
          }}>
            <Search size={18} color="var(--text-secondary)" />
            <input 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by Invoice #, Serial #, Supplier, Product, or SKU..."
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' }}>DATE</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' }}>SUPPLIER</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' }}>INVOICE</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' }}>WAREHOUSE</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' }}>TOTAL VALUE</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' }}>RECEIVED BY</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading intakes...</td>
                </tr>
              ) : paginatedIntakes.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No intake records found.</td>
                </tr>
              ) : paginatedIntakes.map((intake: any) => (
                <tr 
                  key={intake.id} 
                  onClick={() => navigate(`/intake/${intake.id}`)}
                  style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '16px' }}>
                    {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(intake.received_at))}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 500 }}>{intake.supplier_name}</td>
                  <td style={{ padding: '16px' }}>
                    {intake.invoice_number ? (
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                        {intake.invoice_number}
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '16px' }}>{intake.warehouse?.name}</td>
                  <td style={{ padding: '16px', fontWeight: 600, color: 'var(--brand-primary)' }}>
                    Rs {parseFloat(intake.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '16px' }}>{intake.creator?.name || intake.creator?.email}</td>
                  <td style={{ padding: '16px' }}>
                    <PermissionGuard permission="inventory:delete">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you absolutely sure you want to permanently delete this intake and reverse all associated inventory and supplier ledgers?')) {
                            deleteIntake.mutate(intake.id, {
                              onError: (err: any) => alert(err.response?.data?.message || err.message)
                            });
                          }
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: 'var(--status-error)',
                          padding: '8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Reverse and Delete Intake"
                      >
                        <Trash2 size={16} />
                      </button>
                    </PermissionGuard>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta.total_pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, meta.total_records)} of {meta.total_records} entries
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>Rows per page:</span>
                <select 
                  value={limit}
                  onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', padding: '4px' }}
                >
                  {[10, 30, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ 
                  padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', 
                  borderRadius: '4px', color: 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1
                }}
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(meta.total_pages, p + 1))}
                disabled={page === meta.total_pages}
                style={{ 
                  padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', 
                  borderRadius: '4px', color: 'var(--text-primary)', cursor: page === meta.total_pages ? 'not-allowed' : 'pointer', opacity: page === meta.total_pages ? 0.5 : 1
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <IntakeForm 
          onCancel={() => setShowForm(false)} 
          onSuccess={() => setShowForm(false)} 
        />
      )}

      {isImportModalOpen && (
        <ImportIntakeModal 
          onClose={() => setIsImportModalOpen(false)} 
          onSuccess={() => window.location.reload()} 
        />
      )}
    </div>
  );
}
