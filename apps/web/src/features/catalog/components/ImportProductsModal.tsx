import { useState, useRef } from 'react';
import { X, Upload, Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../../../lib/axios';

interface ImportProductsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportProductsModal({ onClose, onSuccess }: ImportProductsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ processed: number; created: number; updated: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      const res = await apiClient.get('/catalog/products/bulk-template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Products_Bulk_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error('Failed to download template', err);
      alert('Failed to download template');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/catalog/products/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data.data);
    } catch (err: any) {
      console.error('Failed to upload', err);
      alert(err.response?.data?.message || 'Failed to upload products');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass-panel" style={{
        background: 'var(--bg-primary)',
        width: '100%', maxWidth: '600px',
        borderRadius: 'var(--border-radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px', borderBottom: '1px solid var(--border-color)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Bulk Import Products
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          {!result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 8px 0' }}>Step 1: Download Template</h3>
                <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Download our Excel template to see the required format. Do not change the header names.
                </p>
                <button onClick={handleDownloadTemplate} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} />
                  Download Template
                </button>
              </div>

              <div style={{ padding: '16px', border: '2px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 8px 0' }}>Step 2: Upload Excel File</h3>
                <input 
                  type="file" 
                  accept=".xlsx" 
                  style={{ display: 'none' }} 
                  ref={fileInputRef}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '12px 0' }}
                >
                  <Upload size={16} />
                  Select File
                </button>
                {file && <p style={{ margin: 0, color: 'var(--brand-primary)', fontWeight: 500 }}>Selected: {file.name}</p>}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--status-success)' }}>
                <CheckCircle size={32} />
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Import Completed</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{result.processed}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Processed</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-success)' }}>{result.created}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Created</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand-primary)' }}>{result.updated}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Updated</div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-error)', margin: '0 0 8px 0' }}>
                    <AlertCircle size={16} />
                    {result.errors.length} Errors Found
                  </h4>
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '12px', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                    {result.errors.map((err, i) => (
                      <div key={i} style={{ color: 'var(--status-error)', fontSize: '0.875rem', marginBottom: '4px' }}>• {err}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px', borderTop: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'flex-end', gap: '12px'
        }}>
          {!result ? (
            <>
              <button onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
              <button onClick={handleUpload} className="btn-primary" disabled={!file || loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loading && <Loader2 size={16} className="spin" />}
                Upload & Import
              </button>
            </>
          ) : (
            <button onClick={handleFinish} className="btn-primary">Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
