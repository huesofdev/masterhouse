import React, { useState } from 'react';
import { Layout, X, Image as ImageIcon } from 'lucide-react';

const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas is empty'));
          const newFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(newFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
import { useGetExpenses, useCreateExpense, useGetCategories } from '../api';
import { apiClient } from '../../../lib/axios';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { useTableUrlState } from '../../../hooks/useTableUrlState';

export default function ExpensesPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  // Filters
  const {
    startDate,
    endDate,
    filterCategoryId,
    setFilters,
  } = useTableUrlState({
    defaultValues: {
      startDate: '',
      endDate: '',
      filterCategoryId: '',
    },
  });

  const { data: expenses, isLoading, refetch } = useGetExpenses({ startDate, endDate, categoryId: filterCategoryId });
  const { data: categories } = useGetCategories();
  const createExpense = useCreateExpense();

  // Form State
  const [amount, setAmount] = useState('');

  const [categoryId, setCategoryId] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !expenseDate) {
      alert('Please fill required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      let receipt_url = '';
      if (receiptFile) {
        const compressedFile = await compressImage(receiptFile);
        const formData = new FormData();
        formData.append('file', compressedFile);
        const uploadRes = await apiClient.post<{ key: string }>('/sync/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        receipt_url = uploadRes.data.key; // Using the key as url/identifier
      }

      await createExpense.mutateAsync({
        amount: parseFloat(amount),
        category_id: categoryId,
        expense_date: expenseDate,
        description,
        receipt_url,
      });

      alert('Expense added successfully');
      setIsAddModalOpen(false);
      setAmount('');
      setCategoryId('');
      setDescription('');
      setReceiptFile(null);
    } catch (error) {
      console.error(error);
      alert('Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Layout size={24} color="var(--brand-primary)" />
            Branch Expenses
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>Log and track daily operational costs.</p>
        </div>
        <PermissionGuard permission="expenses:create" behavior="disable">
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{ background: 'var(--brand-primary)', color: 'white', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            + Add Expense
          </button>
        </PermissionGuard>
      </div>

      <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</label>
          <input type="date" value={startDate} onChange={e => setFilters({ startDate: e.target.value })} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none' }} />
        </div>
        <div>
          <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Date</label>
          <input type="date" value={endDate} onChange={e => setFilters({ endDate: e.target.value })} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none' }} />
        </div>
        <div>
          <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
          <select value={filterCategoryId} onChange={e => setFilters({ filterCategoryId: e.target.value })} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none' }}>
            <option value="">All Categories</option>
            {categories?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button onClick={() => refetch()} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
          Filter
        </button>
        {(startDate || endDate || filterCategoryId) && (
          <button onClick={() => { setFilters({ startDate: '', endDate: '', filterCategoryId: '' }); }} style={{ color: 'var(--text-secondary)', padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '14px' }}>Date</th>
              <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '14px' }}>Category</th>
              <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '14px' }}>Description</th>
              <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '14px' }}>Amount</th>
              <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '14px' }}>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</td></tr>
            ) : expenses?.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>No expenses found.</td></tr>
            ) : (
              expenses?.map((ex: any) => {
                const cat = categories?.find(c => c.id === ex.category_id);
                return (
                  <tr key={ex.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{new Date(ex.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: 'var(--bg-tertiary)', color: 'var(--brand-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                        {cat?.name || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{ex.description || '-'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-primary)', fontWeight: 700 }}>Rs. {Number(ex.amount).toLocaleString()}</td>
                    <td style={{ padding: '12px' }}>
                      {ex.receipt_signed_url ? (
                        <button onClick={() => setPreviewImageUrl(ex.receipt_signed_url)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                          <ImageIcon size={14} /> View
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No Receipt</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '450px', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Add Expense</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>Category *</label>
                <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ width: '100%', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}>
                  <option value="">Select Category</option>
                  {categories?.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>Amount (Rs.) *</label>
                <input required type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '100%', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>Date *</label>
                <input required type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} style={{ width: '100%', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>Description (Optional)</label>
                <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} placeholder="E.g. Fuel for route 1" />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>Receipt Image (Optional)</label>
                <input type="file" accept="image/*" onChange={e => setReceiptFile(e.target.files?.[0] || null)} style={{ width: '100%', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: '8px 16px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={{ background: 'var(--brand-primary)', color: 'white', padding: '8px 24px', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewImageUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ position: 'relative', background: 'var(--bg-primary)', padding: '8px', borderRadius: '8px', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button onClick={() => setPreviewImageUrl(null)} style={{ position: 'absolute', top: '-16px', right: '-16px', background: 'var(--status-error)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} />
            </button>
            <img src={previewImageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 16px)', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
        </div>
      )}
    </div>
  );
}
