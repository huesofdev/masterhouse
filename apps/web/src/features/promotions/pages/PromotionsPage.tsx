import { useState } from 'react';
import { usePromotions, useDeletePromotion } from '../api';
import { PromotionForm } from '../components/PromotionForm';
import { Plus, Edit2, Trash2, Search, Tag } from 'lucide-react';
import type { Promotion } from '../types';

export function PromotionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: promotions, isLoading } = usePromotions();
  const deleteMutation = useDeletePromotion();

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingPromotion(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this promotion?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const filteredPromotions = promotions?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Tag size={28} className="text-brand" />
          Promotions Engine
        </h1>
        <button 
          className="btn-primary" 
          onClick={handleCreate}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} />
          Create Promotion
        </button>
      </div>

      <div className="glass-panel" style={{ padding: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', flex: 1 }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center' }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'var(--bg-tertiary)', 
            padding: '8px 12px', 
            borderRadius: 'var(--border-radius-sm)',
            border: '1px solid var(--border-color)',
            flex: 1,
            maxWidth: '400px'
          }}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search promotions..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading promotions...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px', fontWeight: 600, fontSize: '0.875rem' }}>Name</th>
                  <th style={{ padding: '12px', fontWeight: 600, fontSize: '0.875rem' }}>Discount</th>
                  <th style={{ padding: '12px', fontWeight: 600, fontSize: '0.875rem' }}>Start Date</th>
                  <th style={{ padding: '12px', fontWeight: 600, fontSize: '0.875rem' }}>End Date</th>
                  <th style={{ padding: '12px', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                  <th style={{ padding: '12px', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPromotions?.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No promotions found.
                    </td>
                  </tr>
                ) : filteredPromotions?.map((promo) => (
                  <tr key={promo.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 500 }}>{promo.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{promo.description}</div>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>
                      {promo.discount_type === 'PERCENTAGE' ? `${promo.discount_value}%` : `Rs. ${Number(promo.discount_value).toFixed(2)}`}
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.875rem' }}>
                      {new Date(promo.start_date).toLocaleString('en-GB')}
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.875rem' }}>
                      {new Date(promo.end_date).toLocaleString('en-GB')}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        background: promo.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: promo.is_active ? 'var(--status-success)' : 'var(--status-error)'
                      }}>
                        {promo.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button onClick={() => handleEdit(promo)} style={{ background: 'transparent', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', marginRight: '8px' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(promo.id)} style={{ background: 'transparent', border: 'none', color: 'var(--status-error)', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen && (
        <PromotionForm 
          promotion={editingPromotion} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}
    </div>
  );
}
