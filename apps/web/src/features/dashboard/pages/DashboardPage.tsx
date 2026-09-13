import { useGetDashboardSummary } from '../api';
import { DollarSign, Truck, FileCheck2, Package, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const { data: summary, isLoading, error } = useGetDashboardSummary();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <RefreshCw size={32} className="spin" style={{ marginBottom: '16px', animation: 'spin 1s linear infinite' }} />
        <div>Loading executive dashboard...</div>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !summary) {
    return <div style={{ padding: '24px', color: 'var(--status-error)' }}>Failed to load dashboard data.</div>;
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Executive Dashboard</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>Real-time overview of your operations, collections, and inventory.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Financials Card */}
        <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'transform 0.2s', cursor: 'pointer' }}
             onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
             onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
             onClick={() => navigate('/collections')}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '12px', color: '#10b981' }}><DollarSign size={24}/></div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Today's Financials</h2>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Collections Received</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>Rs. {summary.financials.todayCollections.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>New Sales Generated</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Rs. {summary.financials.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>

        {/* Operations Card */}
        <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'transform 0.2s', cursor: 'pointer' }}
             onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
             onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
             onClick={() => navigate('/trips')}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '12px', color: '#3b82f6' }}><Truck size={24}/></div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Fleet Operations</h2>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Active Vans on Road</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {summary.operations.activeTrips} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '6px' }}>Trips</span>
              </div>
            </div>
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Pending Reconciliations</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: summary.operations.pendingReconciliations > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
                {summary.operations.pendingReconciliations} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Awaiting sign-off</span>
              </div>
            </div>
          </div>
        </div>

        {/* Collections Health Card */}
        <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'transform 0.2s', cursor: 'pointer' }}
             onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
             onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
             onClick={() => navigate('/collections')}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '10px', borderRadius: '12px', color: '#8b5cf6' }}><FileCheck2 size={24}/></div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Collections Health</h2>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Active Installment Contracts</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#8b5cf6' }}>{summary.collections.activeContracts}</div>
            </div>
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Defaulted / Broken Contracts</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: summary.collections.defaultedContracts > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                {summary.collections.defaultedContracts}
              </div>
            </div>
          </div>
        </div>

        {/* Inventory & Service Card */}
        <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'transform 0.2s', cursor: 'pointer' }}
             onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
             onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
             onClick={() => navigate('/reports/stock')}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '12px', color: '#f59e0b' }}><Package size={24}/></div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Inventory & Service</h2>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Low Stock Alerts</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: summary.inventory.lowStockAlerts > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
                {summary.inventory.lowStockAlerts} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Items &lt; 5 Qty</span>
              </div>
            </div>
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Pending Warranty Repairs</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {summary.inventory.activeWarrantyClaims} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Open claims</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
