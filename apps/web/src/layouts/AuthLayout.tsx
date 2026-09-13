import { Outlet } from 'react-router-dom';
import { Box } from 'lucide-react';
import { useGetPublicSettings } from '../features/settings/api';

export function AuthLayout() {
  const { data: settings } = useGetPublicSettings();
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Orbs for Glassmorphism Depth */}
      <div style={{
        position: 'absolute',
        top: '-10%', left: '-5%',
        width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%', right: '-5%',
        width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        zIndex: 0
      }} />

      {/* Left side: Branding (Hidden on mobile) */}
      <div className="desktop-only" style={{
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'var(--spacing-8)',
        borderRight: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        zIndex: 10
      }}>
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          {settings?.company_logo_signed_url ? (
            <img 
              src={settings.company_logo_signed_url} 
              alt="Logo" 
              style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '8px' }} 
            />
          ) : (
            <Box size={48} color="var(--brand-primary)" strokeWidth={2} />
          )}
        </div>
        <h1 style={{ margin: 0, lineHeight: 1, fontSize: 'var(--font-size-3xl)' }}>
          {settings?.company_name ? (
            <span style={{ textTransform: 'uppercase' }}>{settings.company_name}</span>
          ) : (
            <>MASTER<span style={{ color: 'var(--brand-cta)' }}>.H</span></>
          )}
        </h1>
        <h2 style={{ color: 'var(--text-secondary)', marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-lg)' }}>
          ENTERPRISE ERP
        </h2>
      </div>

      {/* Right side: Login Form */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-4)',
        zIndex: 10
      }}>
        <div className="glass-panel" style={{ 
          width: '100%', 
          maxWidth: '400px', 
          padding: 'var(--spacing-5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--spacing-4)'
        }}>
          {/* Show logo on mobile only */}
          <div className="mobile-only" style={{ flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            {settings?.company_logo_signed_url ? (
              <img 
                src={settings.company_logo_signed_url} 
                alt="Logo" 
                style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '6px' }} 
              />
            ) : (
              <div style={{ 
                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-cta))',
                borderRadius: 'var(--border-radius-sm)',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)'
              }}>
                <Box size={24} color="white" />
              </div>
            )}
            <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>
              {settings?.company_name || 'Master House'}
            </h1>
          </div>
          
          <Outlet />
        </div>
      </div>
    </div>
  );
}
