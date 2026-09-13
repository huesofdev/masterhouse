import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2, Barcode } from 'lucide-react';
import { Combobox } from '../../../components/Combobox';
import { useProducts } from '../../catalog/api';
import { useWarehouses } from '../../warehouses/api';
import { useSuppliers } from '../../suppliers/api';
import { QuickAddSupplierModal } from '../../suppliers/components/QuickAddSupplierModal';
import { useBranchStore } from '../../../hooks/useBranchStore';
import { useCreateIntake } from '../api';

const intakeSchema = z.object({
  warehouse_id: z.string().min(1, "Warehouse is required"),
  supplier_id: z.string().min(1, "Supplier is required"),
  supplier_name: z.string().optional(),
  invoice_number: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().min(1, "Product is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unit_cost: z.number().min(0, "Unit cost must be positive"),
    discount_input: z.string().optional(),
    serials: z.array(z.string()).optional()
  })).min(1, "Add at least one item")
});

type IntakeFormData = z.infer<typeof intakeSchema>;

export function IntakeForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const { data: productsResponse } = useProducts(1, 1000, ''); // load max 1000 for dropdown
  const products = productsResponse?.data || [];
  const { data: warehouses } = useWarehouses();
  const { data: suppliersResponse } = useSuppliers();
  const suppliers = suppliersResponse?.data || [];
  const createIntake = useCreateIntake();

  const [activeSerialInput, setActiveSerialInput] = useState<number | null>(null);
  const [tempSerials, setTempSerials] = useState<string>('');
  const [showQuickAddSupplier, setShowQuickAddSupplier] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<IntakeFormData>({
    resolver: zodResolver(intakeSchema as any),
    defaultValues: {
      warehouse_id: '',
      supplier_id: '',
      invoice_number: '',
      items: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchItems = watch("items");

  const onSubmit = (data: IntakeFormData) => {
    if (!activeBranchId) return;

    // Validate serials match quantity for serialized products
    const allSerials: string[] = [];
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const product = products.find((p: any) => p.id === item.product_id);
      if (product?.is_serialized) {
        if (!item.serials || item.serials.length !== item.quantity) {
          alert(`Product "${product.name}" requires exactly ${item.quantity} serial numbers. Please open the serial scanner and verify.`);
          return;
        }
        if (item.serials) {
          allSerials.push(...item.serials);
        }
      }
    }

    // Check for cross-line duplicates across the entire form
    const crossDuplicates = allSerials.filter((s, idx) => allSerials.indexOf(s) !== idx);
    if (crossDuplicates.length > 0) {
      const uniqueDupes = Array.from(new Set(crossDuplicates));
      const confirmed = window.confirm(
        `⚠️ Duplicate Serial Numbers Found Across Items\n\n` +
        `Duplicates (${uniqueDupes.length}): ${uniqueDupes.join(', ')}\n\n` +
        `Would you like to safely remove these duplicates and proceed?\n` +
        `(Duplicates will be removed from later lines; first occurrence is kept.)`
      );
      if (!confirmed) return;

      // Deduplicate across items — keep first occurrence, remove from later items
      const globalSeen = new Set<string>();
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (item.serials && item.serials.length > 0) {
          const cleaned = item.serials.filter(s => {
            if (globalSeen.has(s)) return false;
            globalSeen.add(s);
            return true;
          });
          data.items[i] = { ...item, serials: cleaned, quantity: cleaned.length };
          setValue(`items.${i}.serials`, cleaned);
          setValue(`items.${i}.quantity`, cleaned.length);
        }
      }
    }

    const finalItems = data.items.map(item => {
      let final_unit_cost = item.unit_cost;
      let discount_amount = 0;
      const lineTotal = item.unit_cost * item.quantity;
      if (item.discount_input) {
        if (item.discount_input.endsWith('%')) {
          const pct = parseFloat(item.discount_input.replace('%', ''));
          if (!isNaN(pct)) discount_amount = lineTotal * (pct / 100);
        } else if (item.discount_input.startsWith('*')) {
          const amt = parseFloat(item.discount_input.replace('*', ''));
          if (!isNaN(amt)) discount_amount = amt * item.quantity;
        } else {
          const val = parseFloat(item.discount_input);
          if (!isNaN(val)) discount_amount = val;
        }
        if (discount_amount > 0 && discount_amount <= lineTotal) {
          final_unit_cost = Number(((lineTotal - discount_amount) / item.quantity).toFixed(2));
        } else if (discount_amount > lineTotal) {
          alert(`Discount for product cannot exceed the line total of Rs. ${lineTotal}`);
          throw new Error("Invalid discount");
        }
      }
      return {
        ...item,
        unit_cost: final_unit_cost
      };
    });

    if (!window.confirm("Are you sure you want to process this intake? This will permanently update inventory and supplier ledgers.")) {
      return;
    }

    createIntake.mutate({
      branch_id: activeBranchId,
      warehouse_id: data.warehouse_id,
      supplier_id: data.supplier_id,
      supplier_name: suppliers?.find(s => s.id === data.supplier_id)?.name || '',
      invoice_number: data.invoice_number,
      items: finalItems
    }, {
      onSuccess: () => onSuccess(),
      onError: (err: any) => {
        const errorMsg = err?.response?.data?.message || err.message || "Failed to process intake";
        alert(`❌ Intake Error: ${errorMsg}`);
      }
    });
  };

  const handleSaveSerials = (index: number) => {
    const serialsList = tempSerials.split('\n').map(s => s.trim()).filter(Boolean);
    
    // Check for duplicates within this modal's input
    const seen = new Set<string>();
    const duplicates: string[] = [];
    const uniqueSerials: string[] = [];
    for (const s of serialsList) {
      if (seen.has(s)) {
        duplicates.push(s);
      } else {
        seen.add(s);
        uniqueSerials.push(s);
      }
    }

    if (duplicates.length > 0) {
      const uniqueDupes = Array.from(new Set(duplicates));
      const confirmed = window.confirm(
        `⚠️ Duplicate Serial Numbers Detected\n\n` +
        `Duplicates found (${uniqueDupes.length}): ${uniqueDupes.join(', ')}\n\n` +
        `Would you like to safely remove these duplicates and save the remaining ${uniqueSerials.length} unique serials?`
      );
      if (!confirmed) return; // Keep modal open for user to review
      // Save the deduplicated list
      setValue(`items.${index}.serials`, uniqueSerials);
      setValue(`items.${index}.quantity`, uniqueSerials.length);
      // Update the textarea to reflect cleaned list
      setTempSerials(uniqueSerials.join('\n'));
      setActiveSerialInput(null);
      setTempSerials('');
      return;
    }

    setValue(`items.${index}.serials`, uniqueSerials);
    setValue(`items.${index}.quantity`, uniqueSerials.length);
    setActiveSerialInput(null);
    setTempSerials('');
  };



  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto',
        padding: '24px', position: 'relative'
      }}>
        <button onClick={onCancel} style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>New Inventory Intake</h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Destination Warehouse *</label>
              <Controller
                name="warehouse_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={warehouses?.filter(w => w.is_active).map(w => ({ value: w.id, label: w.name })) || []}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Search warehouses..."
                    error={!!errors.warehouse_id}
                  />
                )}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Supplier *</label>
                <button 
                  type="button" 
                  onClick={() => setShowQuickAddSupplier(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  + Quick Add
                </button>
              </div>
              <Controller
                name="supplier_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={suppliers?.filter(s => s.is_active).map(s => ({ value: s.id, label: s.name })) || []}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Search suppliers..."
                    error={!!errors.supplier_id}
                  />
                )}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Invoice Number</label>
              <input {...register('invoice_number')} placeholder="INV-001" style={{
                padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none'
              }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Received Items</h3>
            </div>

            {fields.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                No items added yet. Click "Add Item" to start scanning.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {fields.map((field, index) => {
                const selectedProductId = watchItems[index]?.product_id;
                const product = products.find((p: any) => p.id === selectedProductId);
                const isSerialized = product?.is_serialized;
                const currentSerials = watchItems[index]?.serials || [];

                return (
                  <div key={field.id} style={{ 
                    padding: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', 
                    borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '16px'
                  }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ flex: '2 1 250px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Choose Product</label>
                        <Controller
                          name={`items.${index}.product_id`}
                          control={control}
                          render={({ field }) => (
                            <Combobox
                              options={products.filter((p: any) => p.is_active).map((p: any) => ({ 
                                value: p.id, 
                                label: p.name,
                                data: { sku: p.sku, categoryName: (p.category as any)?.name ?? '' }
                              })) || []}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Search products..."
                              error={!!errors.items?.[index]?.product_id}
                              renderOption={(opt) => (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: 500, fontSize: '13px' }}>{opt.label}</span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    {opt.data.sku}{opt.data.categoryName ? ` • ${opt.data.categoryName}` : ''}
                                  </span>
                                </div>
                              )}
                              renderValue={(opt) => opt ? `${opt.label} (${opt.data.sku})` : "Select Product..."}
                            />
                          )}
                        />
                      </div>

                      <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Unit Cost</label>
                        <input type="number" step="0.01" {...register(`items.${index}.unit_cost`, { valueAsNumber: true })} 
                          placeholder="0.00" 
                          onFocus={e => e.target.select()}
                          style={{
                            padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none'
                          }} 
                        />
                      </div>

                      <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Quantity</label>
                        <input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} 
                          placeholder="1" 
                          readOnly={isSerialized}
                          onFocus={e => e.target.select()}
                          style={{
                            padding: '10px 12px', background: isSerialized ? 'var(--bg-secondary)' : 'var(--bg-primary)', 
                            border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none'
                        }} />
                      </div>

                      <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Discount (Line)</label>
                        <input type="text" {...register(`items.${index}.discount_input`)} 
                          placeholder="e.g. 10% or 500" 
                          style={{
                            padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none'
                          }} 
                        />
                        {(() => {
                          const item = watchItems[index];
                          if (!item?.discount_input || !item?.unit_cost || !item?.quantity) return null;
                          
                          let discountAmount = 0;
                          const lineTotal = item.unit_cost * item.quantity;
                          if (item.discount_input.endsWith('%')) {
                            const pct = parseFloat(item.discount_input.replace('%', ''));
                            if (!isNaN(pct)) discountAmount = lineTotal * (pct / 100);
                          } else if (item.discount_input.startsWith('*')) {
                            const amt = parseFloat(item.discount_input.replace('*', ''));
                            if (!isNaN(amt)) discountAmount = amt * item.quantity;
                          } else {
                            const val = parseFloat(item.discount_input);
                            if (!isNaN(val)) discountAmount = val;
                          }
                          
                          if (discountAmount > 0 && discountAmount <= lineTotal) {
                            const newUnitCost = (lineTotal - discountAmount) / item.quantity;
                            return (
                              <span style={{ fontSize: '10px', color: 'var(--status-success)', marginTop: '2px' }}>
                                Rs. {item.unit_cost.toFixed(2)} → Rs. {newUnitCost.toFixed(2)}
                              </span>
                            );
                          } else if (discountAmount > lineTotal) {
                            return (
                              <span style={{ fontSize: '10px', color: 'var(--status-error)', marginTop: '2px' }}>
                                Error: Exceeds Rs. {lineTotal.toFixed(2)}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      <button type="button" onClick={() => remove(index)} style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        <Trash2 size={20} />
                      </button>
                    </div>

                    {isSerialized && (
                      <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '6px', border: '1px dashed var(--brand-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)' }}>
                            <Barcode size={16} />
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>Serialized Product</span>
                          </div>
                          <button type="button" onClick={() => {
                            setTempSerials(currentSerials.join('\n'));
                            setActiveSerialInput(index);
                          }} style={{
                            padding: '4px 12px', background: 'var(--brand-primary)', color: 'var(--bg-primary)',
                            border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600
                          }}>
                            {currentSerials.length > 0 ? `Edit Serials (${currentSerials.length})` : 'Scan Serials'}
                          </button>
                        </div>
                        {currentSerials.length > 0 && (
                          <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {currentSerials.slice(0, 5).map((s, i) => (
                              <span key={i} style={{ background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', border: '1px solid var(--border-color)' }}>
                                {s}
                              </span>
                            ))}
                            {currentSerials.length > 5 && (
                              <span style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--text-secondary)' }}>+{currentSerials.length - 5} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-start' }}>
              <button type="button" onClick={() => append({ product_id: '', quantity: 1, unit_cost: 0 })} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                background: 'rgba(59, 130, 246, 0.1)', color: 'var(--brand-primary)',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px'
              }}>
                <Plus size={16} /> Add Another Item
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" onClick={onCancel} style={{
              padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer'
            }}>Cancel</button>
            <button type="submit" disabled={createIntake.isPending} style={{
              padding: '10px 20px', background: 'var(--brand-primary)', color: 'var(--bg-primary)',
              border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer'
            }}>
              {createIntake.isPending ? 'Processing...' : 'Complete Intake'}
            </button>
          </div>
        </form>

        {showQuickAddSupplier && (
          <QuickAddSupplierModal
            onClose={() => setShowQuickAddSupplier(false)}
            onSuccess={() => {
              setShowQuickAddSupplier(false);
            }}
          />
        )}

        {/* Serial Scanner Modal */}
        {activeSerialInput !== null && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110
          }}>
            <div className="glass-panel" style={{ width: '400px', padding: '24px' }}>
              <h3 style={{ marginBottom: '16px' }}>Scan Serial Numbers</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Use your barcode scanner or type serials, one per line.
              </p>
              <textarea 
                value={tempSerials}
                onChange={(e) => setTempSerials(e.target.value)}
                autoFocus
                placeholder="Scan barcodes here..."
                style={{
                  width: '100%', height: '200px', padding: '12px', background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)',
                  outline: 'none', fontFamily: 'monospace', resize: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <span style={{ fontSize: '13px', color: 'var(--brand-primary)', fontWeight: 600 }}>
                  Count: {tempSerials.split('\n').filter(s => s.trim()).length}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => setActiveSerialInput(null)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}>Cancel</button>
                  <button type="button" onClick={() => handleSaveSerials(activeSerialInput)} style={{ padding: '6px 12px', background: 'var(--brand-primary)', border: 'none', color: 'var(--bg-primary)', borderRadius: '4px', fontWeight: 600 }}>Save Serials</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
