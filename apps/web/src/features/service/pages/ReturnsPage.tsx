import { useState, useEffect, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useListReturns, useGetSaleForReturn, useProcessReturn } from '../api';
import { Search, CornerUpLeft, AlertTriangle, Info } from 'lucide-react';
import { DataTable } from '../../../components/DataTable';
import { useTableUrlState } from '../../../hooks/useTableUrlState';
import { Link } from 'react-router-dom';

export function ReturnsPage() {
  const {
    activeTab,
    historySearch,
    pageIndex,
    pageSize,
    setFilters,
    setPagination,
    searchParams,
  } = useTableUrlState({
    defaultValues: {
      activeTab: 'NEW' as 'NEW' | 'HISTORY',
      historySearch: '',
    },
    defaultPageSize: 20,
  });
  
  // New Return State
  const [searchSaleId, setSearchSaleId] = useState('');
  const [saleIdToFetch, setSaleIdToFetch] = useState('');
  
  const { data: sale, isLoading: searching, error: searchError } = useGetSaleForReturn(saleIdToFetch);
  
  const { data: result, isLoading: loadingHistory } = useListReturns(pageIndex + 1, pageSize, historySearch);
  const returns = result?.data || [];
  const meta = result?.meta;
  
  const processReturn = useProcessReturn();

  // Return Form State
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [returnType, setReturnType] = useState<'CUSTOMER_RETURN' | 'DEFECTIVE' | 'WARRANTY'>('CUSTOMER_RETURN');
  const [disposition, setDisposition] = useState<'RESTOCKED' | 'DEFECTIVE_DEPOT' | 'SUPPLIER_RETURNED' | 'WRITTEN_OFF'>('RESTOCKED');
  const [refundMode, setRefundMode] = useState<'CASH' | 'STORE_CREDIT' | 'NONE'>('NONE');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const saleId = searchParams.get('saleId');
    if (saleId) {
      setSearchSaleId(saleId);
      setSaleIdToFetch(saleId);
    }
  }, [searchParams]);

  // When selected item changes, reset refund amount or set appropriately
  useEffect(() => {
    if (selectedItem) {
      if (refundMode === 'NONE') {
        setRefundAmount(0);
      } else {
        // Default to max safe refundable amount
        setRefundAmount(selectedItem.max_refundable_amount || 0);
      }
    }
  }, [selectedItem, refundMode]);

  const historyColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'created_at',
      header: 'DATE',
      cell: (info) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600 }}>{new Date(info.getValue() as string).toLocaleDateString('en-GB')}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {new Date(info.getValue() as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'sale_id',
      header: 'SALE REF',
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Link 
            to={`/sales/${row.original.sale_id}`}
            style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-primary)', textDecoration: 'none' }}
            title="View Sale Details"
          >
            {row.original.reference_number || (row.original.sale_id ? `SALE-${row.original.sale_id.slice(-8)}` : '—')}
          </Link>
          {row.original.offline_receipt_number && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Offline #{row.original.offline_receipt_number}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'customer_name',
      header: 'CUSTOMER',
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600 }}>{row.original.customer_name || 'Walk-in Customer'}</span>
          {row.original.customer_mobile && row.original.customer_mobile !== '-' && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{row.original.customer_mobile}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'product_name',
      header: 'PRODUCT / ITEM',
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600 }}>{row.original.product_name || 'Product Item'}</span>
          {row.original.serial_number && row.original.serial_number !== '-' && (
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--brand-primary)', background: 'rgba(245, 158, 11, 0.1)', padding: '1px 6px', borderRadius: '4px', display: 'inline-block', width: 'fit-content', marginTop: '2px' }}>
              S/N: {row.original.serial_number}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'TYPE',
      cell: (info) => <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'var(--bg-tertiary)' }}>{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'disposition',
      header: 'DISPOSITION',
      cell: (info) => (
        <span style={{ 
          fontSize: '12px', 
          fontWeight: 600, 
          color: info.getValue() === 'RESTOCKED' ? '#10b981' : info.getValue() === 'DEFECTIVE_DEPOT' ? '#f59e0b' : 'var(--text-secondary)' 
        }}>
          {info.getValue() as string}
        </span>
      ),
    },
    {
      id: 'refund',
      header: 'REFUND',
      cell: ({ row }) => (
        row.original.refund_mode !== 'NONE' ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, color: '#10b981' }}>
              Rs. {Number(row.original.refund_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              {row.original.refund_mode}
            </span>
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
        )
      ),
    },
    {
      accessorKey: 'reason',
      header: 'REASON',
      cell: (info) => (
        <span style={{ color: 'var(--text-secondary)', display: 'block', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={info.getValue() as string}>
          {info.getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: 'processed_by_name',
      header: 'PROCESSED BY',
      cell: (info) => <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{info.getValue() as string || 'Staff'}</span>,
    },
  ], []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchSaleId.trim()) {
      setSelectedItem(null);
      setSaleIdToFetch(searchSaleId.trim());
    }
  };

  const handleProcess = async () => {
    if (!selectedItem) return;
    const maxAllowed = selectedItem.max_refundable_amount ?? Number(selectedItem.line_total);
    if (refundMode !== 'NONE' && refundAmount > maxAllowed) {
      alert(`Refund amount (Rs. ${refundAmount.toLocaleString()}) cannot exceed the safe maximum limit of Rs. ${maxAllowed.toLocaleString()}.`);
      return;
    }

    try {
      await processReturn.mutateAsync({
        sale_item_id: selectedItem.id,
        type: returnType,
        disposition,
        reason,
        refund_amount: refundMode === 'NONE' ? 0 : refundAmount,
        refund_mode: refundMode,
      });
      alert("Return processed successfully");
      setSelectedItem(null);
      setSaleIdToFetch('');
      setFilters({ activeTab: 'HISTORY' });
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to process return");
    }
  };

  const isInstallment = sale?.sale_type === 'INSTALLMENT';
  const fin = sale?.financial_summary;
  const isLastItemReturn = (sale?.active_items_count || 0) <= 1;

  return (
    <div style={{ padding: '24px', maxWidth: '1150px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Returns & Refunds</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Process customer returns, defective exchanges, and issue verified refunds.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button onClick={() => setFilters({ activeTab: 'NEW' })} style={{ padding: '8px 16px', background: activeTab === 'NEW' ? 'var(--brand-primary)' : 'transparent', color: activeTab === 'NEW' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Process Return</button>
        <button onClick={() => setFilters({ activeTab: 'HISTORY' })} style={{ padding: '8px 16px', background: activeTab === 'HISTORY' ? 'var(--brand-primary)' : 'transparent', color: activeTab === 'HISTORY' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Return History</button>
      </div>

      {activeTab === 'NEW' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Left Column: Search & Sale Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Search */}
            <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>Find Original Sale</h3>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Enter Invoice No or Sale ID..." 
                  value={searchSaleId}
                  onChange={e => setSearchSaleId(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
                <button type="submit" disabled={searching} style={{ padding: '10px 20px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  <Search size={18} />
                </button>
              </form>
              {searchError && <div style={{ color: 'var(--status-error)', fontSize: '13px', marginTop: '10px' }}>Sale not found or invalid ID.</div>}
            </div>

            {/* Sale Financial Summary Banner */}
            {sale && fin && (
              <div style={{ background: 'var(--bg-primary)', padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{sale.customer ? sale.customer.full_name : 'Walk-in Customer'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Mode</div>
                    <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: isInstallment ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: isInstallment ? '#f59e0b' : '#10b981' }}>
                      {sale.sale_type}
                    </span>
                  </div>
                </div>

                {isInstallment ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Invoice Cash Price:</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Rs. {Number(sale.total).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Downpayment Paid:</span>
                      <div style={{ fontWeight: 700, color: '#10b981' }}>Rs. {Number(fin.downpayment).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Collections Collected:</span>
                      <div style={{ fontWeight: 700, color: '#3b82f6' }}>Rs. {Number(fin.total_collections_paid).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Total Cash Collected:</span>
                      <div style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>Rs. {Number(fin.total_cash_paid).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div style={{ gridColumn: 'span 2', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Outstanding Loan Debt:</span>
                      <span style={{ fontWeight: 700, color: '#ef4444' }}>Rs. {Number(fin.current_balance).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Cash Paid:</span>
                      <div style={{ fontWeight: 700 }}>Rs. {Number(fin.total_cash_paid).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Previous Refunds:</span>
                      <div style={{ fontWeight: 700, color: '#ef4444' }}>Rs. {Number(fin.total_refunds_issued).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Net Available:</span>
                      <div style={{ fontWeight: 800, color: '#10b981' }}>Rs. {Number(fin.net_cash_paid).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sale Items List */}
            {sale && (
              <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>Select Item to Return</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sale.items.map((item: any) => {
                    const isSelected = selectedItem?.id === item.id;
                    const isReturned = item.is_returned;

                    return (
                      <div 
                        key={item.id}
                        onClick={() => {
                          if (!isReturned) setSelectedItem(item);
                        }}
                        style={{ 
                          padding: '12px 14px', 
                          borderRadius: '8px', 
                          border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                          background: isReturned ? 'var(--bg-tertiary)' : isSelected ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-secondary)',
                          cursor: isReturned ? 'not-allowed' : 'pointer', 
                          opacity: isReturned ? 0.6 : 1,
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: isReturned ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                            {item.product?.name || 'Product'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {item.serialItem ? `S/N: ${item.serialItem.serial_number}` : `Qty: ${item.quantity}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            Rs. {Number(item.line_total).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </div>
                          {isReturned ? (
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                              ALREADY RETURNED
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                              Max Refund: Rs. {Number(item.max_refundable_amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Process Form */}
          {selectedItem && (
            <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CornerUpLeft size={20} color="var(--brand-primary)"/> Process Return
                </h3>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  Item Value: Rs. {Number(selectedItem.line_total).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              <div style={{ padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Selected Item:</span> <strong style={{ color: 'var(--text-primary)' }}>{selectedItem.product?.name}</strong>
                {selectedItem.serialItem && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>S/N: <code>{selectedItem.serialItem.serial_number}</code></div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Return Reason Category</label>
                <select value={returnType} onChange={e => setReturnType(e.target.value as any)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="CUSTOMER_RETURN">Change of Mind / Unwanted</option>
                  <option value="DEFECTIVE">Defective / Damaged</option>
                  <option value="WARRANTY">Warranty Claim (Failed Repair)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Item Disposition (Where does it go?)</label>
                <select value={disposition} onChange={e => setDisposition(e.target.value as any)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="RESTOCKED">Restock (Good Condition $\rightarrow$ Back into available stock)</option>
                  <option value="DEFECTIVE_DEPOT">Send to Defective Depot (Mark as DEFECTIVE)</option>
                  <option value="SUPPLIER_RETURNED">Return to Supplier / Factory</option>
                  <option value="WRITTEN_OFF">Write Off (Scrap Loss)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Refund Mode</label>
                <select 
                  value={refundMode} 
                  onChange={e => {
                    const mode = e.target.value as any;
                    setRefundMode(mode);
                    if (mode === 'NONE') {
                      setRefundAmount(0);
                    } else {
                      setRefundAmount(selectedItem.max_refundable_amount || 0);
                    }
                  }} 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="NONE">No Cash Refund (Balance Reduction / Free Replacement)</option>
                  <option value="CASH">Cash Refund (Pay cash back to customer)</option>
                  <option value="STORE_CREDIT">Store Credit</option>
                </select>
              </div>

              {refundMode !== 'NONE' && (
                <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Refund Amount (Rs.)</label>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
                      Safe Limit: Rs. {Number(selectedItem.max_refundable_amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <input 
                    type="number" 
                    min={0} 
                    max={selectedItem.max_refundable_amount}
                    step="0.01" 
                    value={refundAmount} 
                    onChange={e => setRefundAmount(parseFloat(e.target.value) || 0)} 
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${refundAmount > selectedItem.max_refundable_amount ? 'var(--status-error)' : 'var(--border-color)'}`, background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700 }} 
                  />

                  {/* Quick Preset Buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button 
                      type="button" 
                      onClick={() => setRefundAmount(selectedItem.max_refundable_amount || 0)}
                      style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}
                    >
                      Max Safe Refund (Rs. {Number(selectedItem.max_refundable_amount).toLocaleString()})
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setRefundAmount(0)}
                      style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}
                    >
                      Rs. 0 (Balance Reduction)
                    </button>
                  </div>

                  {refundAmount > selectedItem.max_refundable_amount && (
                    <div style={{ fontSize: '12px', color: 'var(--status-error)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={14} /> Refund amount exceeds the safe limit of cash paid by customer.
                    </div>
                  )}
                </div>
              )}

              {/* Installment Contract Impact Notice */}
              {isInstallment && (
                <div style={{ padding: '12px 14px', borderRadius: '8px', background: isLastItemReturn ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59, 130, 246, 0.08)', border: `1px solid ${isLastItemReturn ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`, fontSize: '12px' }}>
                  {isLastItemReturn ? (
                    <div style={{ display: 'flex', gap: '8px', color: '#ef4444' }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong>Full Contract Return:</strong> Returning this last item will complete the contract return, mark the contract as <strong>CANCELLED</strong>, and waive all future pending installments.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', color: '#3b82f6' }}>
                      <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong>Partial Return:</strong> The contract will remain <strong>ACTIVE</strong> for remaining products. The returned item's financed value will be deducted from the loan balance, and remaining monthly installments will be downsized.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Reason / Audit Notes *</label>
                <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this item is being returned..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical' }} />
              </div>

              <button 
                onClick={handleProcess}
                disabled={processReturn.isPending || reason.trim().length < 3 || (refundMode !== 'NONE' && refundAmount > (selectedItem.max_refundable_amount || 0))}
                style={{ width: '100%', padding: '14px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: (processReturn.isPending || reason.trim().length < 3) ? 'not-allowed' : 'pointer', opacity: (processReturn.isPending || reason.trim().length < 3) ? 0.6 : 1, transition: 'all 0.15s ease' }}
              >
                {processReturn.isPending ? 'Processing Return...' : 'Complete Return & Financial Settlement'}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* History Search & Stats Bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '12px',
            background: 'var(--bg-primary)',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 320px', maxWidth: '520px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Search by invoice #, customer, item, serial, reason, or staff..." 
                  value={historySearch}
                  onChange={e => {
                    setFilters({ historySearch: e.target.value });
                    setPagination((prev: any) => ({ ...prev, pageIndex: 0 }));
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px 8px 36px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-color)', 
                    background: 'var(--bg-secondary)', 
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
              </div>
              {historySearch && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters({ historySearch: '' });
                    setPagination((prev: any) => ({ ...prev, pageIndex: 0 }));
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Clear Search
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Total: <strong style={{ color: 'var(--text-primary)' }}>{meta?.total_records ?? returns.length}</strong> returns
              </span>
            </div>
          </div>

          <DataTable 
            columns={historyColumns}
            data={returns}
            isLoading={loadingHistory}
            emptyMessage={historySearch ? "No returns matching your search criteria." : "No returns processed yet."}
            serverPagination={meta ? {
              pageIndex,
              pageSize,
              pageCount: meta.total_pages,
              total: meta.total_records,
              setPagination
            } : undefined}
          />
        </div>
      )}
    </div>
  );
}
