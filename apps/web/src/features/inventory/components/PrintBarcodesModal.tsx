import { useState, useRef, useMemo } from 'react';
import { X, Printer } from 'lucide-react';
import Barcode from 'react-barcode';
import { useReactToPrint } from 'react-to-print';
import { useGetSettings } from '../../settings/api';

interface PrintBarcodesModalProps {
  intakeItems: any[];
  onClose: () => void;
}

export function PrintBarcodesModal({ intakeItems, onClose }: PrintBarcodesModalProps) {
  const { data: settings } = useGetSettings();
  const printSizeSetting = settings?.barcode_print_size || '35x25';
  const [printWidth, printHeight] = printSizeSetting.split('x'); // e.g. ["35", "25"]

  // State to hold how many labels to print for bulk items
  const [bulkQuantities, setBulkQuantities] = useState<Record<string, number | ''>>(() => {
    const initial: Record<string, number | ''> = {};
    intakeItems.forEach(item => {
      if (!item.product?.is_serialized) {
        initial[item.id] = item.quantity; // default to received quantity
      }
    });
    return initial;
  });

  // State to hold which serials are selected for printing
  const [selectedSerials, setSelectedSerials] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    intakeItems.forEach(item => {
      if (item.product?.is_serialized && item.serials) {
        item.serials.forEach((s: any) => initial.add(s.serial_number));
      }
    });
    return initial;
  });

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'MasterHouse_Barcodes',
  });

  const toggleSerial = (serialNumber: string) => {
    setSelectedSerials(prev => {
      const next = new Set(prev);
      if (next.has(serialNumber)) next.delete(serialNumber);
      else next.add(serialNumber);
      return next;
    });
  };

  const handleBulkQuantityChange = (itemId: string, value: string) => {
    if (value === '') {
      setBulkQuantities(prev => ({ ...prev, [itemId]: '' }));
      return;
    }
    const num = parseInt(value);
    setBulkQuantities(prev => ({ ...prev, [itemId]: isNaN(num) ? '' : num }));
  };

  // Generate the final list of labels to render in the print container
  const labelsToPrint = useMemo(() => {
    const labels: { productName: string; barcodeValue: string; type: 'SKU' | 'SERIAL', retailPrice?: number }[] = [];
    
    intakeItems.forEach(item => {
      if (!item.product?.is_serialized) {
        const qty = bulkQuantities[item.id] || 0;
        for (let i = 0; i < qty; i++) {
          labels.push({
            productName: item.product?.name || 'Unknown',
            barcodeValue: item.product?.sku || 'N/A',
            type: 'SKU',
            retailPrice: parseFloat(item.product?.base_price || item.product?.price || '0'),
          });
        }
      } else if (item.serials) {
        item.serials.forEach((s: any) => {
          if (selectedSerials.has(s.serial_number)) {
            labels.push({
              productName: item.product?.name || 'Unknown',
              barcodeValue: s.serial_number,
              type: 'SERIAL',
              retailPrice: parseFloat(item.product?.base_price || item.product?.price || '0'),
            });
          }
        });
      }
    });

    return labels;
  }, [intakeItems, bulkQuantities, selectedSerials]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 110, padding: 'var(--spacing-4)'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', position: 'relative'
      }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Printer size={20} /> Print Barcode Labels
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Format: 35mm x 25mm Thermal</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        
        {/* Configuration Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {intakeItems.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No items available to print.</p>}
          
          {intakeItems.map(item => (
            <div key={item.id} style={{ 
              background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-md)', 
              padding: '16px', border: '1px solid var(--border-color)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '14px' }}>{item.product?.name}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>SKU: {item.product?.sku}</p>
                </div>
                <span style={{ 
                  background: item.product?.is_serialized ? 'var(--brand-primary)' : 'rgba(107, 114, 128, 0.2)',
                  color: item.product?.is_serialized ? '#fff' : 'var(--text-secondary)',
                  fontSize: '10px', padding: '4px 8px', borderRadius: '4px', fontWeight: 600
                }}>
                  {item.product?.is_serialized ? 'SERIALIZED' : 'BULK'}
                </span>
              </div>

              {/* Bulk Handling */}
              {!item.product?.is_serialized && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Labels to print:</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={bulkQuantities[item.id] ?? ''}
                    onChange={(e) => handleBulkQuantityChange(item.id, e.target.value)}
                    style={{ 
                      width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', 
                      background: 'var(--bg-primary)', color: 'var(--text-primary)' 
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>(Received: {item.quantity})</span>
                </div>
              )}

              {/* Serialized Handling */}
              {item.product?.is_serialized && item.serials && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Select serials to print ({item.serials.length} available):</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {item.serials.map((s: any) => (
                      <label 
                        key={s.serial_number} 
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px',
                          background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '4px',
                          border: `1px solid ${selectedSerials.has(s.serial_number) ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                          cursor: 'pointer'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={selectedSerials.has(s.serial_number)}
                          onChange={() => toggleSerial(s.serial_number)}
                          style={{ accentColor: 'var(--brand-primary)' }}
                        />
                        <span style={{ fontFamily: 'monospace' }}>{s.serial_number}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Total Labels: </span>
            <span style={{ color: 'var(--brand-primary)', fontWeight: 700, fontSize: '16px' }}>{labelsToPrint.length}</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} style={{
              padding: '8px 16px', background: 'transparent', border: 'none',
              color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500
            }}>Cancel</button>
            <button 
              onClick={() => handlePrint()}
              disabled={labelsToPrint.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 24px', background: 'var(--brand-primary)', border: 'none',
                color: 'var(--bg-primary)', borderRadius: 'var(--border-radius-sm)', cursor: labelsToPrint.length > 0 ? 'pointer' : 'not-allowed', 
                fontWeight: 600, opacity: labelsToPrint.length > 0 ? 1 : 0.5
              }}
            >
              <Printer size={16} /> Print {labelsToPrint.length} Labels
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Print Container */}
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
