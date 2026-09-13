import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Percent, Calendar } from 'lucide-react';
import { useCreateScheme, useUpdateScheme } from '../api';

const schemeSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(255),
  terms: z.number().positive().int("Terms must be a whole number"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  interest_rate: z.number().min(0, "Cannot be negative"),
  min_downpayment_percent: z.number().min(0).max(100, "Cannot exceed 100%"),
  late_fee_percentage: z.number().min(0).max(100),
  grace_period_days: z.number().int().min(0).default(5),
  is_active: z.boolean().default(true)
});

type SchemeFormData = z.infer<typeof schemeSchema>;

export function SchemeFormModal({
  scheme,
  onClose,
}: {
  scheme?: any;
  onClose: () => void;
}) {
  const isEditing = !!scheme;
  const createScheme = useCreateScheme();
  const updateScheme = useUpdateScheme();

  const { register, handleSubmit, formState: { errors } } = useForm<SchemeFormData>({
    resolver: zodResolver(schemeSchema as any),
    defaultValues: {
      name: scheme?.name || '',
      terms: scheme?.terms ? Number(scheme.terms) : 12,
      frequency: scheme?.frequency || 'MONTHLY',
      interest_rate: scheme?.interest_rate ? Number(scheme.interest_rate) : 0,
      min_downpayment_percent: scheme?.min_downpayment_percent ? Number(scheme.min_downpayment_percent) : 20,
      late_fee_percentage: scheme?.late_fee_percentage ? Number(scheme.late_fee_percentage) : 2,
      grace_period_days: scheme?.grace_period_days ?? 5,
      is_active: scheme?.is_active ?? true,
    }
  });

  const onSubmit = async (data: SchemeFormData) => {
    try {
      if (isEditing) {
        await updateScheme.mutateAsync({ id: scheme.id, data });
      } else {
        await createScheme.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert("Failed to save scheme.");
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '24px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <h2 style={{ fontSize: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} color="var(--brand-primary)" />
          {isEditing ? 'Edit Installment Scheme' : 'New Installment Scheme'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Scheme Name *</label>
            <input {...register('name')} placeholder="e.g. 12 Months Easy Pay" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-tertiary)', border: `1px solid ${errors.name ? 'var(--status-error)' : 'var(--border-color)'}`, borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }} />
            {errors.name && <span style={{ fontSize: '11px', color: 'var(--status-error)' }}>{errors.name.message}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>No. of Installments *</label>
              <input type="number" {...register('terms', { valueAsNumber: true })} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Frequency *</label>
              <select {...register('frequency')} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Percent size={12}/> Interest Rate</label>
              <input type="number" step="0.01" {...register('interest_rate', { valueAsNumber: true })} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Percent size={12}/> Min Downpayment</label>
              <input type="number" step="0.01" {...register('min_downpayment_percent', { valueAsNumber: true })} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Percent size={12}/> Late Fee</label>
              <input type="number" step="0.01" {...register('late_fee_percentage', { valueAsNumber: true })} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Grace Period (Days)</label>
              <input type="number" {...register('grace_period_days', { valueAsNumber: true })} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
          </div>

          {isEditing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <input type="checkbox" id="is_active" {...register('is_active')} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              <label htmlFor="is_active" style={{ fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}>Scheme is Active (Available for Sales)</label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={createScheme.isPending || updateScheme.isPending} style={{ padding: '10px 20px', background: 'var(--brand-primary)', border: 'none', color: 'white', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
              {isEditing ? 'Save Changes' : 'Create Scheme'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
