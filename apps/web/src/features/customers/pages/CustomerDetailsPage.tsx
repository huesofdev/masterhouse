import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomerDetails } from '../api';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { 
  ArrowLeft, MapPin, Phone, CreditCard, ShoppingBag, 
  Wallet, FileText, Image as ImageIcon, Users, X, Star, RotateCcw,
  SlidersHorizontal, MoreVertical, History, Clock, MessageSquare
} from 'lucide-react';

import { NICViewModal } from '../components/NICViewModal';
import { SendCustomSmsModal } from '../components/SendCustomSmsModal';
import { ReceivePaymentModal } from '../../collections/components/ReceivePaymentModal';
import { ContractAdjustmentModal } from '../../collections/components/ContractAdjustmentModal';
import { ReceiptHistoryModal } from '../../collections/components/ReceiptHistoryModal';
import { OverdueBreakdownModal } from '../../collections/components/OverdueBreakdownModal';
import { apiClient } from '../../../lib/axios';
import { ReportExportButtons } from '../../../components/ReportExportButtons';

export function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useCustomerDetails(id!);
  const [viewingNic, setViewingNic] = useState<'front' | 'back' | null>(null);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'sales' | 'installments'>('sales');
  const [actionContract, setActionContract] = useState<any>(null);
  const [historyContractId, setHistoryContractId] = useState<string | null>(null);
  const [overdueContractId, setOverdueContractId] = useState<string | null>(null);
  const [collectingContract, setCollectingContract] = useState<any>(null);
  const [adjustingContract, setAdjustingContract] = useState<any>(null);
  const [viewingGuarantorContract, setViewingGuarantorContract] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [editingRating, setEditingRating] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [pickedRating, setPickedRating] = useState(0); // the selected star in the modal
  const [savingRating, setSavingRating] = useState(false);
  const [localRating, setLocalRating] = useState<number | null>(null);
  const [localRatingOverride, setLocalRatingOverride] = useState<boolean | null>(null);

  const { hasPermission } = useAuth();
  const hasAdjustPermission = hasPermission('collections:adjust');
  const hasUpdatePermission = hasPermission('customers:update');
  const queryClient = useQueryClient();

  const openEditModal = useCallback((currentRating: number) => {
    setPickedRating(Math.round(currentRating) || 0);
    setHoverRating(0);
    setEditingRating(true);
  }, []);

  const handleSaveRating = useCallback(async (rating: number) => {
    if (!id) return;
    setSavingRating(true);
    try {
      await apiClient.patch(`/customers/${id}/rating`, { rating, override: true });
      setLocalRating(rating);
      setLocalRatingOverride(true);
      setEditingRating(false);
      queryClient.invalidateQueries({ queryKey: ['customer-details', id] });
    } catch {
      alert('Failed to save rating');
    } finally {
      setSavingRating(false);
    }
  }, [id, queryClient]);

  const handleResetRating = useCallback(async () => {
    if (!id) return;
    if (!window.confirm('Reset to auto-calculated rating? The algorithm will recalculate it tonight.')) return;
    try {
      await apiClient.delete(`/customers/${id}/rating/override`);
      setLocalRatingOverride(false);
      setEditingRating(false);
    } catch {
      alert('Failed to reset rating');
    }
  }, [id]);

  const handleDownloadReport = async () => {
    try {
      setIsExporting(true);
      const res = await apiClient.get(`/customers/${id}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Customer_Profile_${id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintReport = () => {
    const dateStr = new Date().toLocaleDateString('en-GB');
    
    const html = `
      <html>
        <head>
          <title>Customer Profile - ${profile.full_name}</title>
          <style>
            @page { size: A4 portrait; margin: 20mm; }
            body { font-family: Arial, sans-serif; color: #000; margin: 0; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .header h1 { margin: 0 0 5px 0; font-size: 20px; text-transform: uppercase; }
            h2 { font-size: 14px; margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            .kpi-grid { display: flex; gap: 10px; margin-bottom: 20px; }
            .kpi-box { border: 1px solid #000; padding: 10px; flex: 1; text-align: center; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Master House</h1>
            <h2>Customer Profile Report</h2>
            <div>Generated on: ${dateStr}</div>
          </div>
          
          <h2>Personal Details</h2>
          <table>
            <tr><th>Full Name</th><td>${profile.full_name}</td><th>NIC</th><td>${profile.nic}</td></tr>
            <tr><th>Mobile</th><td>${profile.mobile}</td><th>Address</th><td>${profile.address}</td></tr>
            <tr><th>Route</th><td>${profile.route_name || '-'}</td><th>Area</th><td>${profile.area_name || '-'}</td></tr>
          </table>

          <div class="kpi-grid">
            <div class="kpi-box">Total Purchases<br/>Rs ${kpis.totalPurchases.toLocaleString('en-GB')}</div>
            <div class="kpi-box">Total Paid<br/>Rs ${kpis.totalPaid.toLocaleString('en-GB')}</div>
            <div class="kpi-box">Pending Dues<br/>Rs ${kpis.pendingBalance.toLocaleString('en-GB')}</div>
            <div class="kpi-box">Active Contracts<br/>${kpis.activeContracts}</div>
          </div>

          <h2>Sales History</h2>
          <table>
            <thead>
              <tr><th>Date</th><th>Type</th><th>Status</th><th>Total (Rs)</th></tr>
            </thead>
            <tbody>
              ${sales.map((s: any) => `
                <tr>
                  <td>${new Date(s.created_at).toLocaleDateString('en-GB')}</td>
                  <td>${s.sale_type}</td>
                  <td>${s.status}</td>
                  <td style="text-align: right;">${Number(s.total).toLocaleString('en-GB')}</td>
                </tr>
              `).join('')}
              ${sales.length === 0 ? '<tr><td colspan="4" style="text-align: center;">No sales history</td></tr>' : ''}
            </tbody>
          </table>

          <h2>Installment Contracts</h2>
          <table>
            <thead>
              <tr><th>Date</th><th>Status</th><th>Guarantor Name</th><th>Guarantor NIC</th><th>Downpayment (Rs)</th><th>Total Payable (Rs)</th><th>Collected (Rs)</th><th>Remaining Balance (Rs)</th><th>Overdue (Rs)</th><th>Penalty Incl. (Rs)</th></tr>
            </thead>
            <tbody>
              ${contracts.map((c: any) => {
                const downpayment = Number(c.downpayment || 0);
                const payable = Number(c.total_payable);
                const bal = Math.max(0, Number(c.balance));
                const paid = Math.max(0, payable - bal);
                const overdue = Number(c.overdue_amount || 0);
                const penalty = Number(c.penalty_amount || 0);
                return `
                <tr>
                  <td>${new Date(c.created_at).toLocaleDateString('en-GB')}</td>
                  <td>${c.status}</td>
                  <td>${c.guarantor ? c.guarantor.full_name : '-'}</td>
                  <td>${c.guarantor ? c.guarantor.nic : '-'}</td>
                  <td style="text-align: right;">${downpayment.toLocaleString('en-GB')}</td>
                  <td style="text-align: right;">${payable.toLocaleString('en-GB')}</td>
                  <td style="text-align: right; color: #10b981; font-weight: 600;">${paid.toLocaleString('en-GB')}</td>
                  <td style="text-align: right;">${bal.toLocaleString('en-GB')}</td>
                  <td style="text-align: right; color: ${overdue > 0 ? '#ef4444' : '#000'}; font-weight: ${overdue > 0 ? 'bold' : 'normal'};">${overdue.toLocaleString('en-GB')}</td>
                  <td style="text-align: right; color: ${penalty > 0 ? '#d97706' : '#666'};">${penalty > 0 ? penalty.toLocaleString('en-GB') : '-'}</td>
                </tr>
              `;}).join('')}
              ${contracts.length === 0 ? '<tr><td colspan="10" style="text-align: center;">No contracts</td></tr>' : ''}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>Loading profile...</div>;
  }

  if (isError || !data) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--status-error)' }}>Failed to load customer profile</div>;
  }

  const { profile, sales, contracts, kpis } = data;

  return (
    <>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header & Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{profile.full_name}</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '14px', fontFamily: 'monospace' }}>
            NIC: {profile.nic}
          </p>
          {/* ⭐ Star Rating Display */}
          {(() => {
            const displayRating = localRating ?? parseFloat(profile.rating ?? '0');
            const isOverride = localRatingOverride ?? profile.rating_override ?? false;
            const hasRating = displayRating > 0;
            return (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {hasRating ? (
                  [1,2,3,4,5].map(star => (
                    <Star
                      key={star}
                      size={18}
                      fill={star <= Math.round(displayRating) ? 'var(--brand-primary)' : 'none'}
                      color={star <= Math.round(displayRating) ? 'var(--brand-primary)' : 'var(--text-muted)'}
                    />
                  ))
                ) : (
                  [1,2,3,4,5].map(star => (
                    <Star key={star} size={18} fill="none" color="var(--text-muted)" />
                  ))
                )}
                {hasRating && <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-primary)' }}>{displayRating.toFixed(1)}</span>}
                {isOverride && <span style={{ fontSize: '10px', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Manual</span>}
                {!isOverride && hasRating && <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Auto</span>}
                {!hasRating && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Not rated yet</span>}
                {hasUpdatePermission && (
                  <button
                    onClick={() => openEditModal(displayRating)}
                    style={{ fontSize: '11px', padding: '2px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--brand-primary)', borderRadius: '4px', cursor: 'pointer', color: 'var(--brand-primary)', fontWeight: 600 }}
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>
            );
          })()}
        </div>
        
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {profile.mobile && (
            <button
              onClick={() => setShowSmsModal(true)}
              style={{
                padding: '8px 14px',
                background: 'var(--brand-primary)',
                border: 'none',
                color: 'white',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <MessageSquare size={15} />
              Send SMS
            </button>
          )}
          {isExporting ? (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Generating Excel...</div>
          ) : (
            <ReportExportButtons 
              onPrint={handlePrintReport} 
              onExportExcel={handleDownloadReport} 
            />
          )}
        </div>
      </div>

      {/* KPI Row (Full Width) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <KPICard icon={<ShoppingBag size={20} />} title="Total Purchases" value={`Rs ${kpis.totalPurchases.toLocaleString('en-GB')}`} color="var(--brand-primary)" />
        <KPICard icon={<CreditCard size={20} />} title="Total Paid" value={`Rs ${kpis.totalPaid.toLocaleString('en-GB')}`} color="#10b981" />
        <KPICard icon={<Wallet size={20} />} title="Pending Dues" value={`Rs ${kpis.pendingBalance.toLocaleString('en-GB')}`} color="#f59e0b" />
        <KPICard icon={<FileText size={20} />} title="Active Contracts" value={kpis.activeContracts.toString()} color="#8b5cf6" />
      </div>

      {/* Info & Documents Row (Contact Details & NIC Documents Side-by-Side) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
        
        {/* Contact Details Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <Phone size={18} color="var(--brand-primary)" /> Contact Details
            </h3>
            {profile.mobile && (
              <button 
                onClick={() => setShowSmsModal(true)}
                style={{ 
                  padding: '4px 10px', 
                  background: 'rgba(245, 158, 11, 0.12)', 
                  color: 'var(--brand-primary)', 
                  border: '1px solid rgba(245, 158, 11, 0.3)', 
                  borderRadius: '6px', 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <MessageSquare size={12} />
                Send SMS
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Phone size={16} color="var(--text-secondary)" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{profile.mobile || 'No Phone Registered'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <MapPin size={16} color="var(--text-secondary)" style={{ marginTop: '2px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <div style={{ fontSize: '14px' }}>{profile.address}</div>
              {(profile.gps_lat && profile.gps_lng) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--brand-primary)', fontFamily: 'monospace' }}>
                    {profile.gps_lat}, {profile.gps_lng}
                  </div>
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${profile.gps_lat},${profile.gps_lng}`, '_blank')}
                    style={{ 
                      padding: '4px 10px', background: 'var(--brand-primary)', color: 'white', 
                      border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 600, 
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px',
                      boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
                    }}
                  >
                    <MapPin size={12} />
                    Navigate
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                {profile.route_name && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'inline-block', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    Route: {profile.route_name}
                  </div>
                )}
                {profile.area_name && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'inline-block', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    Area: {profile.area_name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* NIC Documents Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <ImageIcon size={18} color="var(--brand-primary)" /> NIC Documents
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Verified national identity card documents on file for customer {profile.full_name}.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto' }}>
            <button 
              onClick={() => setViewingNic('front')}
              disabled={!profile.nic_front_url}
              style={{ 
                padding: '14px', background: 'var(--bg-primary)', 
                border: '1px solid var(--border-color)', borderRadius: '8px', 
                cursor: profile.nic_front_url ? 'pointer' : 'not-allowed', 
                opacity: profile.nic_front_url ? 1 : 0.5,
                fontWeight: 600, fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <ImageIcon size={16} /> Front Side
            </button>
            <button 
              onClick={() => setViewingNic('back')}
              disabled={!profile.nic_back_url}
              style={{ 
                padding: '14px', background: 'var(--bg-primary)', 
                border: '1px solid var(--border-color)', borderRadius: '8px', 
                cursor: profile.nic_back_url ? 'pointer' : 'not-allowed', 
                opacity: profile.nic_back_url ? 1 : 0.5,
                fontWeight: 600, fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <ImageIcon size={16} /> Back Side
            </button>
          </div>
        </div>

      </div>

      {/* Tabbed Table (Sales / Installments) - Full Width */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border-color)' }}>
          <TabButton active={activeTab === 'sales'} onClick={() => setActiveTab('sales')}>Sales History</TabButton>
          <TabButton active={activeTab === 'installments'} onClick={() => setActiveTab('installments')}>Installment Contracts</TabButton>
        </div>

        {activeTab === 'sales' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: '11px', width: '90px', whiteSpace: 'nowrap' }}>Date</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: '12px' }}>Type</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: '12px' }}>Status</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: '12px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>No sales history</td></tr>
                ) : sales.map((sale: any) => (
                  <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(sale.created_at).toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: '8px 10px' }}>{sale.sale_type}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        background: sale.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.12)' 
                          : sale.status === 'RETURNED' ? 'rgba(239, 68, 68, 0.12)' 
                          : sale.status === 'CANCELLED' ? 'rgba(156, 163, 175, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                        color: sale.status === 'COMPLETED' ? '#10b981' 
                          : sale.status === 'RETURNED' ? '#ef4444' 
                          : sale.status === 'CANCELLED' ? '#6b7280'
                          : '#f59e0b'
                      }}>
                        {sale.status === 'RETURNED' ? 'REFUNDED / RETURNED' : sale.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>Rs {Number(sale.total).toLocaleString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'installments' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 8px', fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap', width: '80px' }}>Date</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: '12px', minWidth: '100px', maxWidth: '140px' }}>Guarantor</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>Downpayment</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>Total Payable</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>Collected</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>Remaining Balance</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>Overdue</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>Progress</th>
                  <th style={{ padding: '8px 6px', fontWeight: 600, fontSize: '11px', textAlign: 'center', width: '36px' }}></th>
                </tr>
              </thead>
              <tbody>
                {contracts.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>No active contracts</td></tr>
                ) : contracts.map((c: any) => {
                  const downpayment = Number(c.downpayment || 0);
                  const payable = Number(c.total_payable);
                  const bal = Math.max(0, Number(c.balance));
                  const overdue = Number(c.overdue_amount || 0);
                  const penalty = Number(c.penalty_amount || 0);
                  const paid = Math.max(0, payable - bal);
                  const progress = payable > 0 ? Math.min(100, Math.max(0, (paid / payable) * 100)) : 0;
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 8px', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(c.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ padding: '8px 10px', minWidth: '100px', maxWidth: '140px' }}>
                        {c.guarantor ? (
                          <button 
                            onClick={() => setViewingGuarantorContract(c)}
                            title={c.guarantor.full_name}
                            style={{ 
                              background: 'transparent', 
                              border: 'none', 
                              color: 'var(--brand-primary)', 
                              cursor: 'pointer', 
                              padding: 0, 
                              fontWeight: 600, 
                              fontSize: '12px', 
                              textAlign: 'left', 
                              textDecoration: 'underline',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              lineHeight: 1.25,
                              display: 'inline-block'
                            }}
                          >
                            {c.guarantor.full_name}
                          </button>
                        ) : <span style={{ color: 'var(--text-secondary)' }}>-</span>}
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          background: c.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : c.status === 'SETTLED' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: c.status === 'ACTIVE' ? '#10b981' : c.status === 'SETTLED' ? '#3b82f6' : '#ef4444'
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Rs {downpayment.toLocaleString('en-GB')}</td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Rs {payable.toLocaleString('en-GB')}</td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setHistoryContractId(c.id)}
                          title="Click to view full collection receipts & attempt history"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            color: '#10b981',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'underline',
                            textDecorationStyle: 'dotted',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                            e.currentTarget.style.textDecorationStyle = 'solid';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.textDecorationStyle = 'dotted';
                          }}
                        >
                          Rs {paid.toLocaleString('en-GB')}
                        </button>
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: bal > 0 ? '#f59e0b' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Rs {bal.toLocaleString('en-GB')}</td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setOverdueContractId(c.id)}
                          title="Click to view overdue installment breakdown & penalty history"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '2px',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = overdue > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {overdue > 0 ? (
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: 700, 
                              color: '#ef4444', 
                              background: 'rgba(239, 68, 68, 0.12)', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              textDecoration: 'underline',
                              textDecorationStyle: 'dotted'
                            }}>
                              Rs {overdue.toLocaleString('en-GB')}
                            </span>
                          ) : (
                            <span style={{ 
                              color: 'var(--text-secondary)', 
                              fontSize: '11px',
                              textDecoration: 'underline',
                              textDecorationStyle: 'dotted'
                            }}>
                              Rs 0
                            </span>
                          )}
                          {penalty > 0 && overdue === 0 && (
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 600,
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-tertiary)',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }} title="Historical penalties already settled">
                              (Past Pen: Rs {penalty.toLocaleString('en-GB')})
                            </span>
                          )}
                          {penalty > 0 && overdue > 0 && (
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              color: '#d97706',
                              background: 'rgba(245, 158, 11, 0.12)',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }} title="Total penalties applied to this contract">
                              +Rs {penalty.toLocaleString('en-GB')} Pen.
                            </span>
                          )}
                        </button>
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '40px', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--brand-primary)', borderRadius: '2px' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{Math.round(progress)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center', whiteSpace: 'nowrap', width: '36px' }}>
                        <button
                          onClick={() => setActionContract(c)}
                          title="Contract Actions"
                          style={{
                            width: '28px',
                            height: '28px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <MoreVertical size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {actionContract && (
        <ContractActionModal
          contract={actionContract}
          hasAdjustPermission={hasAdjustPermission}
          onCollect={() => setCollectingContract(actionContract)}
          onAdjust={() => setAdjustingContract(actionContract)}
          onViewGuarantor={() => setViewingGuarantorContract(actionContract)}
          onViewHistory={() => setHistoryContractId(actionContract.id)}
          onViewOverdue={() => setOverdueContractId(actionContract.id)}
          onClose={() => setActionContract(null)}
        />
      )}

      {historyContractId && (
        <ReceiptHistoryModal
          contractId={historyContractId}
          customerLat={profile.gps_lat}
          customerLng={profile.gps_lng}
          onClose={() => setHistoryContractId(null)}
        />
      )}

      {overdueContractId && (
        <OverdueBreakdownModal
          contractId={overdueContractId}
          onClose={() => setOverdueContractId(null)}
        />
      )}

      {viewingNic && (
        <NICViewModal 
          customerId={id!}
          side={viewingNic}
          onClose={() => setViewingNic(null)}
        />
      )}

      {collectingContract && (
        <ReceivePaymentModal 
          contract={collectingContract}
          onClose={() => setCollectingContract(null)}
        />
      )}

      {adjustingContract && (
        <ContractAdjustmentModal 
          contract={adjustingContract}
          onClose={() => setAdjustingContract(null)}
        />
      )}

      {showSmsModal && (
        <SendCustomSmsModal
          customer={{
            id: profile.id,
            full_name: profile.full_name,
            mobile: profile.mobile
          }}
          pendingBalance={kpis.pendingBalance}
          onClose={() => setShowSmsModal(false)}
        />
      )}

      {viewingGuarantorContract && (
        <GuarantorDetailsModal 
          contract={viewingGuarantorContract}
          onClose={() => setViewingGuarantorContract(null)}
        />
      )}

      {editingRating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '32px', width: '360px', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Set Customer Rating</h3>
              <button onClick={() => setEditingRating(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><X size={20} /></button>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Hover and click a star to set a manual rating. This will override the automatic algorithm until you reset it.
            </p>
            {/* Star Picker */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {[1,2,3,4,5].map(star => {
                const isActive = star <= (hoverRating || pickedRating);
                return (
                  <Star
                    key={star}
                    size={40}
                    style={{ cursor: 'pointer', transition: 'transform 0.15s', transform: hoverRating === star ? 'scale(1.2)' : 'scale(1)' }}
                    fill={isActive ? 'var(--brand-primary)' : 'none'}
                    color={isActive ? 'var(--brand-primary)' : 'var(--text-muted)'}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => {
                      if (!savingRating) {
                        setPickedRating(star);
                        handleSaveRating(star);
                      }
                    }}
                  />
                );
              })}
            </div>
            <p style={{ margin: 0, textAlign: 'center', fontSize: '14px', fontWeight: 600, color: 'var(--brand-primary)', minHeight: '20px' }}>
              {hoverRating > 0 ? ['', '⚠️ Very Poor', '😐 Poor', '🙂 Average', '😊 Good', '⭐ Excellent'][hoverRating]
               : pickedRating > 0 ? `Current: ${['', 'Very Poor', 'Poor', 'Average', 'Good', 'Excellent'][pickedRating]}`
               : 'Hover a star to preview'}
            </p>
            {/* Reset to Auto */}
            {(localRatingOverride ?? profile.rating_override) && (
              <button
                onClick={handleResetRating}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
              >
                <RotateCcw size={14} /> Reset to Auto-Calculated
              </button>
            )}
            {savingRating && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Saving...</p>}
          </div>
        </div>
      )}
    </div>
    </>
  );
}

