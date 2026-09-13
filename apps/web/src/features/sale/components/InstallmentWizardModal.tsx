import { useState, useEffect } from 'react';
import { useCustomerSearch, useInstallmentSchemes } from '../api';
import { useCreateCustomer, useCustomerDetails } from '../../customers/api';
import { User, Shield, CreditCard, CheckCircle2, Search, Plus, ArrowLeft, Upload, Loader2 } from 'lucide-react';
import { apiClient } from '../../../lib/axios';

export function InstallmentWizardModal({ 
  cart,
  cartTotal, 
  onCancel, 
  onConfirm 
}: { 
  cart: any[];
  cartTotal: number; 
  onCancel: () => void; 
  onConfirm: (data: any) => void;
}) {
  const [step, setStep] = useState(1);
  
  // Step 1: Customer
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ full_name: '', nic: '', mobile: '', address: '', nic_front_url: '', nic_back_url: '' });
  const [cNicFrontFile, setCNicFrontFile] = useState<File | null>(null);
  const [cNicBackFile, setCNicBackFile] = useState<File | null>(null);
  
  // Step 2: Scheme & Downpayment
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('');
  const [downpayment, setDownpayment] = useState<number | ''>('');
  
  // Step 3: Guarantor
  const [selectedGuarantorId, setSelectedGuarantorId] = useState<string>('');
  const [isCreatingGuarantor, setIsCreatingGuarantor] = useState(false);
  const [newGuarantor, setNewGuarantor] = useState<any>({ full_name: '', nic: '', mobile: '', address: '' });
  const [gNicFrontFile, setGNicFrontFile] = useState<File | null>(null);
  const [gNicBackFile, setGNicBackFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Hooks
  const { data: searchResults, isLoading: isSearching } = useCustomerSearch(customerQuery);
  const { data: schemes, isLoading: isLoadingSchemes } = useInstallmentSchemes();
  const createCustomerMutation = useCreateCustomer();
  
  // Only fetch customer details if a customer is selected, to get existing guarantors
  const { data: customerDetails, isLoading: isLoadingCustomerDetails } = useCustomerDetails(selectedCustomer?.id || '');

  const selectedScheme = schemes?.find(s => s.id === selectedSchemeId);
  const minDownpayment = selectedScheme ? cart.reduce((sum, item) => {
    const flatDp = (parseFloat(item.min_downpayment_amount || "0")) * item.quantity;
    const baseLineTotal = (item.unit_price || item.price || 0) * item.quantity;
    
    let actualDiscount = 0;
    if (item.discount_input) {
      if (item.discount_input.endsWith('%')) {
        const amt = parseFloat(item.discount_input.replace('%', '')) || 0;
        actualDiscount = (baseLineTotal * amt) / 100;
      } else if (item.discount_input.startsWith('*')) {
        const amt = parseFloat(item.discount_input.replace('*', '')) || 0;
        actualDiscount = amt * item.quantity;
      } else {
        actualDiscount = parseFloat(item.discount_input) || 0;
      }
    }
    
    const lineTotal = baseLineTotal - actualDiscount;
    const schemeDp = (lineTotal * parseFloat(selectedScheme.min_downpayment_percent)) / 100;
    return sum + Math.max(flatDp, schemeDp);
  }, 0) : 0;
  const isDownpaymentValid = selectedScheme && typeof downpayment === 'number' && downpayment >= minDownpayment;

  // Set default downpayment when scheme changes
  useEffect(() => {
    if (selectedScheme) {
      setDownpayment(minDownpayment);
    }
  }, [selectedSchemeId, minDownpayment, selectedScheme]);

  const handleNext = async () => {
    if (step === 1) {
      if (isCreatingCustomer) {
        if (!newCustomer.full_name || !newCustomer.mobile) return alert('Name and Mobile required');
        
        let frontUrl = '';
        let backUrl = '';
        
        setIsUploading(true);
        try {
          if (cNicFrontFile) {
            const fd = new FormData(); fd.append('file', cNicFrontFile);
            const res = await apiClient.post('/sync/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            frontUrl = res.data.key;
          }
          if (cNicBackFile) {
            const fd = new FormData(); fd.append('file', cNicBackFile);
            const res = await apiClient.post('/sync/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            backUrl = res.data.key;
          }
        } catch (e) {
          setIsUploading(false);
          return alert('Failed to upload customer NIC images.');
        }
        setIsUploading(false);

        const res = await createCustomerMutation.mutateAsync({
          ...newCustomer,
          nic_front_url: frontUrl,
          nic_back_url: backUrl
        });
        setSelectedCustomer({ id: res.id, ...newCustomer, nic_front_url: frontUrl, nic_back_url: backUrl });
        setIsCreatingCustomer(false);
      } else if (!selectedCustomer) {
        return;
      }
    }
    
    if (step === 2 && !isDownpaymentValid) return;
    
    if (step === 3) {
      if (isCreatingGuarantor) {
        if (!newGuarantor.full_name || !newGuarantor.nic) return alert('Guarantor Name and NIC required');
        if (!gNicFrontFile || !gNicBackFile) return alert('Guarantor NIC Front and Back images are required');
        
        setIsUploading(true);
        try {
          const frontFormData = new FormData();
          frontFormData.append('file', gNicFrontFile);
          const backFormData = new FormData();
          backFormData.append('file', gNicBackFile);
          
          const [frontRes, backRes] = await Promise.all([
            apiClient.post('/sync/upload', frontFormData, { headers: { 'Content-Type': 'multipart/form-data' } }),
            apiClient.post('/sync/upload', backFormData, { headers: { 'Content-Type': 'multipart/form-data' } })
          ]);
          
          setNewGuarantor((prev: any) => ({
            ...prev,
            nic_front_url: frontRes.data.key,
            nic_back_url: backRes.data.key
          }));
        } catch (e) {
          setIsUploading(false);
          return alert('Failed to upload NIC images. Please try again.');
        }
        setIsUploading(false);
      } else if (!selectedGuarantorId) {
        return alert('Please select or create a guarantor');
      }
    }
    
    if (step === 4) {
      onConfirm({
        customer_id: selectedCustomer.id,
        scheme_id: selectedScheme.id,
        downpayment: downpayment,
        guarantor_id: !isCreatingGuarantor ? selectedGuarantorId : undefined,
        new_guarantor: isCreatingGuarantor ? newGuarantor : undefined
      });
      return;
    }
    setStep(s => s + 1);
  };

  const calculateInstallment = () => {
    if (!selectedScheme) return 0;
    const dp = typeof downpayment === 'number' ? downpayment : 0;
    const principal = cartTotal - dp;
    const interest = principal * (parseFloat(selectedScheme.interest_rate) / 100);
    return (principal + interest) / selectedScheme.terms;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ width: '600px', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header Progress */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Installment Setup</h2>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-primary)', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 12px', borderRadius: '12px' }}>
            Step {step} of 4
          </span>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', minHeight: '400px', maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* Step 1: Customer */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)' }}>
                  <User size={20} />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Customer Details</h3>
                </div>
                {!isCreatingCustomer ? (
                  <button onClick={() => setIsCreatingCustomer(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    <Plus size={16} /> New Customer
                  </button>
                ) : (
                  <button onClick={() => setIsCreatingCustomer(false)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    <ArrowLeft size={16} /> Back to Search
                  </button>
                )}
              </div>

              {isCreatingCustomer ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input placeholder="Full Name *" value={newCustomer.full_name} onChange={e => setNewCustomer({...newCustomer, full_name: e.target.value})} style={{ gridColumn: 'span 2', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  <input placeholder="Mobile Number *" value={newCustomer.mobile} onChange={e => setNewCustomer({...newCustomer, mobile: e.target.value})} style={{ padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  <input placeholder="NIC Number" value={newCustomer.nic} onChange={e => setNewCustomer({...newCustomer, nic: e.target.value})} style={{ padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  <input placeholder="Address" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} style={{ gridColumn: 'span 2', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  
                  <div style={{ gridColumn: 'span 2', borderTop: '1px dashed var(--border-color)', marginTop: '4px', paddingTop: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>OPTIONAL MEDIA</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', background: 'var(--bg-primary)', border: `1px dashed ${cNicFrontFile ? 'var(--brand-primary)' : 'var(--border-color)'}`, borderRadius: '6px', cursor: 'pointer' }}>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setCNicFrontFile(e.target.files?.[0] || null)} />
                        {cNicFrontFile ? <CheckCircle2 size={20} color="var(--brand-primary)" /> : <Upload size={20} color="var(--text-muted)" />}
                        <span style={{ fontSize: '11px', marginTop: '6px', color: cNicFrontFile ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>{cNicFrontFile ? 'NIC Front Selected' : 'Upload NIC Front'}</span>
                      </label>
                      <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', background: 'var(--bg-primary)', border: `1px dashed ${cNicBackFile ? 'var(--brand-primary)' : 'var(--border-color)'}`, borderRadius: '6px', cursor: 'pointer' }}>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setCNicBackFile(e.target.files?.[0] || null)} />
                        {cNicBackFile ? <CheckCircle2 size={20} color="var(--brand-primary)" /> : <Upload size={20} color="var(--text-muted)" />}
                        <span style={{ fontSize: '11px', marginTop: '6px', color: cNicBackFile ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>{cNicBackFile ? 'NIC Back Selected' : 'Upload NIC Back'}</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} size={16} />
                    <input 
                      value={customerQuery}
                      onChange={e => setCustomerQuery(e.target.value)}
                      placeholder="Search by NIC, Name, or Mobile..."
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 36px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                    {isSearching && <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Searching...</p>}
                    {!isSearching && customerQuery && searchResults?.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No customers found.</p>}
                    {!isSearching && searchResults?.map(customer => (
                      <div 
                        key={customer.id} 
                        onClick={() => setSelectedCustomer(customer)}
                        style={{ 
                          padding: '12px', border: `1px solid ${selectedCustomer?.id === customer.id ? 'var(--brand-primary)' : 'var(--border-color)'}`, 
                          borderRadius: '8px', cursor: 'pointer', background: selectedCustomer?.id === customer.id ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-primary)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{customer.full_name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>NIC: {customer.nic || 'N/A'} | Mobile: {customer.mobile}</div>
                        </div>
                        {selectedCustomer?.id === customer.id && <CheckCircle2 size={20} color="var(--brand-primary)" />}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Scheme & Downpayment */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)' }}>
                <CreditCard size={20} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Scheme & Downpayment</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Installment Scheme</label>
                {isLoadingSchemes ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading schemes...</p>
                ) : (
                  <select 
                    value={selectedSchemeId}
                    onChange={e => setSelectedSchemeId(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}
                  >
                    <option value="">-- Choose Installment Scheme --</option>
                    {schemes?.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.terms} {s.frequency.toLowerCase()}s @ {s.interest_rate}%)</option>
                    ))}
                  </select>
                )}
              </div>

              {selectedScheme && (
                <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Cart Total</span>
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>Rs. {cartTotal.toFixed(2)}</span>
                  </div>
                  
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Downpayment Collected (Rs.)</span>
                    <input 
                      type="number"
                      value={downpayment}
                      onChange={e => setDownpayment(e.target.value ? parseFloat(e.target.value) : '')}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px', background: 'var(--bg-primary)', border: `1px solid ${isDownpaymentValid ? 'var(--border-color)' : 'var(--status-error)'}`, borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', fontSize: '16px', fontWeight: 600 }}
                    />
                  </label>
                  <div style={{ fontSize: '12px', marginTop: '8px', color: isDownpaymentValid ? 'var(--status-success)' : 'var(--status-error)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isDownpaymentValid ? <CheckCircle2 size={14} /> : null}
                    Minimum Required: Rs. {minDownpayment.toFixed(2)} ({selectedScheme.min_downpayment_percent}%)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Guarantor */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)' }}>
                  <Shield size={20} />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Guarantor Details</h3>
                </div>
                {!isCreatingGuarantor ? (
                  <button onClick={() => { setIsCreatingGuarantor(true); setSelectedGuarantorId(''); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    <Plus size={16} /> New Guarantor
                  </button>
                ) : (
                  <button onClick={() => setIsCreatingGuarantor(false)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    <ArrowLeft size={16} /> Use Existing
                  </button>
                )}
              </div>
              
              {!isCreatingGuarantor ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {isLoadingCustomerDetails ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading existing guarantors...</p>
                  ) : customerDetails?.guarantors?.length === 0 ? (
                    <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', textAlign: 'center', border: '1px dashed var(--border-color)' }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>This customer has no guarantors on file.</p>
                      <button onClick={() => setIsCreatingGuarantor(true)} style={{ padding: '8px 16px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        Create New Guarantor
                      </button>
                    </div>
                  ) : (
                    customerDetails?.guarantors?.map((g: any) => (
                      <div 
                        key={g.id} 
                        onClick={() => setSelectedGuarantorId(g.id)}
                        style={{ 
                          padding: '12px 16px', border: `1px solid ${selectedGuarantorId === g.id ? 'var(--brand-primary)' : 'var(--border-color)'}`, 
                          borderRadius: '8px', cursor: 'pointer', background: selectedGuarantorId === g.id ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-tertiary)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{g.full_name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>NIC: {g.nic} | Mobile: {g.mobile}</div>
                        </div>
                        {selectedGuarantorId === g.id && <CheckCircle2 size={20} color="var(--brand-primary)" />}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input placeholder="Full Name *" value={newGuarantor.full_name} onChange={e => setNewGuarantor({...newGuarantor, full_name: e.target.value})} style={{ gridColumn: 'span 2', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  <input placeholder="NIC Number *" value={newGuarantor.nic} onChange={e => setNewGuarantor({...newGuarantor, nic: e.target.value})} style={{ padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  <input placeholder="Mobile Number" value={newGuarantor.mobile} onChange={e => setNewGuarantor({...newGuarantor, mobile: e.target.value})} style={{ padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  <input placeholder="Address" value={newGuarantor.address} onChange={e => setNewGuarantor({...newGuarantor, address: e.target.value})} style={{ gridColumn: 'span 2', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  
                  <div style={{ gridColumn: 'span 2', borderTop: '1px dashed var(--border-color)', marginTop: '8px', paddingTop: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>REQUIRED MEDIA</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'var(--bg-primary)', border: `1px dashed ${gNicFrontFile ? 'var(--brand-primary)' : 'var(--border-color)'}`, borderRadius: '6px', cursor: 'pointer' }}>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setGNicFrontFile(e.target.files?.[0] || null)} />
                        {gNicFrontFile ? <CheckCircle2 size={24} color="var(--brand-primary)" /> : <Upload size={24} color="var(--text-muted)" />}
                        <span style={{ fontSize: '12px', marginTop: '8px', color: gNicFrontFile ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>{gNicFrontFile ? 'NIC Front Selected' : 'Upload NIC Front *'}</span>
                      </label>
                      <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'var(--bg-primary)', border: `1px dashed ${gNicBackFile ? 'var(--brand-primary)' : 'var(--border-color)'}`, borderRadius: '6px', cursor: 'pointer' }}>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setGNicBackFile(e.target.files?.[0] || null)} />
                        {gNicBackFile ? <CheckCircle2 size={24} color="var(--brand-primary)" /> : <Upload size={24} color="var(--text-muted)" />}
                        <span style={{ fontSize: '12px', marginTop: '8px', color: gNicBackFile ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>{gNicBackFile ? 'NIC Back Selected' : 'Upload NIC Back *'}</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && selectedScheme && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <CheckCircle2 size={32} color="var(--status-success)" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Review Installment Terms</h3>
              
              <div style={{ background: 'var(--bg-tertiary)', padding: '20px', borderRadius: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Customer</span> <strong style={{ fontWeight: 600 }}>{selectedCustomer?.full_name}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Guarantor</span> <strong style={{ fontWeight: 600 }}>{isCreatingGuarantor ? newGuarantor.full_name : customerDetails?.guarantors?.find((g:any) => g.id === selectedGuarantorId)?.full_name}</strong></div>
                
                <div style={{ borderBottom: '1px dashed var(--border-color)', margin: '4px 0' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Product Total</span> <strong style={{ fontWeight: 600 }}>Rs. {cartTotal.toFixed(2)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-success)' }}><span>Downpayment</span> <strong style={{ fontWeight: 600 }}>- Rs. {typeof downpayment === 'number' ? downpayment.toFixed(2) : '0.00'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Principal</span> <strong style={{ fontWeight: 600 }}>Rs. {(cartTotal - (typeof downpayment === 'number' ? downpayment : 0)).toFixed(2)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Interest Rate</span> <strong style={{ fontWeight: 600 }}>{selectedScheme.interest_rate}%</strong></div>
                
                <div style={{ borderBottom: '1px dashed var(--border-color)', margin: '4px 0' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(245, 158, 11, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: 600, textTransform: 'uppercase' }}>Installment Amount</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedScheme.terms} x {selectedScheme.frequency} Payments</span>
                  </div>
                  <strong style={{ fontSize: '18px', color: 'var(--brand-primary)' }}>Rs. {calculateInstallment().toFixed(2)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', background: 'var(--bg-primary)' }}>
          <button 
            onClick={step === 1 ? onCancel : () => setStep(s => s - 1)}
            style={{ flex: 1, padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          <button 
            onClick={handleNext}
            disabled={
              (step === 1 && !selectedCustomer && !isCreatingCustomer) || 
              (step === 2 && !isDownpaymentValid) ||
              (step === 3 && !selectedGuarantorId && !isCreatingGuarantor) ||
              createCustomerMutation.isPending ||
              isUploading
            }
            style={{ flex: 2, padding: '12px', background: 'var(--brand-primary)', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s, opacity 0.2s', opacity: (createCustomerMutation.isPending || isUploading) ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-cta)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--brand-primary)'}
          >
            {(createCustomerMutation.isPending || isUploading) && <Loader2 size={16} className="animate-spin" />}
            {isUploading ? 'Uploading Media...' : createCustomerMutation.isPending ? 'Processing...' : step === 4 ? 'Confirm & Create Contract' : 'Next Step'}
          </button>
        </div>
      </div>
    </div>
  );
}
