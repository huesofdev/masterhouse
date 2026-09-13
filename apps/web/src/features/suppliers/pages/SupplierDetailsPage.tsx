import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronLeft, Receipt, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import { useGetSupplier, useGetSupplierLedger } from '../api';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { SetOpeningBalanceModal } from '../components/SetOpeningBalanceModal';
import { DataTable } from '../../../components/DataTable';
import type { SupplierLedgerEntry } from '../types';
import { useTableUrlState } from '../../../hooks/useTableUrlState';

export function SupplierDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);
  const { pageIndex, pageSize, setPagination } = useTableUrlState({
    defaultValues: {},
    defaultPageSize: 20,
  });

  const { data: supplier, isLoading: isLoadingSupplier } = useGetSupplier(id!);
  const { data: ledgerData, isLoading: isLoadingLedger } = useGetSupplierLedger(id!, pageIndex + 1, pageSize);

  const ledger = ledgerData?.data || [];
  const meta = ledgerData?.meta;

  const columns = useMemo<ColumnDef<SupplierLedgerEntry>[]>(() => [
    {
      accessorKey: 'created_at',
      header: 'DATE',
      cell: (info) => new Date(info.getValue() as string).toLocaleString(),
    },
    {
      accessorKey: 'transaction_type',
      header: 'TYPE',
      cell: (info) => {
        const type = info.getValue() as string;
        let icon = null;
        let color = 'var(--text-secondary)';
        if (type === 'OPENING_BALANCE') { icon = <Package size={14} />; color = 'var(--brand-primary)'; }
        if (type === 'INTAKE_BILL') { icon = <ArrowUpRight size={14} />; color = 'var(--status-error)'; }
        if (type === 'PAYMENT') { icon = <ArrowDownRight size={14} />; color = 'var(--status-success)'; }

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color, fontWeight: 600, fontSize: '12px' }}>
            {icon} {type.replace('_', ' ')}
          </div>
        );
      }
    },
    {
      accessorKey: 'notes',
      header: 'NOTES / REF',
      cell: (info) => <span style={{ color: 'var(--text-secondary)' }}>{info.getValue() as string || '-'}</span>,
    },
    {
      accessorKey: 'amount',
      header: () => <div style={{ textAlign: 'right' }}>AMOUNT</div>,
      cell: ({ row }) => {
        const amt = parseFloat(row.original.amount);
        const isPayment = amt < 0;
        return (
          <div style={{ textAlign: 'right', fontWeight: 600, color: isPayment ? 'var(--status-success)' : 'var(--status-error)' }}>
            {isPayment ? '-' : '+'} Rs {Math.abs(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        );
      }
    },
    {
      accessorKey: 'balance_after',
      header: () => <div style={{ textAlign: 'right' }}>RUNNING BALANCE</div>,
      cell: (info) => (
        <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
          Rs {parseFloat(info.getValue() as string).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )
    },
  ], []);

  if (isLoadingSupplier) return <div>Loading...</div>;
  if (!supplier) return <div>Supplier not found.</div>;

  const balanceDue = parseFloat(supplier.balance_due || '0');
  const totalPaid = parseFloat(supplier.total_paid || '0');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <button 
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '12px', fontSize: '13px', fontWeight: 500 }}
          >
            <ChevronLeft size={16} /> Back to Suppliers
          </button>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>{supplier.name}</h1>
          <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            {supplier.email && <span>{supplier.email}</span>}
            {supplier.phone && <span>{supplier.phone}</span>}
            {supplier.contact_person && <span>Attn: {supplier.contact_person}</span>}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowOpeningBalanceModal(true)} style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'var(--bg-tertiary)', color: 'var(--text-primary)', 
            padding: '10px 16px', borderRadius: '8px', 
            border: '1px solid var(--border-color)', fontWeight: 600, cursor: 'pointer',
          }}>
            Set Opening Balance
          </button>
          
          <button onClick={() => setShowPaymentModal(true)} style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'var(--status-success)', color: 'white', 
            padding: '10px 16px', borderRadius: '8px', 
            border: 'none', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
          }}>
            <Receipt size={18} /> Record Payment
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Balance Due</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: balanceDue > 0 ? 'var(--status-error)' : 'var(--status-success)' }}>
            Rs {balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Amount this branch owes to {supplier.name}</div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Amount Paid</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--brand-primary)' }}>
            Rs {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total historical payments made by this branch</div>
        </div>
      </div>

      {/* Ledger */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={18} color="var(--brand-primary)" />
            Branch Ledger
          </h2>
        </div>
        
        <div style={{ padding: '20px' }}>
          <DataTable 
            columns={columns} 
            data={ledger} 
            isLoading={isLoadingLedger}
            emptyMessage="No ledger entries found."
            serverPagination={meta ? {
              pageIndex,
              pageSize,
              pageCount: meta.total_pages,
              total: meta.total_records,
              setPagination
            } : undefined}
          />
        </div>
      </div>

      {showPaymentModal && (
        <RecordPaymentModal 
          supplierId={supplier.id}
          balanceDue={balanceDue}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {showOpeningBalanceModal && (
        <SetOpeningBalanceModal 
          supplierId={supplier.id}
          onClose={() => setShowOpeningBalanceModal(false)}
        />
      )}
    </div>
  );
}
