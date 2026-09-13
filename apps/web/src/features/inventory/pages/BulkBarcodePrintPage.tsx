import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Barcode as BarcodeIcon, Search, RefreshCw, AlertCircle, Package, Layers } from 'lucide-react';
import Barcode from 'react-barcode';
import { useReactToPrint } from 'react-to-print';
import { useLookupBarcodes } from '../api';
import { useGetSettings } from '../../settings/api';

export function BulkBarcodePrintPage() {
  const navigate = useNavigate();
  const { data: settings } = useGetSettings();
  const lookupMutation = useLookupBarcodes();

  const printSizeSetting = settings?.barcode_print_size || '35x25';
  const [printWidth, printHeight] = printSizeSetting.split('x');

  const [activeMode, setActiveMode] = useState<'SERIALS' | 'SKU'>('SERIALS');

  // Mode A: Serials Input
  const [serialsInput, setSerialsInput] = useState('');
  const [fetchedSerials, setFetchedSerials] = useState<any[]>([]);
  const [selectedSerialNumbers, setSelectedSerialNumbers] = useState<Set<string>>(new Set());

  // Mode B: SKU Input
  const [skuInput, setSkuInput] = useState('');
  const [fetchedSkuData, setFetchedSkuData] = useState<any | null>(null);
  const [bulkQty, setBulkQty] = useState<number>(1);
  const [selectedSkuSerials, setSelectedSkuSerials] = useState<Set<string>>(new Set());

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'MasterHouse_Bulk_Barcodes',
  });

  // Calculate serial count in textarea
  const parsedSerials = useMemo(() => {
    return Array.from(
      new Set(
        serialsInput
          .split(/[\n,\s]+/)
          .map(s => s.trim())
          .filter(Boolean)
      )
    ).slice(0, 50);
  }, [serialsInput]);

  const handleLookupSerials = async () => {
    if (parsedSerials.length === 0) return;
    try {
      const res = await lookupMutation.mutateAsync({ serials: parsedSerials });
      setFetchedSerials(res.serials || []);
      const initialSelected = new Set<string>();
      (res.serials || []).forEach((item: any) => {
        if (item.found) initialSelected.add(item.serial_number);
      });
      setSelectedSerialNumbers(initialSelected);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to lookup serial numbers');
    }
  };

  const handleLookupSku = async () => {
    const cleanSku = skuInput.trim();
    if (!cleanSku) return;
    try {
      const res = await lookupMutation.mutateAsync({ skus: [cleanSku] });
      const skuResult = res.skus?.[0];
      if (skuResult) {
        setFetchedSkuData(skuResult);
        if (skuResult.found && skuResult.product?.is_serialized) {
          const avail = new Set<string>((skuResult.available_serials || []).map((s: any) => s.serial_number));
          setSelectedSkuSerials(avail);
        } else {
          setBulkQty(1);
        }
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to lookup SKU');
    }
  };

  const toggleSerialSelect = (serialNumber: string) => {
    setSelectedSerialNumbers(prev => {
      const next = new Set(prev);
      if (next.has(serialNumber)) next.delete(serialNumber);
      else next.add(serialNumber);
      return next;
    });
  };

  const toggleSkuSerialSelect = (serialNumber: string) => {
    setSelectedSkuSerials(prev => {
      const next = new Set(prev);
      if (next.has(serialNumber)) next.delete(serialNumber);
      else next.add(serialNumber);
      return next;
    });
  };

  // Compile final label array to print
  const labelsToPrint = useMemo(() => {
    const labels: { productName: string; barcodeValue: string; type: 'SKU' | 'SERIAL'; retailPrice: number }[] = [];

    if (activeMode === 'SERIALS') {
      fetchedSerials.forEach(item => {
        if (item.found && selectedSerialNumbers.has(item.serial_number)) {
          labels.push({
            productName: item.product.name,
            barcodeValue: item.serial_number,
            type: 'SERIAL',
            retailPrice: item.product.price,
          });
        }
      });
    } else if (activeMode === 'SKU' && fetchedSkuData && fetchedSkuData.found) {
      const p = fetchedSkuData.product;
      if (p.is_serialized) {
        (fetchedSkuData.available_serials || []).forEach((s: any) => {
          if (selectedSkuSerials.has(s.serial_number)) {
            labels.push({
              productName: p.name,
              barcodeValue: s.serial_number,
              type: 'SERIAL',
              retailPrice: p.price,
            });
          }
        });
      } else {
        const count = Math.max(1, bulkQty || 1);
        for (let i = 0; i < count; i++) {
          labels.push({
            productName: p.name,
            barcodeValue: p.sku,
            type: 'SKU',
            retailPrice: p.price,
          });
        }
      }
    }

    return labels;
  }, [activeMode, fetchedSerials, selectedSerialNumbers, fetchedSkuData, selectedSkuSerials, bulkQty]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate('/intake')} 
            style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarcodeIcon size={26} color="var(--brand-primary)" /> Bulk Barcode Printer
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Generate thermal sticker barcodes for multiple serial numbers or SKUs ({printSizeSetting} mm)
            </p>
          </div>
        </div>

        <button
          onClick={() => handlePrint()}
          disabled={labelsToPrint.length === 0}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', opacity: labelsToPrint.length > 0 ? 1 : 0.5 }}
        >
          <Printer size={18} /> Print {labelsToPrint.length} Barcodes
        </button>
      </div>

      {/* Mode Selector Tabs */}
      <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '10px', border: '1px solid var(--border-color)', width: 'fit-content' }}>
        <button
          onClick={() => setActiveMode('SERIALS')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: activeMode === 'SERIALS' ? 'var(--brand-primary)' : 'transparent',
            color: activeMode === 'SERIALS' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <Layers size={16} /> Mode A: Paste Serials (Max 50)
        </button>
        <button
          onClick={() => setActiveMode('SKU')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: activeMode === 'SKU' ? 'var(--brand-primary)' : 'transparent',
            color: activeMode === 'SKU' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <Package size={16} /> Mode B: Lookup by SKU
        </button>
      </div>

      {/* MODE A: SERIALS INPUT */}
      {activeMode === 'SERIALS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Input Panel */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Paste Serial Numbers</h3>
              <span style={{ fontSize: '12px', color: parsedSerials.length > 50 ? 'var(--status-error)' : 'var(--brand-primary)', fontWeight: 600, fontFamily: 'monospace' }}>
                {parsedSerials.length} / 50 max
              </span>
            </div>

            <textarea
              className="input-field"
              rows={10}
              placeholder="Paste or enter up to 50 serial numbers here (separated by newlines, commas, or spaces)&#10;e.g.&#10;SN-84920491&#10;SN-84920492&#10;SN-84920493"
              value={serialsInput}
              onChange={e => setSerialsInput(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }}
            />

            <button
              onClick={handleLookupSerials}
              disabled={parsedSerials.length === 0 || lookupMutation.isPending}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {lookupMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
              Fetch Products for {parsedSerials.length} Serials
            </button>
          </div>

          {/* Results Panel */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Matched Products ({fetchedSerials.length})</h3>
              {fetchedSerials.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedSerialNumbers(new Set(fetchedSerials.filter(i => i.found).map(i => i.serial_number)))}
                    style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedSerialNumbers(new Set())}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Deselect All
                  </button>
                </div>
              )}
            </div>

            {fetchedSerials.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <BarcodeIcon size={32} opacity={0.4} />
                <p style={{ marginTop: '8px', fontSize: '13px' }}>Paste serials on the left and click Fetch Products.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {fetchedSerials.map(item => {
                  const isChecked = selectedSerialNumbers.has(item.serial_number);
                  return (
                    <div
                      key={item.serial_number}
                      onClick={() => item.found && toggleSerialSelect(item.serial_number)}
                      style={{
                        padding: '12px', borderRadius: '8px', border: `1px solid ${isChecked ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                        background: isChecked ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-secondary)',
                        display: 'flex', alignItems: 'center', gap: '12px', cursor: item.found ? 'pointer' : 'not-allowed',
                        opacity: item.found ? 1 : 0.6
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!item.found}
                        onChange={() => {}}
                        style={{ accentColor: 'var(--brand-primary)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14px' }}>{item.serial_number}</span>
                          <span style={{
                            fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600,
                            background: !item.found ? 'rgba(239, 68, 68, 0.1)' : item.status === 'IN_STOCK' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: !item.found ? '#ef4444' : item.status === 'IN_STOCK' ? '#10b981' : '#f59e0b'
                          }}>
                            {item.found ? item.status : 'NOT FOUND'}
                          </span>
                        </div>
                        {item.found ? (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            <strong>{item.product.name}</strong> • SKU: {item.product.sku} • Rs. {item.product.price.toLocaleString()}
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--status-error)', marginTop: '4px' }}>
                            Serial number not found in database inventory.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE B: SKU LOOKUP */}
      {activeMode === 'SKU' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Input Panel */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Enter Product SKU</h3>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Enter Product SKU e.g. PROD-TV-55"
                value={skuInput}
                onChange={e => setSkuInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLookupSku()}
                style={{ flex: 1 }}
              />
              <button
                onClick={handleLookupSku}
                disabled={!skuInput.trim() || lookupMutation.isPending}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {lookupMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                Search
              </button>
            </div>

            {fetchedSkuData && (
              <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                {!fetchedSkuData.found ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-error)', fontSize: '13px' }}>
                    <AlertCircle size={16} /> SKU "{fetchedSkuData.sku}" not found in catalog.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
                        {fetchedSkuData.product.name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        SKU: {fetchedSkuData.product.sku} • Price: Rs. {fetchedSkuData.product.price.toLocaleString()}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 700,
                        background: fetchedSkuData.product.is_serialized ? 'var(--brand-primary)' : 'rgba(107, 114, 128, 0.2)',
                        color: fetchedSkuData.product.is_serialized ? '#fff' : 'var(--text-secondary)'
                      }}>
                        {fetchedSkuData.product.is_serialized ? 'SERIALIZED PRODUCT' : 'BULK / NON-SERIALIZED'}
                      </span>
                    </div>

                    {!fetchedSkuData.product.is_serialized && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600 }}>How many barcode labels to print?</label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={bulkQty}
                          onChange={e => setBulkQty(parseInt(e.target.value) || 1)}
                          className="input-field"
                          style={{ width: '90px' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Serialized SKU Results Panel */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
                In-Stock Serials ({fetchedSkuData?.available_serials?.length || 0})
              </h3>
              {fetchedSkuData?.available_serials?.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedSkuSerials(new Set(fetchedSkuData.available_serials.map((s: any) => s.serial_number)))}
                    style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedSkuSerials(new Set())}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Deselect All
                  </button>
                </div>
              )}
            </div>

            {!fetchedSkuData || !fetchedSkuData.found ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <Search size={32} opacity={0.4} />
                <p style={{ marginTop: '8px', fontSize: '13px' }}>Enter a SKU on the left to inspect product inventory.</p>
              </div>
            ) : !fetchedSkuData.product.is_serialized ? (
              <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Bulk product selected. Specify number of print copies on the left panel.
              </div>
            ) : fetchedSkuData.available_serials?.length === 0 ? (
              <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', textAlign: 'center', color: 'var(--status-error)', fontSize: '13px' }}>
                No active IN_STOCK serial numbers found for SKU {fetchedSkuData.sku}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {fetchedSkuData.available_serials.map((s: any) => {
                  const isChecked = selectedSkuSerials.has(s.serial_number);
                  return (
                    <label
                      key={s.serial_number}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px',
                        border: `1px solid ${isChecked ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                        background: isChecked ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                        cursor: 'pointer', fontSize: '13px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSkuSerialSelect(s.serial_number)}
                        style={{ accentColor: 'var(--brand-primary)' }}
                      />
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.serial_number}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden Print Container for Thermal Printer Output */}
      <div style={{ display: 'none' }}>
        <div ref={printRef} className="print-container">
          <style>
            {`
              @page {
                size: ${printWidth}mm ${printHeight}mm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .thermal-label {
                width: ${printWidth}mm;
                height: ${printHeight}mm;
                box-sizing: border-box;
                padding: 2mm;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                page-break-after: always;
                background: white;
                color: black;
                font-family: Arial, sans-serif;
                overflow: hidden;
              }
              .company-name-bottom {
                font-size: 7px;
                font-weight: 800;
                text-align: center;
                margin-top: 1mm;
                max-width: 100%;
                flex-shrink: 0;
              }
              .label-title {
                font-size: 7px;
                font-weight: 700;
                text-align: center;
                margin-bottom: 0.5mm;
                max-width: 100%;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                position: relative;
                z-index: 10;
                flex-shrink: 0;
              }
              .label-price {
                font-size: 8px;
                font-weight: 800;
                text-align: center;
                margin-bottom: 1px;
                max-width: 100%;
                position: relative;
                z-index: 10;
                flex-shrink: 0;
              }
              .barcode-wrapper {
                position: relative;
                z-index: 1;
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                width: 100%;
              }
              .barcode-wrapper svg {
                max-width: 100%;
                max-height: 100%;
              }
            `}
          </style>
          {labelsToPrint.map((label, idx) => (
            <div key={idx} className="thermal-label">
              <div className="label-title">{label.productName.toUpperCase()}</div>
              <div className="label-price">Rs. {Number(label.retailPrice).toLocaleString()}</div>
              <div className="barcode-wrapper">
                <Barcode 
                  value={label.barcodeValue} 
                  format="CODE128"
                  width={1}
                  height={22}
                  fontSize={9}
                  margin={0}
                  displayValue={true}
                  background="transparent"
                  lineColor="#000"
                />
              </div>
              <div className="company-name-bottom">{settings?.company_name || 'MASTER-H STORE'}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
