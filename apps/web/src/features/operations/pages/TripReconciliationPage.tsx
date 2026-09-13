import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetTrip, useCloseTrip, useGetTripSummary, useGetTripAgreements } from '../api';
import { ArrowLeft, CheckCircle2, AlertTriangle, DollarSign, Package, Printer, MapPin, FileText } from 'lucide-react';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { TripAgreementsModal } from '../components/TripAgreementsModal';
import { openTripAgreementsPrintWindow } from '../components/printTripAgreements';

export function TripReconciliationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: trip, isLoading } = useGetTrip(id || '');
  const { data: summary } = useGetTripSummary(id || '');
  const { data: agreementsData, isLoading: isLoadingAgreements } = useGetTripAgreements(id || '');
  const [showAgreementsModal, setShowAgreementsModal] = useState(false);
  const closeTrip = useCloseTrip();

  const [actualCash, setActualCash] = useState<string>('');
  const [returnedStock, setReturnedStock] = useState<Record<string, number>>({});
  const [batchScanInput, setBatchScanInput] = useState('');
  const [endKm, setEndKm] = useState<string>('');

  useEffect(() => {
    if (trip && trip.end_km !== null && trip.end_km !== undefined) {
      setEndKm(trip.end_km.toString());
    }
  }, [trip]);

  const groupedStock = useMemo(() => {
    if (!trip?.stock) return [];
    const map = new Map<string, any>();
    for (const item of trip.stock) {
      const key = item.product?.id || item.product_id;
      if (map.has(key)) {
        const existing = map.get(key);
        existing.loaded_qty += item.loaded_qty;
        existing.sold_qty += item.sold_qty;
        if (item.serialItem) {
          existing.serialItems.push({ ...item.serialItem, stockId: item.id, sold_qty: item.sold_qty, loaded_qty: item.loaded_qty });
        }
      } else {
        map.set(key, {
          ...item,
          loaded_qty: item.loaded_qty,
          sold_qty: item.sold_qty,
          serialItems: item.serialItem ? [{ ...item.serialItem, stockId: item.id, sold_qty: item.sold_qty, loaded_qty: item.loaded_qty }] : []
        });
      }
    }
    return Array.from(map.values());
  }, [trip?.stock]);

  const getGroupedExpected = (gItem: any) => {
    return gItem.loaded_qty - gItem.sold_qty;
  };

  const getGroupedActual = (gItem: any) => {
    if (gItem.serialItems && gItem.serialItems.length > 0) {
      return gItem.serialItems.reduce((sum: number, s: any) => {
        const expectedUnit = s.loaded_qty - s.sold_qty;
        const actualUnit = returnedStock[s.stockId] !== undefined ? returnedStock[s.stockId] : expectedUnit;
        return sum + actualUnit;
      }, 0);
    }
    const expectedBulk = gItem.loaded_qty - gItem.sold_qty;
    return returnedStock[gItem.id] !== undefined ? returnedStock[gItem.id] : expectedBulk;
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
      osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
  };

  const expectedCash = useMemo(() => {
    return trip ? Number(trip.expected_cash) : 0;
  }, [trip]);

  // Initialize returned stock to Expected Return (loaded - sold), except for serial items which default to 0 (unchecked)
  useMemo(() => {
    if (trip && Object.keys(returnedStock).length === 0) {
      const initial: Record<string, number> = {};
      trip.stock?.forEach((item: any) => {
        if (item.serialItem) {
          initial[item.id] = 0; // Serial items default to unchecked (0)
        } else {
          initial[item.id] = item.loaded_qty - item.sold_qty;
        }
      });
      setReturnedStock(initial);
    }
  }, [trip]);

  if (isLoading) return <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading reconciliation data...</div>;
  if (!trip) return <div style={{ padding: '24px', color: 'var(--status-error)' }}>Trip not found</div>;
  if (trip.status !== 'RECONCILING') {
    return (
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--status-error)' }}>Trip cannot be reconciled</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Current status: {trip.status}. Must be in RECONCILING state.</p>
        <button onClick={() => navigate(`/trips/${trip.id}`)} style={{ padding: '10px 16px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Back to Trip</button>
      </div>
    );
  }

  const handleStockChange = (stockId: string, value: number) => {
    setReturnedStock(prev => ({ ...prev, [stockId]: value }));
  };

  const handleProcessBatchScan = () => {
    if (!batchScanInput.trim()) return;
    // Deduplicate scanned inputs to omit duplicates
    const serials = Array.from(
      new Set(
        batchScanInput
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean)
      )
    );
    if (serials.length === 0) return;

    let matchCount = 0;
    let alreadyCheckedCount = 0;
    const notFoundSerials: string[] = [];
    const alreadySoldSerials: string[] = [];

    setReturnedStock(prev => {
      const next = { ...prev };
      serials.forEach(serial => {
        const matchingItem = trip.stock?.find((i: any) => i.serialItem?.serial_number === serial);
        if (matchingItem) {
          if (matchingItem.sold_qty === 1) {
            alreadySoldSerials.push(serial);
          } else if (next[matchingItem.id] === 1) {
            alreadyCheckedCount++;
          } else {
            next[matchingItem.id] = 1;
            matchCount++;
          }
        } else {
          notFoundSerials.push(serial);
        }
      });
      return next;
    });

    playBeep();
    setBatchScanInput('');

    const notFoundMessage = notFoundSerials.length > 0 
      ? `\n\nWarning: The following serials were not found in this trip's stock: ${notFoundSerials.join(', ')}`
      : '';
      
    const alreadySoldMessage = alreadySoldSerials.length > 0 
      ? `\n\nError: The following serials were already sold on the trip and CANNOT be marked as returned: ${alreadySoldSerials.join(', ')}`
      : '';

    if (matchCount > 0) {
      alert(`Success: ${matchCount} serials marked as returned.${alreadyCheckedCount > 0 ? `\n(Ignored ${alreadyCheckedCount} already marked)` : ''}${notFoundMessage}${alreadySoldMessage}`);
    } else if (alreadyCheckedCount > 0 || alreadySoldSerials.length > 0) {
      alert(`Notice: No new serials were marked as returned.${alreadyCheckedCount > 0 ? `\n(Ignored ${alreadyCheckedCount} already marked)` : ''}${notFoundMessage}${alreadySoldMessage}`);
    } else {
      alert(`Warning: None of the scanned serials were found in this trip's stock.${notFoundMessage}${alreadySoldMessage}`);
    }
  };

  const cashDiscrepancy = Number(actualCash) - expectedCash;
  const hasDiscrepancies = cashDiscrepancy !== 0 || trip.stock?.some((item: any) => {
    const expected = item.loaded_qty - item.sold_qty;
    const actual = returnedStock[item.id] || 0;
    return expected !== actual;
  });

  const handleSubmit = async () => {
    const endKmVal = endKm ? parseInt(endKm, 10) : null;
    if (endKmVal !== null && isNaN(endKmVal)) {
      alert("Please enter a valid ending odometer reading");
      return;
    }
    if (endKmVal !== null && endKmVal < 0) {
      alert("Ending odometer reading cannot be negative.");
      return;
    }
    if (endKmVal !== null && trip.start_km !== null && trip.start_km !== undefined && endKmVal < trip.start_km) {
      alert(`Ending odometer reading (${endKmVal} km) cannot be less than starting odometer reading (${trip.start_km} km).`);
      return;
    }

    if (hasDiscrepancies) {
      const confirm = window.confirm("Discrepancies detected!\n\nIf you submit now, the system will automatically log these shortages/excesses for admin review, and the trip will be CLOSED WITH DISCREPANCIES.\n\nDo you want to proceed?");
      if (!confirm) return;
    }

    try {
      const payload = {
        expected_cash: expectedCash,
        actual_cash: Number(actualCash) || 0,
        returned_items: Object.entries(returnedStock).map(([trip_stock_id, returned_qty]) => ({
          trip_stock_id,
          returned_qty
        })),
        end_km: endKmVal
      };

      await closeTrip.mutateAsync({ tripId: trip.id, payload });
      alert('Trip reconciled and closed successfully!');
      navigate(`/trips/${trip.id}`);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to close trip');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate(`/trips/${trip.id}`)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '24px', fontWeight: 600 }}
      >
        <ArrowLeft size={18} /> Back to Trip
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>End of Trip Reconciliation</h1>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => agreementsData && agreementsData.agreements.length > 0 ? openTripAgreementsPrintWindow(agreementsData) : setShowAgreementsModal(true)}
            disabled={isLoadingAgreements || !agreementsData || agreementsData.agreements.length === 0}
            className="no-print"
            title={agreementsData?.agreements.length === 0 ? "No installment sales on this trip" : `Download / Print ${agreementsData?.agreements.length || 0} Installment Agreements`}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', 
              background: 'var(--brand-primary)', color: 'white', border: 'none', 
              borderRadius: '8px', cursor: (!agreementsData || agreementsData.agreements.length === 0) ? 'not-allowed' : 'pointer', 
              fontWeight: 600, opacity: (!agreementsData || agreementsData.agreements.length === 0) ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)'
            }}
          >
            <FileText size={18} /> Download Agreements ({agreementsData?.agreements.length || 0})
          </button>
          
          <button 
            onClick={() => window.print()}
            disabled={!summary}
            className="no-print"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)' }}
          >
            <Printer size={18} /> Print Summary Sheet
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Stock Reconciliation */}
          <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={18}/> Verify Returned Stock</h3>
            </div>

            {/* Batch Scan Input */}
            <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>Batch Serial Scan Mode</label>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Scan or paste multiple serial numbers (one per line) and click Process to automatically mark them as returned.</p>
              <textarea
                value={batchScanInput}
                onChange={(e) => setBatchScanInput(e.target.value)}
                placeholder="Scan serials here..."
                rows={4}
                style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'monospace', resize: 'vertical' }}
              />
              <button 
                onClick={handleProcessBatchScan}
                style={{ marginTop: '8px', padding: '8px 16px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Process Scanned Serials
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    <th style={{ padding: '12px', fontWeight: 600 }}>Product</th>
                    <th style={{ padding: '12px', fontWeight: 600 }}>Expected Return</th>
                    <th style={{ padding: '12px', fontWeight: 600 }}>Actual Return</th>
                    <th style={{ padding: '12px', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedStock.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No stock was loaded.</td></tr>
                  ) : (
                    groupedStock.map((item: any) => {
                      const expected = getGroupedExpected(item);
                      const actual = getGroupedActual(item);
                      const diff = actual - expected;

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                          <td style={{ padding: '12px', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 600 }}>{item.product?.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              SKU: {item.product?.sku}
                            </div>
                            
                            {item.serialItems && item.serialItems.length > 0 && (
                              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px', borderLeft: '2px solid var(--border-color)' }}>
                                {item.serialItems.map((s: any) => {
                                  const sExpected = s.loaded_qty - s.sold_qty;
                                  const sActual = returnedStock[s.stockId] !== undefined ? returnedStock[s.stockId] : sExpected;
                                  
                                  return (
                                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {s.sold_qty === 1 ? (
                                        <span style={{ fontSize: '11px', color: 'var(--status-success)', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                                          {s.serial_number} (Sold on Trip)
                                        </span>
                                      ) : (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                          <input 
                                            type="checkbox"
                                            checked={sActual === 1}
                                            onChange={(e) => handleStockChange(s.stockId, e.target.checked ? 1 : 0)}
                                            style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                                          />
                                          <span>{s.serial_number}</span>
                                          <span style={{ fontSize: '10px', color: sActual === 1 ? 'var(--status-success)' : 'var(--status-error)' }}>
                                            ({sActual === 1 ? 'Returned' : 'Missing'})
                                          </span>
                                        </label>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 600, verticalAlign: 'top' }}>{expected}</td>
                          <td style={{ padding: '12px', verticalAlign: 'top' }}>
                            {item.serialItems && item.serialItems.length > 0 ? (
                              <span style={{ fontWeight: 700, fontSize: '15px' }}>{actual}</span>
                            ) : (
                              <input 
                                type="number" 
                                min={0} 
                                value={actual} 
                                onChange={(e) => handleStockChange(item.id, parseInt(e.target.value) || 0)}
                                style={{ width: '80px', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                              />
                            )}
                          </td>
                          <td style={{ padding: '12px', verticalAlign: 'top' }}>
                            {diff === 0 ? (
                              <span style={{ color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}><CheckCircle2 size={16}/> OK</span>
                            ) : diff < 0 ? (
                              <span style={{ color: 'var(--status-error)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}><AlertTriangle size={16}/> Missing {Math.abs(diff)}</span>
                            ) : (
                              <span style={{ color: 'var(--status-warning)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}><AlertTriangle size={16}/> Excess {diff}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Cash Reconciliation */}
          <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><DollarSign size={18}/> Cash Collection</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Expected Cash (Rs.)</label>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                {expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {summary && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Sales Cash</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Rs. {summary.totals.salesCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Collections Cash</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Rs. {summary.totals.collectionsCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Bookings Cash</span>
                    <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>Rs. {summary.totals.preOrdersCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Actual Cash Handed Over (Rs.)</label>
              <input 
                type="number" 
                min={0}
                step="0.01"
                placeholder="0.00"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '18px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
            </div>
            
            {actualCash !== '' && cashDiscrepancy !== 0 && (
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: cashDiscrepancy < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: cashDiscrepancy < 0 ? 'var(--status-error)' : 'var(--status-warning)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                <AlertTriangle size={18}/>
                {cashDiscrepancy < 0 ? `Shortage: Rs. ${Math.abs(cashDiscrepancy).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `Excess: Rs. ${cashDiscrepancy.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              </div>
            )}
          </div>

          {/* Odometer Mileage */}
          <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={18}/> Odometer Reading</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Start Odometer (KM)</label>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {trip.start_km !== null && trip.start_km !== undefined ? `${trip.start_km} km` : 'N/A'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>End Odometer Reading (KM)</label>
              <input 
                type="number" 
                min={trip.start_km || 0}
                placeholder="0"
                value={endKm}
                onChange={(e) => setEndKm(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px', fontSize: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
            </div>
            
            {endKm !== '' && trip.start_km !== null && trip.start_km !== undefined && (
              <div style={{ marginTop: '12px', fontSize: '13px', color: parseInt(endKm, 10) < trip.start_km ? 'var(--status-error)' : 'var(--status-success)', fontWeight: 500 }}>
                {parseInt(endKm, 10) < trip.start_km ? `Odometer cannot be less than start odometer (${trip.start_km} km)` : `Total Run: ${parseInt(endKm, 10) - trip.start_km} km`}
              </div>
            )}
          </div>

          {/* Submission */}
          <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Summary</h3>
            <ul style={{ margin: '0 0 20px 0', paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{groupedStock.length}</span> Product Items Verified</li>
              {hasDiscrepancies ? (
                <li style={{ color: 'var(--status-error)', fontWeight: 600 }}>Discrepancies Detected</li>
              ) : (
                <li style={{ color: 'var(--status-success)', fontWeight: 600 }}>No Discrepancies (Clean Trip)</li>
              )}
            </ul>

            <PermissionGuard permission="trips:reconcile" behavior="disable">
              <button 
                onClick={handleSubmit}
                disabled={closeTrip.isPending || actualCash === ''}
                style={{ width: '100%', padding: '14px', background: hasDiscrepancies ? 'var(--status-warning)' : 'var(--brand-primary)', color: hasDiscrepancies ? '#000' : 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: (closeTrip.isPending || actualCash === '') ? 'not-allowed' : 'pointer', opacity: (closeTrip.isPending || actualCash === '') ? 0.7 : 1 }}
              >
                {closeTrip.isPending ? 'Closing Trip...' : hasDiscrepancies ? 'Close with Discrepancies' : 'Complete Reconciliation'}
              </button>
            </PermissionGuard>
          </div>
        </div>

      </div>

      {/* Printable Summary Sheet (Hidden on screen) */}
      {summary && (
        <div className="print-only" style={{ display: 'none' }}>
            <style>
              {`
                @media print {
                  @page { margin: 5mm; size: auto; }
                  body * { visibility: hidden; }
                  .no-print { display: none !important; }
                  .print-only, .print-only * { visibility: visible; }
                  .print-only { position: absolute; left: 0; top: 0; width: 100%; display: block !important; padding: 0 !important; }
                  h1 { font-size: 16px !important; margin-bottom: 4px !important; }
                  .print-table { width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 10px; }
                  .print-table th, .print-table td { border: 1px solid #ddd; padding: 4px; text-align: left; font-size: 10px; line-height: 1.2; }
                  .print-table th { background: #f5f5f5; font-weight: bold; color: #333; font-size: 11px; }
                  .summary-box { border: 1px solid #ddd; padding: 8px; margin-bottom: 10px; border-radius: 4px; }
                  .summary-box h2 { font-size: 13px !important; margin: 0 0 5px 0 !important; padding-bottom: 5px !important; }
                  .summary-box > div { font-size: 12px !important; }
                }
              `}
            </style>
          
          <h1 style={{ textAlign: 'center', marginBottom: '5px', fontSize: '24px' }}>Trip End Summary Sheet</h1>
          <div style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>Trip ID: {summary.trip.id}</div>
          
          <div className="summary-box">
            <h2 style={{ fontSize: '18px', margin: '0 0 15px 0', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Cash Totals</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
              <div><strong>Sales Cash:</strong> Rs. {summary.totals.salesCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div><strong>Collections Cash:</strong> Rs. {summary.totals.collectionsCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div><strong>Bookings Cash:</strong> Rs. {summary.totals.preOrdersCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: '20px', border: '2px solid #000', padding: '5px 15px', borderRadius: '4px' }}><strong>Total Expected:</strong> Rs. {summary.totals.expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="summary-box">
            <h2 style={{ fontSize: '18px', margin: '0 0 15px 0', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Odometer Details</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
              <div><strong>Start Odo:</strong> {trip.start_km !== null ? `${trip.start_km} km` : 'N/A'}</div>
              <div><strong>End Odo:</strong> {endKm !== '' ? `${endKm} km` : 'N/A'}</div>
              <div><strong>Total Run KMs:</strong> {trip.start_km !== null && endKm !== '' ? `${parseInt(endKm, 10) - trip.start_km} km` : 'N/A'}</div>
            </div>
          </div>

          {/* Direct Sales Table */}
          <h2 style={{ fontSize: '18px', borderBottom: '2px solid #333', paddingBottom: '5px', marginTop: '30px' }}>Direct Sales Transactions</h2>
          {(() => {
            const directSales = summary.sales.filter((s: any) => s.sale_type === 'DIRECT');
            if (directSales.length === 0) return <p style={{ fontStyle: 'italic', color: '#666' }}>No direct sales made during this trip.</p>;
            
            const totalInvoice = directSales.reduce((acc: number, s: any) => acc + Number(s.total || 0) + Number(s.advance_deduction || 0), 0);
            const totalCash = directSales.reduce((acc: number, s: any) => acc + Number(s.cash_collected || 0), 0);
            
            return (
              <>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer & Item (S/N)</th>
                      <th>Payment Mode</th>
                      <th style={{ textAlign: 'right' }}>Product Amount</th>
                      <th style={{ textAlign: 'right' }}>Cash Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directSales.map((s: any) => {
                      const prodAmt = Number(s.total || 0) + Number(s.advance_deduction || 0);
                      return (
                        <tr key={s.id}>
                          <td>{new Date(s.created_at).toLocaleString('en-GB')}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{s.customer_name || 'Walk-in'}</div>
                            {s.product_summary && (
                              <div style={{ fontSize: '9px', color: '#444', marginTop: '2px', fontWeight: 500 }}>
                                {s.product_summary}
                              </div>
                            )}
                          </td>
                          <td>{s.payment_mode}</td>
                          <td style={{ textAlign: 'right' }}>Rs. {prodAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right' }}>Rs. {Number(s.cash_collected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '30px', fontSize: '14px', fontWeight: 'bold' }}>
                  <div>Total Product Amount: Rs. {totalInvoice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div>Total Cash Collected: Rs. {totalCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              </>
            );
          })()}

          {/* Installment Sales Table */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: '5px', marginTop: '30px' }}>
            <h2 style={{ fontSize: '18px', margin: 0 }}>Installment Sales Transactions</h2>
            {agreementsData && agreementsData.agreements.length > 0 && (
              <button 
                onClick={() => openTripAgreementsPrintWindow(agreementsData)}
                className="no-print"
                style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FileText size={14} /> Download Agreements ({agreementsData.agreements.length} PDFs)
              </button>
            )}
          </div>
          {(() => {
            const installmentSales = summary.sales.filter((s: any) => s.sale_type === 'INSTALLMENT');
            if (installmentSales.length === 0) return <p style={{ fontStyle: 'italic', color: '#666' }}>No installment sales made during this trip.</p>;
            
            const totalInvoice = installmentSales.reduce((acc: number, s: any) => acc + Number(s.total || 0), 0);
            const totalDp = installmentSales.reduce((acc: number, s: any) => acc + Number(s.downpayment || 0), 0);
            const totalCash = installmentSales.reduce((acc: number, s: any) => acc + Number(s.cash_collected || 0), 0);
            
            return (
              <>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer & Item (S/N)</th>
                      <th>Payment Mode</th>
                      <th style={{ textAlign: 'right' }}>Product Amount</th>
                      <th style={{ textAlign: 'right' }}>Total Downpayment</th>
                      <th style={{ textAlign: 'right' }}>Cash Collected Today</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installmentSales.map((s: any) => {
                      return (
                        <tr key={s.id}>
                          <td>{new Date(s.created_at).toLocaleString('en-GB')}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{s.customer_name || 'Walk-in'}</div>
                            {s.product_summary && (
                              <div style={{ fontSize: '9px', color: '#444', marginTop: '2px', fontWeight: 500 }}>
                                {s.product_summary}
                              </div>
                            )}
                          </td>
                          <td>{s.payment_mode}</td>
                          <td style={{ textAlign: 'right' }}>Rs. {Number(s.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right' }}>Rs. {Number(s.downpayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right' }}>Rs. {Number(s.cash_collected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '30px', fontSize: '14px', fontWeight: 'bold' }}>
                  <div>Total Product Amount: Rs. {totalInvoice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div>Total Downpayment: Rs. {totalDp.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div>Total Cash Collected: Rs. {totalCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              </>
            );
          })()}

          {/* Collection Receipts Table */}
          <h2 style={{ fontSize: '18px', borderBottom: '2px solid #333', paddingBottom: '5px', marginTop: '30px' }}>Collection Receipts</h2>
          {summary.collections.length > 0 ? (() => {
            const totalColl = summary.collections.reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
            return (
              <>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Receipt No</th>
                      <th>Customer</th>
                      <th>Payment Mode</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.collections.map((c: any) => (
                      <tr key={c.id}>
                        <td>{new Date(c.created_at).toLocaleString('en-GB')}</td>
                        <td>{c.receipt_no}</td>
                        <td>{c.customer_name}</td>
                        <td>{c.payment_mode}</td>
                        <td style={{ textAlign: 'right' }}>Rs. {Number(c.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', fontSize: '14px', fontWeight: 'bold' }}>
                  Total Collections: Rs. {totalColl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </>
            );
          })() : <p style={{ fontStyle: 'italic', color: '#666' }}>No collections made during this trip.</p>}

          {/* Bookings Table */}
          <h2 style={{ fontSize: '18px', borderBottom: '2px solid #333', paddingBottom: '5px', marginTop: '30px' }}>Bookings (Advance Payments)</h2>
          {summary.preOrders?.length > 0 ? (() => {
            const totalBookings = summary.preOrders.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
            return (
              <>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Booking No</th>
                      <th>Customer</th>
                      <th>Payment Mode</th>
                      <th style={{ textAlign: 'right' }}>Advance Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.preOrders.map((p: any) => (
                      <tr key={p.id}>
                        <td>{new Date(p.created_at).toLocaleString('en-GB')}</td>
                        <td>{p.receipt_no}</td>
                        <td>{p.customer_name}</td>
                        <td>{p.payment_mode}</td>
                        <td style={{ textAlign: 'right' }}>Rs. {Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', fontSize: '14px', fontWeight: 'bold' }}>
                  Total Booking Advances: Rs. {totalBookings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </>
            );
          })() : <p style={{ fontStyle: 'italic', color: '#666' }}>No bookings made during this trip.</p>}
          
          <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between', paddingTop: '20px' }}>
            <div style={{ textAlign: 'center', width: '250px' }}>
              <div style={{ borderBottom: '1px solid #000', height: '40px', marginBottom: '8px' }}></div>
              <div style={{ fontWeight: 'bold' }}>Prepared By (Driver)</div>
            </div>
            <div style={{ textAlign: 'center', width: '250px' }}>
              <div style={{ borderBottom: '1px solid #000', height: '40px', marginBottom: '8px' }}></div>
              <div style={{ fontWeight: 'bold' }}>Checked By (Manager)</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '12px', color: '#888' }}>
            Printed on: {new Date().toLocaleString('en-GB')}
          </div>
        </div>
      )}

      {showAgreementsModal && trip && (
        <TripAgreementsModal tripId={trip.id} onClose={() => setShowAgreementsModal(false)} />
      )}
    </div>
  );
}
