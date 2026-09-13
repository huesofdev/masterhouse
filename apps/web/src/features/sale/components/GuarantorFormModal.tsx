import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Image as ImageIcon, UploadCloud } from 'lucide-react';

const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
const mobileRegex = /^0[0-9]{9}$/;

const guarantorSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  nic: z.string().regex(nicRegex, "Enter a valid Sri Lankan NIC (9 digits + V/X, or 12 digits)"),
  mobile: z.string().regex(mobileRegex, "Enter a valid 10-digit mobile number starting with 0"),
  address: z.string().min(5, "Address is required"),
});


type GuarantorFormData = z.infer<typeof guarantorSchema>;

export function GuarantorFormModal({
  onClose,
  onSuccess,
  initialData
}: {
  onClose: () => void;
  onSuccess: (data: any) => void;
  initialData?: any;
}) {
  const [frontFile, setFrontFile] = useState<File | null>(initialData?.frontFile || null);
  const [backFile, setBackFile] = useState<File | null>(initialData?.backFile || null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<GuarantorFormData>({
    resolver: zodResolver(guarantorSchema as any),
    defaultValues: {
      full_name: initialData?.full_name || '',
      nic: initialData?.nic || '',
      mobile: initialData?.mobile || '',
      address: initialData?.address || '',
    }
  });

  const onSubmit = (data: GuarantorFormData) => {
    if (!frontFile || !backFile) {
      alert("Both front and back images of the Guarantor's NIC are required.");
      return;
    }
    onSuccess({
      ...data,
      frontFile,
      backFile
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>
          New Guarantor Details
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Basic Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name *</label>
              <input {...register('full_name')} style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: `1px solid ${errors.full_name ? 'var(--status-error)' : 'var(--border-color)'}`, borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }} />
              {errors.full_name && <span style={{ fontSize: '11px', color: 'var(--status-error)' }}>{errors.full_name.message}</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>NIC Number *</label>
              <input {...register('nic')} style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: `1px solid ${errors.nic ? 'var(--status-error)' : 'var(--border-color)'}`, borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }} />
              {errors.nic && <span style={{ fontSize: '11px', color: 'var(--status-error)' }}>{errors.nic.message}</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mobile Number *</label>
              <input {...register('mobile')} style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: `1px solid ${errors.mobile ? 'var(--status-error)' : 'var(--border-color)'}`, borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }} />
              {errors.mobile && <span style={{ fontSize: '11px', color: 'var(--status-error)' }}>{errors.mobile.message}</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Address *</label>
              <input {...register('address')} style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: `1px solid ${errors.address ? 'var(--status-error)' : 'var(--border-color)'}`, borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }} />
              {errors.address && <span style={{ fontSize: '11px', color: 'var(--status-error)' }}>{errors.address.message}</span>}
            </div>
          </div>

          {/* Document Uploads */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)', fontWeight: 600 }}>
              <ImageIcon size={16} /> NIC Documents
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Front Side */}
              <div 
                onClick={() => frontInputRef.current?.click()}
                style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-primary)' }}
              >
                <input 
                  type="file" 
                  ref={frontInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                  onChange={e => setFrontFile(e.target.files?.[0] || null)}
                />
                <UploadCloud size={24} color="var(--text-secondary)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{frontFile ? frontFile.name : 'Upload Front Side'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>JPG, PNG</div>
              </div>

              {/* Back Side */}
              <div 
                onClick={() => backInputRef.current?.click()}
                style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-primary)' }}
              >
                <input 
                  type="file" 
                  ref={backInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                  onChange={e => setBackFile(e.target.files?.[0] || null)}
                />
                <UploadCloud size={24} color="var(--text-secondary)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{backFile ? backFile.name : 'Upload Back Side'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>JPG, PNG</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" style={{ padding: '10px 20px', background: 'var(--brand-primary)', border: 'none', color: 'white', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
              Save Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
