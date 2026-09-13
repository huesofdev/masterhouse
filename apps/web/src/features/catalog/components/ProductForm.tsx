import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormValues, type Product } from '../types';
import { useCategories, useCreateCategory, useBrands, useCreateBrand } from '../api';
import { Combobox } from '../../../components/Combobox';
import { apiClient } from '../../../lib/axios';
import { ImageCropper } from '../../../components/ImageCropper';
import { X, Plus, Check, Edit2 } from 'lucide-react';

const inputStyle = (hasError?: boolean) => ({
  width: '100%', padding: '10px 12px',
  background: 'var(--bg-tertiary)',
  border: `1px solid ${hasError ? 'var(--status-error)' : 'var(--border-color)'}`,
  borderRadius: 'var(--border-radius-sm)',
  color: 'var(--text-primary)', outline: 'none',
  fontSize: 'var(--font-size-sm)',
});

const labelStyle = {
  fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)'
};

const fieldStyle = {
  display: 'flex', flexDirection: 'column' as const, gap: '4px'
};

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (data: ProductFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProductForm({ product, onSubmit, onCancel, isLoading }: ProductFormProps) {
  const { data: categories } = useCategories();
  const createCategoryMutation = useCreateCategory();
  
  const { data: brands } = useBrands();
  const createBrandMutation = useCreateBrand();
  
  const isEditing = !!product;

  const [isQuickAddingCategory, setIsQuickAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [isQuickAddingBrand, setIsQuickAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  const { register, control, handleSubmit, formState: { errors }, reset, watch } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema as any),
    defaultValues: {
      category_id: product?.category_id || '',
      brand_id: product?.brand_id || null,
      name: product?.name || '',
      sku: product?.sku || '',
      description: product?.description || '',
      base_price: product?.base_price ? parseFloat(product.base_price) : 0,
      uom: (product?.uom as any) || 'pieces',
      is_serialized: product?.is_serialized ?? false,
      min_downpayment_amount: product?.min_downpayment_amount ? parseFloat(product.min_downpayment_amount) : 0,
      warranty_type: product?.warranty_type || 'NONE',
      warranty_period_years: product?.warranty_period_years ?? 0,
      warranty_period_months: product?.warranty_period_months ?? 0,
      avg_cost: product?.avg_cost ? parseFloat(product.avg_cost) : 0,
      image_url: product?.image_url || null,
      is_active: product?.is_active ?? true,
    }
  });

  const watchWarrantyType = watch('warranty_type');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      reset({
        category_id: product.category_id,
        brand_id: product.brand_id,
        name: product.name,
        sku: product.sku,
        description: product.description || '',
        base_price: parseFloat(product.base_price) || 0,
        uom: product.uom as any,
        is_serialized: product.is_serialized,
        min_downpayment_amount: parseFloat(product.min_downpayment_amount) || 0,
        warranty_type: product.warranty_type,
        warranty_period_years: product.warranty_period_years || 0,
        warranty_period_months: product.warranty_period_months || 0,
        avg_cost: parseFloat(product.avg_cost) || 0,
        image_url: product.image_url,
        is_active: product.is_active,
      });
    }
  }, [product, reset]);

  const handleFormSubmit = async (data: ProductFormValues) => {
    try {
      setIsUploading(true);
      let finalImageUrl = product?.image_url || null;

      if (removeImage) {
        finalImageUrl = null;
      }

      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const uploadRes = await apiClient.post('/sync/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalImageUrl = uploadRes.data.key;
      }

      data.image_url = finalImageUrl;
      onSubmit(data);
    } catch (err) {
      console.error('Upload error', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const uomOptions = [
    { value: 'pieces', label: 'Pieces' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'g', label: 'Grams (g)' },
    { value: 'l', label: 'Litres (l)' },
    { value: 'ml', label: 'Millilitres (ml)' },
    { value: 'box', label: 'Box' },
    { value: 'pack', label: 'Pack' },
  ];

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await createCategoryMutation.mutateAsync({ name: newCategoryName, is_active: true });
      if (res.data?.id) {
        reset({ ...control._formValues, category_id: res.data.id } as any);
      }
      setIsQuickAddingCategory(false);
      setNewCategoryName('');
    } catch (e) {
      console.error(e);
      alert('Failed to create category');
    }
  };

  const handleQuickAddBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      const res = await createBrandMutation.mutateAsync({ name: newBrandName, is_active: true });
      if (res.data?.id) {
        reset({ ...control._formValues, brand_id: res.data.id } as any);
      }
      setIsQuickAddingBrand(false);
      setNewBrandName('');
    } catch (e) {
      console.error(e);
      alert('Failed to create brand');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 'var(--spacing-4)'
    }}>
      {cropImageSrc && (
        <ImageCropper
          imageSrc={cropImageSrc}
          onCancel={() => setCropImageSrc(null)}
          onCropComplete={(file) => {
            setImageFile(file);
            setRemoveImage(false);
            setCropImageSrc(null);
          }}
        />
      )}
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '740px', maxHeight: '90vh',
        overflowY: 'auto', padding: 'var(--spacing-5)', position: 'relative'
      }}>
        <button onClick={onCancel} style={{
          position: 'absolute', top: 'var(--spacing-4)', right: 'var(--spacing-4)',
          background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'
        }}>
          <X size={20} />
        </button>

        <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-4)' }}>
          {isEditing ? 'Edit Product' : 'Create Product'}
        </h2>

        <form onSubmit={handleSubmit(handleFormSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>

          {/* Image Upload */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Product Image (Optional)</label>
            <div style={{ 
              border: '2px dashed var(--border-color)', 
              borderRadius: 'var(--border-radius-md)', 
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '12px',
              background: 'var(--bg-tertiary)',
              position: 'relative'
            }}>
              {(!imageFile && !product?.image_url) || removeImage ? (
                <>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '32px' }}>📸</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Click or drag image to upload
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        setImageFile(file);
                        setRemoveImage(false);
                        e.target.value = ''; // Reset input
                      }
                    }}
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, cursor: 'pointer'
                    }}
                  />
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                  <img 
                    src={imageFile ? URL.createObjectURL(imageFile) : ((product as any)?.image_signed_url || product?.image_url || '')} 
                    alt="Preview" 
                    style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        const src = imageFile ? URL.createObjectURL(imageFile) : ((product as any)?.image_signed_url || product?.image_url || '');
                        if (src) setCropImageSrc(src);
                      }}
                      style={{
                        padding: '6px 16px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', 
                        border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <Edit2 size={14} /> Crop
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setImageFile(null);
                        setRemoveImage(true);
                      }}
                      style={{
                        padding: '6px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
                        border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 1: Name + SKU */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Product Name *</label>
              <input {...register('name')} placeholder="e.g. Samsung Galaxy S24" style={inputStyle(!!errors.name)} />
              {errors.name && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.name.message}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>SKU (Unique) *</label>
              <input {...register('sku')} placeholder="e.g. SAM-S24-256BLK" style={inputStyle(!!errors.sku)} />
              {errors.sku && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.sku.message}</span>}
            </div>
          </div>

          {/* Row 2: Category + UOM */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
            <div style={fieldStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={labelStyle}>Category *</label>
                <button 
                  type="button" 
                  onClick={() => setIsQuickAddingCategory(!isQuickAddingCategory)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}
                >
                  <Plus size={12} /> {isQuickAddingCategory ? 'Cancel' : 'Quick Add'}
                </button>
              </div>
              
              {isQuickAddingCategory ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="New category name" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    style={inputStyle()} 
                  />
                  <button 
                    type="button"
                    onClick={handleQuickAddCategory}
                    disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
                    style={{ background: 'var(--brand-primary)', border: 'none', color: '#fff', padding: '0 12px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    {createCategoryMutation.isPending ? '...' : <Check size={16} />}
                  </button>
                </div>
              ) : (
                <Controller
                  name="category_id"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      options={categories?.filter(c => c.is_active).map(c => ({ value: c.id, label: c.name })) || []}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Search category..."
                      error={!!errors.category_id}
                    />
                  )}
                />
              )}
              {errors.category_id && !isQuickAddingCategory && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.category_id.message}</span>}
            </div>
            
            <div style={fieldStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={labelStyle}>Brand (Optional)</label>
                <button 
                  type="button" 
                  onClick={() => setIsQuickAddingBrand(!isQuickAddingBrand)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}
                >
                  <Plus size={12} /> {isQuickAddingBrand ? 'Cancel' : 'Quick Add'}
                </button>
              </div>
              
              {isQuickAddingBrand ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="New brand name" 
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    style={inputStyle()} 
                  />
                  <button 
                    type="button"
                    onClick={handleQuickAddBrand}
                    disabled={createBrandMutation.isPending || !newBrandName.trim()}
                    style={{ background: 'var(--brand-primary)', border: 'none', color: '#fff', padding: '0 12px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    {createBrandMutation.isPending ? '...' : <Check size={16} />}
                  </button>
                </div>
              ) : (
                <Controller
                  name="brand_id"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      options={brands?.filter(b => b.is_active).map(b => ({ value: b.id, label: b.name })) || []}
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Select brand..."
                      error={!!errors.brand_id}
                    />
                  )}
                />
              )}
              {errors.brand_id && !isQuickAddingBrand && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.brand_id?.message}</span>}
            </div>
            
            <div style={fieldStyle}>
              <label style={labelStyle}>Unit of Measure (UOM)</label>
              <Controller
                name="uom"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={uomOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select UOM..."
                  />
                )}
              />
            </div>
          </div>

          {/* Row 3: Description */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Description</label>
            <textarea
              {...register('description')}
              placeholder="Product description (optional)"
              rows={2}
              style={{ ...inputStyle(), resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Row 4: Retail Price + Downpayment Rate + Warranty */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-4)' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Retail Price (Base) *</label>
              <input
                type="number" step="0.01"
                {...register('base_price', { valueAsNumber: true })}
                placeholder="0.00"
                style={inputStyle(!!errors.base_price)}
              />
              {errors.base_price && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.base_price.message}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Min. Downpayment (Amount Rs.)</label>
              <input
                type="number" step="0.01" min="0"
                {...register('min_downpayment_amount', { valueAsNumber: true })}
                placeholder="e.g. 5000"
                style={inputStyle(!!errors.min_downpayment_amount)}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Guarantee Type</label>
              <select {...register('warranty_type')} style={{ ...inputStyle(!!errors.warranty_type), height: '40px', padding: '0 12px' }}>
                <option value="NONE">None</option>
                <option value="WARRANTY">Warranty</option>
                <option value="GUARANTEE">Guarantee</option>
              </select>
            </div>
          </div>
          
          {watchWarrantyType !== 'NONE' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', marginTop: '-8px' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>{watchWarrantyType === 'WARRANTY' ? 'Warranty' : 'Guarantee'} Period (Years)</label>
                <input
                  type="number" min="0"
                  {...register('warranty_period_years', { valueAsNumber: true })}
                  placeholder="e.g. 1"
                  style={inputStyle(!!errors.warranty_period_years)}
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>{watchWarrantyType === 'WARRANTY' ? 'Warranty' : 'Guarantee'} Period (Months)</label>
                <input
                  type="number" min="0" max="11"
                  {...register('warranty_period_months', { valueAsNumber: true })}
                  placeholder="e.g. 6"
                  style={inputStyle(!!errors.warranty_period_months)}
                />
              </div>
            </div>
          )}

          {/* Row 6: Toggles */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
              <input type="checkbox" id="is_serialized" {...register('is_serialized')} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              Serialized Product <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>(tracks individual serial numbers)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
              <input type="checkbox" id="is_active" {...register('is_active')} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              Active
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
            <button type="button" onClick={onCancel} disabled={isLoading || isUploading} style={{
              padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-primary)', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer'
            }}>Cancel</button>
            <button type="submit" disabled={isLoading || isUploading} style={{
              padding: '8px 20px', background: 'var(--brand-primary)', color: 'var(--bg-primary)',
              border: 'none', borderRadius: 'var(--border-radius-sm)', fontWeight: 600, cursor: 'pointer'
            }}>
              {(isLoading || isUploading) ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
