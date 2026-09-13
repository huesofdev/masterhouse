import { useState, useEffect } from 'react';
import { useGetSettings, useUpdateSettings, useUploadLogo, useGetSmsTemplates, useUpdateSmsTemplate, useGetMe, useGetTaxes, useCreateTax, useUpdateTax, useDeleteTax, useGetSequences, useUpdateSequence } from '../api';
import { useGetCategories, useCreateCategory, useDeleteCategory } from '../../expenses/api';
import { useGetAssetCategories, useCreateAssetCategory, useDeleteAssetCategory } from '../../assets/api';
import { Building, MessageSquare, Save, Upload, AlertCircle, Key, Lock, Receipt, Plus, Trash2, Banknote, Monitor, FileText } from 'lucide-react';
import { PermissionGuard } from '../../../components/PermissionGuard';

// Separate component so it has its own local state — avoids the read-only trap of
// using value= with onChange={() => {}} in a parent-controlled loop.
function TemplateEditor({
  tpl,
  vars,
  onSave,
}: {
  tpl: any;
  vars: { key: string; label: string }[];
  onSave: (body_template: string, is_active: boolean) => void;
}) {
  const [draft, setDraft] = useState(tpl.body_template);

  // Keep in sync if the template refreshes from the server
  useEffect(() => {
    setDraft(tpl.body_template);
  }, [tpl.body_template]);

  return (
    <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>{tpl.trigger_event.replace(/_/g, ' ')}</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
          <input
            type="checkbox"
            checked={tpl.is_active}
            onChange={(e) => onSave(draft, e.target.checked)}
          />
          Active
        </label>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onSave(draft, tpl.is_active)}
        className="input-field"
        style={{ minHeight: '70px', fontFamily: 'monospace', resize: 'vertical', fontSize: '12px' }}
      />

      {/* Variable Reference Chips */}
      {vars.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
            Available variables — click to copy:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {vars.map(v => (
              <button
                key={v.key}
                title={v.label}
                onClick={() => navigator.clipboard.writeText(`{{${v.key}}}`)}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--brand-primary)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <AlertCircle size={11} />
        Click outside the text area to save changes.
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'sms' | 'taxes' | 'expenses' | 'assets' | 'quotations' | 'misc'>('profile');
  
  const { data: me } = useGetMe();
  
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const uploadLogo = useUploadLogo();
  
  const { data: templates } = useGetSmsTemplates();
  const updateTemplate = useUpdateSmsTemplate();

  const { data: taxes } = useGetTaxes();
  const createTax = useCreateTax();
  const updateTax = useUpdateTax();
  const deleteTax = useDeleteTax();

  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('');
  const [newTaxType, setNewTaxType] = useState<'EXCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');

  const { data: expenseCategories } = useGetCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('OPERATIONAL');

  const { data: assetCategories } = useGetAssetCategories();
  const createAssetCategory = useCreateAssetCategory();
  const deleteAssetCategory = useDeleteAssetCategory();
  const [newAssetCategoryName, setNewAssetCategoryName] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [smsEnabled, setSmsEnabled] = useState('true');
  const [smsReminderDays, setSmsReminderDays] = useState('2');
  const [apiKey, setApiKey] = useState('');
  const [senderId, setSenderId] = useState('');
  
  const [quotationValidityDays, setQuotationValidityDays] = useState('30');
  const [quotationTerms, setQuotationTerms] = useState('');
  
  const [partialRecoveryDaysMax, setPartialRecoveryDaysMax] = useState('14');
  const [barcodePrintSize, setBarcodePrintSize] = useState('35x25');
  const [enableOverduePenalties, setEnableOverduePenalties] = useState('true');
  const [overduePenaltyMaxRecurringMonths, setOverduePenaltyMaxRecurringMonths] = useState('3');
  const [overduePenaltyRecurringDaysInterval, setOverduePenaltyRecurringDaysInterval] = useState('30');

  const { data: sequences } = useGetSequences();
  const updateSequence = useUpdateSequence();
  const [invoicePrefix, setInvoicePrefix] = useState('INV-{YYYY}-{MM}-');
  const [invoiceSeq, setInvoiceSeq] = useState('0');
  const [quotePrefix, setQuotePrefix] = useState('QT-{YYYY}-{MM}-');
  const [quoteSeq, setQuoteSeq] = useState('0');
  const [receiptPrefix, setReceiptPrefix] = useState('RCT-{YYYY}-{MM}-');
  const [receiptSeq, setReceiptSeq] = useState('0');
  const [bookingPrefix, setBookingPrefix] = useState('BKG-{ROUTE}-{YYYY}-');
  const [bookingSeq, setBookingSeq] = useState('0');

  // Setup form states when settings load
  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name || '');
      setSmsEnabled(settings.sms_enabled || 'true');
      setSmsReminderDays(settings.sms_reminder_days || '2');
      setApiKey(settings.textlk_api_key || '');
      setSenderId(settings.textlk_sender_id || '');
      setQuotationValidityDays(settings.quotation_validity_days || '30');
      setQuotationTerms(settings.quotation_terms || '• This quotation is valid for 30 days from the date of issue.\n• Prices are subject to change after the validity period.\n• This document is not a tax invoice. A formal invoice will be issued upon confirmation.');
      setPartialRecoveryDaysMax(settings.downpayment_partial_recovery_days_max || '14');
      setBarcodePrintSize(settings.barcode_print_size || '35x25');
      setEnableOverduePenalties(settings.enable_overdue_penalties ?? 'true');
      setOverduePenaltyMaxRecurringMonths(settings.overdue_penalty_max_recurring_months || '3');
      setOverduePenaltyRecurringDaysInterval(settings.overdue_penalty_recurring_days_interval || '30');
    }
  }, [settings]);

  useEffect(() => {
    if (sequences) {
      const inv = sequences.find((s: any) => s.document_type === 'INVOICE');
      if (inv) { setInvoicePrefix(inv.prefix_format); setInvoiceSeq(inv.current_sequence.toString()); }
      const qt = sequences.find((s: any) => s.document_type === 'QUOTATION');
      if (qt) { setQuotePrefix(qt.prefix_format); setQuoteSeq(qt.current_sequence.toString()); }
      const rct = sequences.find((s: any) => s.document_type === 'RECEIPT');
      if (rct) { setReceiptPrefix(rct.prefix_format); setReceiptSeq(rct.current_sequence.toString()); }
      const bkg = sequences.find((s: any) => s.document_type === 'BOOKING');
      if (bkg) { setBookingPrefix(bkg.prefix_format); setBookingSeq(bkg.current_sequence.toString()); }
    }
  }, [sequences]);

  const handleSaveProfile = () => {
    updateSettings.mutate({ company_name: companyName });
  };

  const handleSaveSmsConfigs = () => {
    updateSettings.mutate({ 
      sms_enabled: smsEnabled,
      sms_reminder_days: smsReminderDays,
      textlk_api_key: apiKey,
      textlk_sender_id: senderId
    });
  };

  const handleSaveQuotations = () => {
    updateSettings.mutate({
      quotation_validity_days: quotationValidityDays,
      quotation_terms: quotationTerms
    });
    
    updateSequence.mutate({ documentType: 'INVOICE', prefixFormat: invoicePrefix, currentSequence: parseInt(invoiceSeq) || 0 });
    updateSequence.mutate({ documentType: 'QUOTATION', prefixFormat: quotePrefix, currentSequence: parseInt(quoteSeq) || 0 });
    updateSequence.mutate({ documentType: 'RECEIPT', prefixFormat: receiptPrefix, currentSequence: parseInt(receiptSeq) || 0 });
    updateSequence.mutate({ documentType: 'BOOKING', prefixFormat: bookingPrefix, currentSequence: parseInt(bookingSeq) || 0 });
  };

  const handleSaveMisc = () => {
    updateSettings.mutate({
      downpayment_partial_recovery_days_max: partialRecoveryDaysMax,
      barcode_print_size: barcodePrintSize,
      sms_reminder_days: smsReminderDays,
      enable_overdue_penalties: enableOverduePenalties,
      overdue_penalty_max_recurring_months: overduePenaltyMaxRecurringMonths,
      overdue_penalty_recurring_days_interval: overduePenaltyRecurringDaysInterval
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadLogo.mutate(file);
    }
  };

  if (isLoading) return <div style={{ padding: '24px' }}>Loading settings...</div>;

  const isRank100 = me?.rank === 100;

  return (
    <div style={{ display: 'flex', gap: '32px', padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Sidebar Navigation */}
      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>System Settings</h2>
        
        <button 
          onClick={() => setActiveTab('profile')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
            background: activeTab === 'profile' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            color: activeTab === 'profile' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
            fontWeight: activeTab === 'profile' ? 600 : 500,
            fontSize: '13px'
          }}
        >
          <Building size={16} /> Company Profile
        </button>
        
        <button 
          onClick={() => setActiveTab('sms')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
            background: activeTab === 'sms' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            color: activeTab === 'sms' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
            fontWeight: activeTab === 'sms' ? 600 : 500,
            transition: 'all 0.2s ease',
            fontSize: '13px'
          }}
        >
          <MessageSquare size={16} /> SMS Notifications
        </button>

        <button 
          onClick={() => setActiveTab('taxes')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
            background: activeTab === 'taxes' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            color: activeTab === 'taxes' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
            fontWeight: activeTab === 'taxes' ? 600 : 500,
            transition: 'all 0.2s ease',
            fontSize: '13px'
          }}
        >
          <Receipt size={16} /> Taxes & Duties
        </button>

        <button 
          onClick={() => setActiveTab('expenses')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
            background: activeTab === 'expenses' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            color: activeTab === 'expenses' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
            fontWeight: activeTab === 'expenses' ? 600 : 500,
            transition: 'all 0.2s ease',
            fontSize: '13px'
          }}
        >
          <Banknote size={16} /> Expense Categories
        </button>

        <button 
          onClick={() => setActiveTab('assets')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
            background: activeTab === 'assets' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            color: activeTab === 'assets' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
            fontWeight: activeTab === 'assets' ? 600 : 500,
            transition: 'all 0.2s ease',
            fontSize: '13px'
          }}
        >
          <Monitor size={16} /> Fixed Asset Categories
        </button>

        <button 
          onClick={() => setActiveTab('quotations')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
            background: activeTab === 'quotations' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            color: activeTab === 'quotations' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
            fontWeight: activeTab === 'quotations' ? 600 : 500,
            transition: 'all 0.2s ease',
            fontSize: '13px'
          }}
        >
          <FileText size={16} /> Quotations & Invoices
        </button>

        <button 
          onClick={() => setActiveTab('misc')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
            background: activeTab === 'misc' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            color: activeTab === 'misc' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
            fontWeight: activeTab === 'misc' ? 600 : 500,
            transition: 'all 0.2s ease',
            fontSize: '13px'
          }}
        >
          <AlertCircle size={16} /> Miscellaneous
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Company Profile</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)' }}>Company Name (For POS Invoices)</label>
              <input 
                type="text" 
                className="input-field"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. MasterHouse Furniture"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)' }}>Company Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {settings?.company_logo_signed_url && (
                  <div style={{ width: '60px', height: '60px', background: 'var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden' }}>
                    <img src={settings.company_logo_signed_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                <label style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', 
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', 
                  borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px'
                }}>
                  <Upload size={14} /> {uploadLogo.isPending ? 'Uploading...' : 'Upload New Logo'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} disabled={uploadLogo.isPending} />
                </label>
              </div>
            </div>

            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <PermissionGuard permission="settings:update" behavior="disable">
                <button 
                  onClick={handleSaveProfile}
                  disabled={updateSettings.isPending}
                  className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={14} /> {updateSettings.isPending ? 'Saving...' : 'Save Profile'}
                </button>
              </PermissionGuard>
            </div>
          </div>
        )}

        {/* SMS TAB */}
        {activeTab === 'sms' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-in-out' }}>
            
            {/* Global SMS Toggle */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={16} color="var(--brand-primary)" />
                SMS Service Toggle
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Enable SMS Notifications</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Master toggle to pause or resume all outgoing SMS traffic across the system.</div>
                </div>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                  <input type="checkbox" checked={smsEnabled === 'true'} onChange={e => {
                    const newVal = e.target.checked ? 'true' : 'false';
                    setSmsEnabled(newVal);
                    updateSettings.mutate({ sms_enabled: newVal });
                  }} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ 
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: smsEnabled === 'true' ? 'var(--brand-primary)' : 'var(--bg-tertiary)', 
                    transition: '.4s', borderRadius: '22px' 
                  }}>
                    <span style={{ 
                      position: 'absolute', content: '""', height: '16px', width: '16px', left: '3px', bottom: '3px', 
                      backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                      transform: smsEnabled === 'true' ? 'translateX(18px)' : 'translateX(0)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </span>
                </label>
              </div>
            </div>

            {/* Provider Configuration - PROTECTED */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', opacity: isRank100 ? 1 : 0.6, pointerEvents: isRank100 ? 'auto' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={16} color={isRank100 ? 'var(--brand-primary)' : 'var(--text-muted)'} />
                  Provider Configuration (TextLK)
                </h3>
                {!isRank100 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                    <Lock size={12} /> Requires Rank 100
                  </div>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)' }}>API Key</label>
                  <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="input-field" placeholder={isRank100 ? "sk_..." : "Protected"} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)' }}>Sender ID</label>
                  <input type="text" value={senderId} onChange={e => setSenderId(e.target.value)} className="input-field" placeholder={isRank100 ? "e.g. MasterHouse" : "Protected"} />
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)' }}>SMS Reminder Advance Notice (Days)</label>
                <input type="number" value={smsReminderDays} onChange={e => setSmsReminderDays(e.target.value)} className="input-field" style={{ width: '150px' }} />
              </div>

              {isRank100 && (
                <div style={{ paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <PermissionGuard permission="settings:update" behavior="disable">
                    <button onClick={handleSaveSmsConfigs} disabled={updateSettings.isPending} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Save size={14} /> {updateSettings.isPending ? 'Saving...' : 'Save Credentials'}
                    </button>
                  </PermissionGuard>
                </div>
              )}
            </div>

            {/* Templates */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>SMS Templates</h3>
              
              {templates?.map((tpl: any) => {
                const SMS_VARIABLES: Record<string, { key: string; label: string }[]> = {
                  SALE_CREATED: [
                    { key: 'company_name', label: 'Company Name' },
                    { key: 'name', label: 'Customer Name' },
                    { key: 'product_name', label: 'Product(s)' },
                    { key: 'downpayment', label: 'Downpayment' },
                    { key: 'upcoming_dues_message', label: 'Upcoming Dues Info' },
                    { key: 'terms', label: 'Terms' },
                    { key: 'frequency', label: 'Frequency' },
                    { key: 'bill_total', label: 'Bill Total' },
                    { key: 'remaining_balance', label: 'Remaining Balance' },
                    { key: 'branch_phone', label: 'Branch Phone' },
                    { key: 'branch_address', label: 'Branch Address' },
                  ],
                  DIRECT_SALE_CREATED: [
                    { key: 'company_name', label: 'Company Name' },
                    { key: 'name', label: 'Customer Name' },
                    { key: 'product_name', label: 'Product(s)' },
                    { key: 'paid_amount', label: 'Paid Amount' },
                    { key: 'bill_total', label: 'Bill Total' },
                    { key: 'remaining_balance', label: 'Remaining Balance' },
                    { key: 'branch_phone', label: 'Branch Phone' },
                    { key: 'branch_address', label: 'Branch Address' },
                  ],
                  COLLECTION_RECEIPT: [
                    { key: 'company_name', label: 'Company Name' },
                    { key: 'name', label: 'Customer Name' },
                    { key: 'amount_paid', label: 'Amount Paid' },
                    { key: 'new_balance', label: 'Remaining Balance' },
                    { key: 'receipt_no', label: 'Receipt No.' },
                    { key: 'next_due_date', label: 'Next Due Date' },
                    { key: 'next_due_amount', label: 'Next Due Amount' },
                    { key: 'branch_phone', label: 'Branch Phone' },
                    { key: 'branch_address', label: 'Branch Address' },
                  ],
                  PAYMENT_OVERDUE: [
                    { key: 'company_name', label: 'Company Name' },
                    { key: 'name', label: 'Customer Name' },
                    { key: 'missed_amount', label: 'Missed Amount' },
                    { key: 'penalty_added', label: 'Penalty Added' },
                    { key: 'total_pending', label: 'Total Pending' },
                    { key: 'due_date', label: 'Due Date' },
                    { key: 'grace_period', label: 'Grace Period (Days)' },
                    { key: 'branch_phone', label: 'Branch Phone' },
                    { key: 'branch_address', label: 'Branch Address' },
                  ],
                  PAYMENT_REMINDER: [
                    { key: 'company_name', label: 'Company Name' },
                    { key: 'name', label: 'Customer Name' },
                    { key: 'amount_due', label: 'Amount Due' },
                    { key: 'due_date', label: 'Due Date' },
                    { key: 'grace_period', label: 'Grace Period (Days)' },
                    { key: 'branch_phone', label: 'Branch Phone' },
                    { key: 'branch_address', label: 'Branch Address' },
                  ],
                };
                const vars = SMS_VARIABLES[tpl.trigger_event] || [];

                return (
                  <TemplateEditor
                    key={tpl.id}
                    tpl={tpl}
                    vars={vars}
                    onSave={(body_template, is_active) =>
                      updateTemplate.mutate({ id: tpl.id, updates: { body_template, is_active } })
                    }
                  />
                );
              })}
              
            </div>
          </div>
        )}

        {/* TAXES TAB */}
        {activeTab === 'taxes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-in-out' }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Receipt size={16} color="var(--brand-primary)" />
                Tax Configuration
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {taxes?.map((tax: any) => (
                  <div key={tax.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{tax.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: tax.type === 'INCLUSIVE' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: tax.type === 'INCLUSIVE' ? 'var(--brand-primary)' : 'var(--status-warning)' }}>
                          {tax.type}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Rate: {tax.rate}%
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: tax.is_active ? 'var(--status-success)' : 'var(--text-secondary)' }}>
                        <input 
                          type="checkbox" 
                          checked={tax.is_active} 
                          onChange={(e) => updateTax.mutate({ id: tax.id, updates: { is_active: e.target.checked } })}
                        /> 
                        Active
                      </label>
                      <PermissionGuard permission="settings:update" behavior="disable">
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this tax?')) {
                              deleteTax.mutate(tax.id);
                            }
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--status-error)', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </PermissionGuard>
                    </div>
                  </div>
                ))}
                {taxes?.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                    No taxes configured yet. Add one below.
                  </div>
                )}
              </div>

              <div style={{ marginTop: '12px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>Add New Tax</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Tax Name</label>
                    <input type="text" value={newTaxName} onChange={e => setNewTaxName(e.target.value)} className="input-field" placeholder="e.g. VAT" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Rate (%)</label>
                    <input type="number" step="0.01" value={newTaxRate} onChange={e => setNewTaxRate(e.target.value)} className="input-field" placeholder="e.g. 15.00" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Type</label>
                    <select value={newTaxType} onChange={e => setNewTaxType(e.target.value as any)} className="input-field" style={{ padding: '8px' }}>
                      <option value="EXCLUSIVE">Exclusive</option>
                      <option value="INCLUSIVE">Inclusive</option>
                    </select>
                  </div>
                  <PermissionGuard permission="settings:update" behavior="disable">
                    <button 
                      disabled={!newTaxName || !newTaxRate || createTax.isPending}
                      onClick={() => {
                        createTax.mutate({ name: newTaxName, rate: newTaxRate, type: newTaxType }, {
                          onSuccess: () => {
                            setNewTaxName('');
                            setNewTaxRate('');
                            setNewTaxType('EXCLUSIVE');
                          }
                        });
                      }}
                      className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '38px' }}
                    >
                      <Plus size={16} /> Add Tax
                    </button>
                  </PermissionGuard>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-in-out' }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>Expense Categories</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {expenseCategories?.map((cat: any) => (
                  <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{cat.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Type: {cat.type}</div>
                    </div>
                    <div>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                        background: cat.is_active ? 'var(--status-success-dim)' : 'var(--status-error-dim)',
                        color: cat.is_active ? 'var(--status-success)' : 'var(--status-error)'
                      }}>
                        {cat.is_active ? 'Active' : 'Disabled'}
                      </span>
                      {cat.is_active && (
                        <PermissionGuard permission="settings:update" behavior="hide">
                          <button 
                            onClick={() => {
                              if (confirm('Are you sure you want to disable this category?')) {
                                deleteCategory.mutate(cat.id);
                              }
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--status-error)', cursor: 'pointer', padding: '4px', marginLeft: '12px' }}
                            title="Disable Category"
                          >
                            <Trash2 size={16} />
                          </button>
                        </PermissionGuard>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add New Category */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="New Category Name" 
                    value={newCategoryName} 
                    onChange={e => setNewCategoryName(e.target.value)} 
                    className="input-field"
                    style={{ flex: 1 }}
                  />
                  <select 
                    value={newCategoryType}
                    onChange={e => setNewCategoryType(e.target.value)}
                    className="input-field" style={{ width: '160px', flexShrink: 0 }}
                  >
                    <option value="OPERATIONAL">Operational</option>
                    <option value="FINANCIAL">Financial</option>
                    <option value="LOGISTICS">Logistics</option>
                  </select>
                  <PermissionGuard permission="settings:update" behavior="disable">
                    <button 
                      disabled={!newCategoryName || createCategory.isPending}
                      onClick={() => {
                        createCategory.mutate({ name: newCategoryName, type: newCategoryType }, {
                          onSuccess: () => setNewCategoryName('')
                        });
                      }}
                      className="btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={16} /> Add
                    </button>
                  </PermissionGuard>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ASSET CATEGORIES TAB */}
        {activeTab === 'assets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-in-out' }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>Fixed Asset Categories</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {assetCategories?.map((cat: any) => (
                  <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{cat.name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                        background: cat.is_active ? 'var(--status-success-dim)' : 'var(--status-error-dim)',
                        color: cat.is_active ? 'var(--status-success)' : 'var(--status-error)'
                      }}>
                        {cat.is_active ? 'Active' : 'Disabled'}
                      </span>
                      {cat.is_active && (
                        <PermissionGuard permission="settings:update" behavior="disable">
                          <button 
                            onClick={() => {
                              if (confirm('Are you sure you want to disable this category?')) {
                                deleteAssetCategory.mutate(cat.id);
                              }
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--status-error)', cursor: 'pointer', padding: '4px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </PermissionGuard>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add New Category */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="New Category Name" 
                    value={newAssetCategoryName} 
                    onChange={e => setNewAssetCategoryName(e.target.value)} 
                    className="input-field"
                    style={{ flex: 1 }}
                  />
                  <PermissionGuard permission="settings:update" behavior="disable">
                    <button 
                      disabled={!newAssetCategoryName || createAssetCategory.isPending}
                      onClick={() => {
                        createAssetCategory.mutate(newAssetCategoryName, {
                          onSuccess: () => setNewAssetCategoryName('')
                        });
                      }}
                      className="btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={16} /> Add Category
                    </button>
                  </PermissionGuard>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QUOTATIONS TAB */}
        {activeTab === 'quotations' && (
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-in-out' }}>
            <h3 style={{ margin: 0, fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} color="var(--brand-primary)" />
              Quotations & Invoices
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)' }}>Quotation Validity (Days)</label>
              <input 
                type="number" 
                className="input-field"
                value={quotationValidityDays}
                onChange={e => setQuotationValidityDays(e.target.value)}
                placeholder="e.g. 30"
                style={{ width: '150px' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>The number of days a quotation remains valid from its issue date.</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)' }}>Quotation Terms & Conditions</label>
              <textarea 
                className="input-field"
                value={quotationTerms}
                onChange={e => setQuotationTerms(e.target.value)}
                placeholder="Enter terms and conditions that will appear at the bottom of the quotation..."
                style={{ minHeight: '120px', fontFamily: 'inherit', resize: 'vertical' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>This text will be printed at the bottom of the quotation document.</div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Document Numbering Formats</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Use date variables: <code>{'{YYYY}'}</code>, <code>{'{YY}'}</code>, <code>{'{MM}'}</code>, <code>{'{DD}'}</code>.<br/>
                For Bookings, also use: <code>{'{ROUTE}'}</code> (first 3 letters of route name) and <code>{'{BRANCH}'}</code> (branch code).
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* INVOICES */}
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '12px' }}>Invoices</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input type="text" value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value)} className="input-field" placeholder="Prefix Format" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Next Seq:</label>
                      <input type="number" value={invoiceSeq} onChange={e => setInvoiceSeq(e.target.value)} className="input-field" style={{ flex: 1 }} />
                    </div>
                    <div style={{ fontSize: '12px', padding: '8px', background: 'var(--bg-color)', borderRadius: '4px', border: '1px dashed var(--border-color)', textAlign: 'center' }}>
                      <strong>Preview:</strong> {invoicePrefix.replace(/{YYYY}/g, new Date().getFullYear().toString()).replace(/{YY}/g, new Date().getFullYear().toString().slice(-2)).replace(/{MM}/g, (new Date().getMonth() + 1).toString().padStart(2, '0')).replace(/{DD}/g, new Date().getDate().toString().padStart(2, '0'))}{(parseInt(invoiceSeq) + 1 || 1).toString().padStart(4, '0')}
                    </div>
                  </div>
                </div>

                {/* QUOTATIONS */}
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '12px' }}>Quotations</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input type="text" value={quotePrefix} onChange={e => setQuotePrefix(e.target.value)} className="input-field" placeholder="Prefix Format" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Next Seq:</label>
                      <input type="number" value={quoteSeq} onChange={e => setQuoteSeq(e.target.value)} className="input-field" style={{ flex: 1 }} />
                    </div>
                    <div style={{ fontSize: '12px', padding: '8px', background: 'var(--bg-color)', borderRadius: '4px', border: '1px dashed var(--border-color)', textAlign: 'center' }}>
                      <strong>Preview:</strong> {quotePrefix.replace(/{YYYY}/g, new Date().getFullYear().toString()).replace(/{YY}/g, new Date().getFullYear().toString().slice(-2)).replace(/{MM}/g, (new Date().getMonth() + 1).toString().padStart(2, '0')).replace(/{DD}/g, new Date().getDate().toString().padStart(2, '0'))}{(parseInt(quoteSeq) + 1 || 1).toString().padStart(4, '0')}
                    </div>
                  </div>
                </div>

                {/* RECEIPTS */}
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '12px' }}>Receipts</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input type="text" value={receiptPrefix} onChange={e => setReceiptPrefix(e.target.value)} className="input-field" placeholder="Prefix Format" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Next Seq:</label>
                      <input type="number" value={receiptSeq} onChange={e => setReceiptSeq(e.target.value)} className="input-field" style={{ flex: 1 }} />
                    </div>
                    <div style={{ fontSize: '12px', padding: '8px', background: 'var(--bg-color)', borderRadius: '4px', border: '1px dashed var(--border-color)', textAlign: 'center' }}>
                      <strong>Preview:</strong> {receiptPrefix.replace(/{YYYY}/g, new Date().getFullYear().toString()).replace(/{YY}/g, new Date().getFullYear().toString().slice(-2)).replace(/{MM}/g, (new Date().getMonth() + 1).toString().padStart(2, '0')).replace(/{DD}/g, new Date().getDate().toString().padStart(2, '0'))}{(parseInt(receiptSeq) + 1 || 1).toString().padStart(4, '0')}
                    </div>
                  </div>
                </div>
              </div>

              {/* BOOKINGS - full row */}
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Bookings / Pre-Orders</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Use <code style={{ background: 'var(--bg-color)', padding: '1px 4px', borderRadius: '3px' }}>{'{ROUTE}'}</code> to embed the route name (e.g. <em>COL</em>) and <code style={{ background: 'var(--bg-color)', padding: '1px 4px', borderRadius: '3px' }}>{'{BRANCH}'}</code> for the branch code.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input type="text" value={bookingPrefix} onChange={e => setBookingPrefix(e.target.value)} className="input-field" placeholder="e.g. BKG-{ROUTE}-{YYYY}-" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Next Seq:</label>
                      <input type="number" value={bookingSeq} onChange={e => setBookingSeq(e.target.value)} className="input-field" style={{ flex: 1 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', padding: '12px', background: 'var(--bg-color)', borderRadius: '4px', border: '1px dashed var(--border-color)', textAlign: 'center', alignSelf: 'center' }}>
                    <strong>Preview:</strong><br/>
                    {bookingPrefix
                      .replace(/{YYYY}/g, new Date().getFullYear().toString())
                      .replace(/{YY}/g, new Date().getFullYear().toString().slice(-2))
                      .replace(/{MM}/g, (new Date().getMonth() + 1).toString().padStart(2, '0'))
                      .replace(/{DD}/g, new Date().getDate().toString().padStart(2, '0'))
                      .replace(/{ROUTE}/g, 'COL')
                      .replace(/{BRANCH}/g, 'BR1')
                    }{(parseInt(bookingSeq) + 1 || 1).toString().padStart(4, '0')}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <PermissionGuard permission="settings:update" behavior="disable">
                <button 
                  onClick={handleSaveQuotations}
                  disabled={updateSettings.isPending}
                  className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={14} /> {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                </button>
              </PermissionGuard>
            </div>
          </div>
        )}

        {/* MISCELLANEOUS TAB */}
        {activeTab === 'misc' && (
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-in-out' }}>
            <h3 style={{ margin: 0, fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={16} color="var(--brand-primary)" />
              Miscellaneous Settings
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)' }}>Downpayment Partial Recovery Max Days</label>
              <input 
                type="number" 
                className="input-field"
                value={partialRecoveryDaysMax}
                onChange={e => setPartialRecoveryDaysMax(e.target.value)}
                placeholder="e.g. 14"
                style={{ width: '150px' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                When taking an order, if the customer cannot pay the full required downpayment, they can pick a future recovery date. This setting caps how far into the future they can pick (e.g. 14 days).
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)' }}>Barcode Print Size (Width x Height)</label>
              <select 
                className="input-field"
                value={barcodePrintSize}
                onChange={e => setBarcodePrintSize(e.target.value)}
                style={{ width: '200px' }}
              >
                <option value="35x25">35mm x 25mm</option>
                <option value="50x25">50mm x 25mm</option>
                <option value="40x30">40mm x 30mm</option>
                <option value="50x30">50mm x 30mm</option>
              </select>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Select the dimensions of your thermal printer sticker labels for inventory intake barcodes.
              </div>
            </div>

            {/* Overdue Penalties & Recurring Settings */}
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                Overdue Penalties & Recurring Rules
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>Enable Automated Overdue Penalties</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Master switch to enable or disable nightly automated penalty fee calculations.</div>
                </div>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                  <input type="checkbox" checked={enableOverduePenalties === 'true'} onChange={e => setEnableOverduePenalties(e.target.checked ? 'true' : 'false')} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ 
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: enableOverduePenalties === 'true' ? 'var(--brand-primary)' : 'var(--bg-tertiary)', 
                    transition: '.4s', borderRadius: '22px' 
                  }}>
                    <span style={{ 
                      position: 'absolute', content: '""', height: '16px', width: '16px', left: '3px', bottom: '3px', 
                      backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                      transform: enableOverduePenalties === 'true' ? 'translateX(18px)' : 'translateX(0)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontWeight: 500, fontSize: '12px', color: 'var(--text-secondary)' }}>Max Recurring Penalty Months</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={overduePenaltyMaxRecurringMonths} 
                    onChange={e => setOverduePenaltyMaxRecurringMonths(e.target.value)} 
                    placeholder="3" 
                  />
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Maximum number of recurring monthly penalties per installment (e.g. 3 months).</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontWeight: 500, fontSize: '12px', color: 'var(--text-secondary)' }}>Recurring Penalty Interval (Days)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={overduePenaltyRecurringDaysInterval} 
                    onChange={e => setOverduePenaltyRecurringDaysInterval(e.target.value)} 
                    placeholder="30" 
                  />
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Days required between recurring late fees (e.g. 30 days).</div>
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <PermissionGuard permission="settings:update" behavior="disable">
                <button 
                  onClick={handleSaveMisc}
                  disabled={updateSettings.isPending}
                  className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={14} /> {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                </button>
              </PermissionGuard>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

