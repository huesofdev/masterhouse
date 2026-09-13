import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateTransfer, useInventoryBalances } from '../api';
import { useAllWarehouses } from '../../warehouses/api';
import { useProducts } from '../../catalog/api';
import { Save, X, Plus, Trash2, Search, Check, CheckCircle2 } from 'lucide-react';
import { apiClient as api } from '../../../lib/axios';
import { Combobox } from '../../../components/Combobox';

// Helper Modal Component for Serial Selection
function SerialSelectionModal({ 
  isOpen, 
  onClose, 
  productName, 
  requiredQuantity, 
  availableSerials, 
  selectedSerialIds, 
  onConfirm 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  productName: string;
  requiredQuantity: number;
  availableSerials: any[];
  selectedSerialIds: string[];
  onConfirm: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>(selectedSerialIds);

  if (!isOpen) return null;

  const filteredSerials = availableSerials.filter(s => 
    s.serial_number.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSerial = (id: string) => {
    if (tempSelected.includes(id)) {
      setTempSelected(tempSelected.filter(s => s !== id));
    } else {
      if (tempSelected.length >= requiredQuantity) {
        alert(`You only need to select ${requiredQuantity} serial(s).`);
        return;
      }
      setTempSelected([...tempSelected, id]);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
    }}>
      <div className="glass-panel" style={{
        background: 'var(--bg-primary)',
        borderRadius: '12px', width: '100%', maxWidth: '600px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Select Serials</h2>
            <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
              {productName} &bull; Selected: <span style={{ color: tempSelected.length === requiredQuantity ? 'var(--status-success)' : 'inherit', fontWeight: 600 }}>{tempSelected.length} / {requiredQuantity}</span>
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search serial numbers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '38px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          {filteredSerials.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              No serials found matching your search.
            </div>
          ) : (
            filteredSerials.map(s => {
              const isSelected = tempSelected.includes(s.id);
              return (
                <div 
                  key={s.id}
                  onClick={() => toggleSerial(s.id)}
                  style={{
                    padding: '12px', borderRadius: '8px', cursor: 'pointer',
                    border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                    background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontWeight: 500, color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                    {s.serial_number}
                  </span>
                  {isSelected && <Check size={16} color="var(--brand-primary)" />}
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn-primary" 
            onClick={() => {
              if (tempSelected.length !== requiredQuantity) {
                alert(`Please select exactly ${requiredQuantity} serials.`);
                return;
              }
              onConfirm(tempSelected);
            }}
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
}

export function CreateTransferPage() {
  const navigate = useNavigate();
  const createTransfer = useCreateTransfer();

  const { data: allWarehousesData } = useAllWarehouses();
  const warehouses = allWarehousesData || [];

  const { data: productsData } = useProducts();
  const products = productsData?.data || [];

  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<any[]>([]);
  
  // Modal state
  const [activeSerialModalIndex, setActiveSerialModalIndex] = useState<number | null>(null);

  // Fetch balances for source warehouse
  const { data: balances } = useInventoryBalances(sourceWarehouseId);

  // Memoized Options for Combobox
  const warehouseOptions = useMemo(() => {
    return warehouses.map((w: any) => ({
      value: w.id,
      label: `${w.name} (${w.branch?.name || 'No Branch'})`,
      data: w
    }));
  }, [warehouses]);

  const productOptions = useMemo(() => {
    if (!sourceWarehouseId) return [];
    
    return products.map((p: any) => {
      const balance = balances?.find((b: any) => b.product_id === p.id);
      const avail = balance?.quantity || 0;
      return {
        value: p.id,
        label: `${p.name} (Avail: ${avail})`,
        data: { ...p, available_qty: avail }
      };
    }).filter(p => p.data.available_qty > 0); // Only show products with stock
  }, [products, balances, sourceWarehouseId]);

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, serial_ids: [], available_serials: [] }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = async (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // If product changed, reset quantity and serials
    if (field === 'product_id') {
      newItems[index].quantity = 1;
      newItems[index].serial_ids = [];
      newItems[index].available_serials = [];
      
      if (value) {
        try {
          const res = await api.get(`/inventory/serials/available/${value}?warehouseId=${sourceWarehouseId}`);
          const available = res.data.data.filter((s: any) => s.warehouse_id === sourceWarehouseId);
          newItems[index].available_serials = available;
          // Must fetch latest items from state so we don't overwrite if user did something else concurrently
          setItems(current => {
            const updated = [...current];
            if (updated[index].product_id === value) {
              updated[index].available_serials = available;
            }
            return updated;
          });
        } catch (error) {
          console.error("Failed to fetch serials", error);
        }
      }
    }
    
    // Validate quantity against available stock
    if (field === 'quantity') {
      const prodId = newItems[index].product_id;
      if (prodId) {
        const balance = balances?.find((b: any) => b.product_id === prodId);
        const maxQty = balance?.quantity || 0;
        if (value > maxQty) {
          newItems[index].quantity = maxQty;
        }
        
        // If quantity changed, reset serials to be safe
        newItems[index].serial_ids = [];
      }
    }
    
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!sourceWarehouseId || !destinationWarehouseId) {
      alert("Please select source and destination warehouses.");
      return;
    }
    if (sourceWarehouseId === destinationWarehouseId) {
      alert("Source and destination cannot be the same.");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one item.");
      return;
    }
    
    // Validation
    for (const item of items) {
      if (!item.product_id || item.quantity <= 0) {
        alert("Please select a product and enter a valid quantity for all items.");
        return;
      }
      
      const balance = balances?.find((b: any) => b.product_id === item.product_id);
      if (!balance || balance.quantity < item.quantity) {
        alert(`Insufficient quantity for product ID ${item.product_id}`);
        return;
      }

      if (item.available_serials?.length > 0 && item.serial_ids.length !== item.quantity) {
        alert(`Please select exactly ${item.quantity} serials`);
        return;
      }
    }

    try {
      await createTransfer.mutateAsync({
        source_warehouse_id: sourceWarehouseId,
        destination_warehouse_id: destinationWarehouseId,
        notes,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          serial_ids: item.serial_ids
        }))
      });
      navigate('/inventory/transfers');
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to create transfer");
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
              width: '40px', height: '40px', borderRadius: '12px', 
              background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-cta))',
              color: 'white', boxShadow: 'var(--shadow-glow)'
            }}>
              <Plus size={24} />
            </span>
            New Stock Transfer
          </h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginLeft: '52px' }}>
            Move inventory instantly between warehouses across any branch
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn-secondary" 
            onClick={() => navigate('/inventory/transfers')}
          >
            <X size={18} /> Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={createTransfer.isPending}
          >
            <Save size={18} /> {createTransfer.isPending ? 'Transferring...' : 'Execute Transfer'}
          </button>
        </div>
      </div>

      <div className="card glass-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', margin: 0 }}>
          Transfer Details
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Source Warehouse</label>
            <Combobox 
              options={warehouseOptions}
              value={sourceWarehouseId}
              onChange={(val) => {
                setSourceWarehouseId(val);
                setItems([]); // Clear items on source change
              }}
              placeholder="Search source warehouse..."
            />
          </div>
          
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Destination Warehouse</label>
            <Combobox 
              options={warehouseOptions.filter(o => o.value !== sourceWarehouseId)}
              value={destinationWarehouseId}
              onChange={(val) => setDestinationWarehouseId(val)}
              placeholder="Search destination warehouse..."
            />
          </div>
        </div>

        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Transfer Notes (Optional)</label>
          <textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            className="input-field"
            placeholder="Reason for transfer, vehicle details, etc."
            rows={2}
          />
        </div>
      </div>

      <div className="card glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Items to Transfer</h3>
          <button 
            className="btn-secondary" 
            onClick={addItem}
            disabled={!sourceWarehouseId}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            <Plus size={16} /> Add Product
          </button>
        </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {items.map((item, index) => {
              const balance = balances?.find((b: any) => b.product_id === item.product_id);
              const maxQty = balance?.quantity || 0;
              const needsSerials = item.available_serials?.length > 0;
              
              return (
                <div key={index} style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  padding: '20px' 
                }}>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <div className="form-group" style={{ flex: 2 }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>Product</label>
                      <Combobox 
                        options={productOptions}
                        value={item.product_id}
                        onChange={(val) => updateItem(index, 'product_id', val)}
                        placeholder="Search available products..."
                      />
                    </div>

                    <div className="form-group" style={{ width: '150px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>Quantity (Max: {maxQty})</label>
                      <input 
                        type="number" 
                        min="1" 
                        max={maxQty}
                        value={item.quantity === '' ? '' : item.quantity} 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                             updateItem(index, 'quantity', '');
                          } else {
                             updateItem(index, 'quantity', parseInt(val, 10));
                          }
                        }}
                        onBlur={() => {
                          if (item.quantity === '' || item.quantity <= 0) {
                             updateItem(index, 'quantity', 1);
                          }
                        }}
                        className="input-field"
                        disabled={!item.product_id}
                        style={{ height: '40px' }}
                      />
                    </div>

                    <button 
                      onClick={() => removeItem(index)}
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--danger-color)', 
                        cursor: 'pointer', marginTop: '29px', height: '40px', width: '40px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '8px', transition: 'background 0.2s'
                      }}
                      title="Remove Item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {needsSerials && (
                    <div style={{ 
                      marginTop: '20px', padding: '16px', 
                      background: 'var(--bg-primary)', borderRadius: '8px',
                      border: '1px dashed var(--border-color)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, marginBottom: '4px' }}>
                          Serial Numbers Required
                          {item.serial_ids.length === item.quantity && <CheckCircle2 size={16} color="var(--status-success)" />}
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                          {item.serial_ids.length} of {item.quantity} selected
                        </p>
                      </div>
                      
                      <button 
                        onClick={() => setActiveSerialModalIndex(index)}
                        className={item.serial_ids.length === item.quantity ? "btn-secondary" : "btn-primary"}
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                      >
                        {item.serial_ids.length === item.quantity ? "Edit Selection" : "Select Serials"}
                      </button>
                    </div>
                  )}

                  {needsSerials && item.serial_ids.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                      {item.serial_ids.map((id: string) => {
                        const serialObj = item.available_serials.find((s: any) => s.id === id);
                        return (
                          <div key={id} style={{
                            padding: '4px 10px', background: 'rgba(59, 130, 246, 0.1)',
                            color: 'var(--brand-primary)', borderRadius: '100px', fontSize: '12px',
                            fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px'
                          }}>
                            {serialObj?.serial_number}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                <div style={{ 
                  width: '48px', height: '48px', borderRadius: '24px', 
                  background: 'var(--bg-secondary)', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' 
                }}>
                  <Search size={24} color="var(--text-muted)" />
                </div>
                {sourceWarehouseId ? (
                  <>
                    <h3 style={{ fontSize: '16px', fontWeight: 500, margin: '0 0 8px 0' }}>No Products Added</h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px', maxWidth: '300px', marginInline: 'auto' }}>
                      Click the "Add Product" button to start selecting inventory to transfer.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 style={{ fontSize: '16px', fontWeight: 500, margin: '0 0 8px 0' }}>Select Source Warehouse</h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px', maxWidth: '300px', marginInline: 'auto' }}>
                      Please select a source warehouse first to see available items for transfer.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

      {/* Render active serial modal */}
      {activeSerialModalIndex !== null && items[activeSerialModalIndex] && (
        <SerialSelectionModal
          isOpen={true}
          onClose={() => setActiveSerialModalIndex(null)}
          productName={products.find((p: any) => p.id === items[activeSerialModalIndex].product_id)?.name || ''}
          requiredQuantity={items[activeSerialModalIndex].quantity}
          availableSerials={items[activeSerialModalIndex].available_serials}
          selectedSerialIds={items[activeSerialModalIndex].serial_ids}
          onConfirm={(ids) => {
            updateItem(activeSerialModalIndex, 'serial_ids', ids);
            setActiveSerialModalIndex(null);
          }}
        />
      )}
    </div>
  );
}