function KPICard({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string, color: string }) {
  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
        <div style={{ color }}>{icon}</div>
        {title}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      style={{ 
        padding: '12px 0', background: 'transparent', border: 'none', 
        borderBottom: `2px solid ${active ? 'var(--brand-primary)' : 'transparent'}`,
        color: active ? 'var(--brand-primary)' : 'var(--text-secondary)',
        fontWeight: 600, cursor: 'pointer', marginBottom: '-1px'
      }}
    >
      {children}
    </button>
  );
}

function GuarantorDetailsModal({ contract, onClose }: { contract: any, onClose: () => void }) {
  const g = contract.guarantor;
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  if (!g) return null;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '24px' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', background: 'var(--bg-primary)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>

          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={24} color="var(--brand-primary)" /> Guarantor Details
            </h2>
          </div>

          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Full Name</div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>{g.full_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>NIC Number</div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>{g.nic}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mobile</div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>{g.mobile}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Address</div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>{g.address}</div>
              </div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <h4 style={{ fontSize: '14px', margin: '0 0 12px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Documents & Signatures</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                {/* NIC Documents */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Guarantor NIC</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <ImageLinkButton label="Front Side" url={g.nic_front_signed_url} onClick={() => g.nic_front_signed_url && setPreviewDoc({ url: g.nic_front_signed_url, title: `Guarantor NIC - Front Side (${g.full_name})` })} />
                    <ImageLinkButton label="Back Side" url={g.nic_back_signed_url} onClick={() => g.nic_back_signed_url && setPreviewDoc({ url: g.nic_back_signed_url, title: `Guarantor NIC - Back Side (${g.full_name})` })} />
                  </div>
                </div>

                {/* Signatures */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Contract Signatures</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <ImageLinkButton label="Guarantor Sig" url={contract.guarantor_signature_signed_url} onClick={() => contract.guarantor_signature_signed_url && setPreviewDoc({ url: contract.guarantor_signature_signed_url, title: `Guarantor Signature (${g.full_name})` })} />
                    <ImageLinkButton label="Customer Sig" url={contract.signature_signed_url} onClick={() => contract.signature_signed_url && setPreviewDoc({ url: contract.signature_signed_url, title: `Customer Signature` })} />
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
      {previewDoc && (
        <NICViewModal 
          imageUrl={previewDoc.url}
          title={previewDoc.title}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </>
  );
}

function ImageLinkButton({ label, url, onClick }: { label: string, url: string | null, onClick: () => void }) {
  if (!url) {
    return (
      <div style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', flex: 1, textAlign: 'center', opacity: 0.5, cursor: 'not-allowed' }}>
        {label} (N/A)
      </div>
    );
  }
  return (
    <button onClick={onClick} style={{ padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--brand-primary)', color: 'var(--brand-primary)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
      <ImageIcon size={14} /> {label}
    </button>
  );
}

function ContractActionModal({
  contract,
  hasAdjustPermission,
  onCollect,
  onAdjust,
  onViewGuarantor,
  onViewHistory,
  onViewOverdue,
  onClose,
}: {
  contract: any;
  hasAdjustPermission: boolean;
  onCollect: () => void;
  onAdjust: () => void;
  onViewGuarantor: () => void;
  onViewHistory: () => void;
  onViewOverdue: () => void;
  onClose: () => void;
}) {
  const payable = Number(contract.total_payable);
  const bal = Math.max(0, Number(contract.balance));
  const paid = Math.max(0, payable - bal);
  const overdue = Number(contract.overdue_amount || 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 150,
        padding: '20px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          background: 'var(--bg-primary)',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Contract Actions</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {new Date(contract.created_at).toLocaleDateString('en-GB')} • Balance: Rs {bal.toLocaleString('en-GB')}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-tertiary)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Contract Quick Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            padding: '12px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Total Payable: </span>
            <div style={{ fontWeight: 600 }}>Rs {payable.toLocaleString('en-GB')}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Collected: </span>
            <div style={{ fontWeight: 600, color: '#10b981' }}>Rs {paid.toLocaleString('en-GB')}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Remaining Balance: </span>
            <div style={{ fontWeight: 600, color: bal > 0 ? '#f59e0b' : 'inherit' }}>Rs {bal.toLocaleString('en-GB')}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Overdue: </span>
            <div style={{ fontWeight: 600, color: overdue > 0 ? '#ef4444' : 'inherit' }}>
              Rs {overdue.toLocaleString('en-GB')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {contract.status === 'ACTIVE' && (
            <button
              onClick={() => {
                onClose();
                onCollect();
              }}
              style={{
                padding: '12px 16px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '10px',
                color: '#10b981',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CreditCard size={18} />
                <span>Receive Payment (Collect)</span>
              </div>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>Log Cash/Bank</span>
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              onViewHistory();
            }}
            style={{
              padding: '12px 16px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <History size={18} color="var(--brand-primary)" />
              <span>Collection & Attempt History</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>View logs</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onViewOverdue();
            }}
            style={{
              padding: '12px 16px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={18} color="#f59e0b" />
              <span>Overdue & Penalty Breakdown</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Schedules & fees</span>
          </button>

          {contract.status === 'ACTIVE' && hasAdjustPermission && (
            <button
              onClick={() => {
                onClose();
                onAdjust();
              }}
              style={{
                padding: '12px 16px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '10px',
                color: '#f59e0b',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <SlidersHorizontal size={18} />
                <span>Contract Adjustment</span>
              </div>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>Penalty / Discount</span>
            </button>
          )}

          {contract.guarantor && (
            <button
              onClick={() => {
                onClose();
                onViewGuarantor();
              }}
              style={{
                padding: '12px 16px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={18} color="var(--brand-primary)" />
                <span>Guarantor & Signatures</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>View docs</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

