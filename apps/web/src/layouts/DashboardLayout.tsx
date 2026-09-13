import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Tags, Tag, Users, LayoutDashboard, Settings, Map, Truck, Building2, PackagePlus, Box, Shield, Calendar, Menu, X, PackageSearch, CreditCard, LogOut, Banknote, AlertTriangle, CornerUpLeft, ShieldAlert, FileText, FileSpreadsheet, CheckCircle2, MessageSquare, User, ChevronDown, ChevronRight, Target, Monitor, Wallet, RefreshCcw, Barcode } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { BranchSwitcher } from '../components/BranchSwitcher';
import { PermissionGuard } from '../components/PermissionGuard';

import { useAuth } from '../hooks/useAuth';
import { useGetSettings, useGetMe } from '../features/settings/api';
import { apiClient } from '../lib/axios';



export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { data: settings } = useGetSettings();
  const { data: user } = useGetMe();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error('Logout API failed', err);
    }
    logout();
    navigate('/login');
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="dashboard-container" style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar - Resized and Responsive */}
      <aside className={`glass-nav sidebar-container ${isSidebarOpen ? 'open' : ''}`} style={{ 
        width: '240px', // Reduced width
        height: '100vh', // Constrain to viewport height
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--spacing-3)', // Reduced padding
        zIndex: 50
      }}>
        <div className="sidebar-header" style={{ 
          paddingBottom: 'var(--spacing-3)', 
          marginBottom: 'var(--spacing-2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', color: 'var(--text-primary)', fontSize: 'var(--font-size-lg)' }}>
            {settings?.company_logo_signed_url ? (
              <img 
                src={settings.company_logo_signed_url} 
                alt="Logo" 
                style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px' }} 
              />
            ) : (
              <div style={{ 
                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-cta))',
                borderRadius: 'var(--border-radius-sm)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)'
              }}>
                <Box size={20} color="white" />
              </div>
            )}
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
              {settings?.company_name || 'Master House'}
            </span>
          </h2>
          <button 
            className="mobile-only" 
            onClick={() => setIsSidebarOpen(false)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>
        
        <BranchSwitcher />
        
        <nav className="sidebar-nav" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)', overflowY: 'auto', paddingRight: '4px' }}>
          <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Overview" active={location.pathname === '/'} />
          
          <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '8px' }}>Sales & Customers</div>
          <NavItem to="/pos" icon={<CreditCard size={18} />} label="Point of Sale" active={location.pathname === '/pos'} />
          <NavItem to="/sales" icon={<FileText size={18} />} label="Sales History" active={location.pathname === '/sales'} />
          <NavItem to="/quotations" icon={<FileSpreadsheet size={18} />} label="Quotations" active={location.pathname === '/quotations'} />
          <NavItem to="/bookings" icon={<PackageSearch size={18} />} label="Bookings" active={location.pathname === '/bookings'} />
          <NavItem to="/collections" icon={<Banknote size={18} />} label="Collections" active={location.pathname === '/collections'} />
          <NavItem to="/customers" icon={<Users size={18} />} label="Customers" active={location.pathname === '/customers'} />

          <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '8px' }}>Inventory & Catalog</div>
          <NavItem to="/products" icon={<PackageSearch size={18} />} label="Products" active={location.pathname === '/products'} />
          <NavItem to="/categories" icon={<Tags size={18} />} label="Categories" active={location.pathname === '/categories'} />
          <NavItem to="/brands" icon={<Tag size={18} />} label="Brands" active={location.pathname === '/brands'} />
          <NavItem to="/intake" icon={<PackagePlus size={18} />} label="Intake & Receive" active={location.pathname.startsWith('/intake')} />
          <NavItem to="/inventory/transfers" icon={<Truck size={18} />} label="Stock Transfers" active={location.pathname.startsWith('/inventory/transfers')} />
          <NavItem to="/warehouses" icon={<Box size={18} />} label="Warehouses" active={location.pathname === '/warehouses'} />
          <NavItem to="/suppliers" icon={<Users size={18} />} label="Suppliers" active={location.pathname === '/suppliers'} />

          <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '8px' }}>Logistics & Field</div>
          <NavItem to="/trips" icon={<Truck size={18} />} label="Field Trips" active={location.pathname === '/trips' && !location.search.includes('status=RECONCILING')} />
          <NavItem to="/trips?status=RECONCILING" icon={<CheckCircle2 size={18} />} label="Trip Reconciliations" active={location.pathname === '/trips' && location.search.includes('status=RECONCILING')} />
          <NavItem to="/discrepancies" icon={<AlertTriangle size={18} />} label="Discrepancies" active={location.pathname === '/discrepancies'} />
          <NavItem to="/sync-conflicts" icon={<RefreshCcw size={18} />} label="Sync Conflicts" active={location.pathname === '/sync-conflicts'} />
          <NavItem to="/logistics/routes" icon={<Map size={18} />} label="Delivery Routes" active={location.pathname === '/logistics/routes'} />
          <NavItem to="/logistics/vehicles" icon={<Truck size={18} />} label="Fleet Vehicles" active={location.pathname === '/logistics/vehicles'} />

          <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '8px' }}>Service & Schemes</div>
          <NavItem to="/returns" icon={<CornerUpLeft size={18} />} label="Returns & Refunds" active={location.pathname === '/returns'} />
          <NavItem to="/warranty" icon={<ShieldAlert size={18} />} label="Warranty Claims" active={location.pathname === '/warranty'} />
          <NavItem to="/promotions" icon={<Tag size={18} />} label="Promotions" active={location.pathname === '/promotions'} />
          <NavItem to="/schemes" icon={<Calendar size={18} />} label="Installment Schemes" active={location.pathname === '/schemes'} />

          <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '8px' }}>Finance & Analytics</div>
          <NavGroup 
            icon={<FileSpreadsheet size={18} />} 
            label="Reports" 
            active={location.pathname.startsWith('/reports')}
            defaultOpen={location.pathname.startsWith('/reports')}
          >
            <NavItem to="/reports/efficiency" icon={<Target size={16} />} label="Collection Efficiency" active={location.pathname === '/reports/efficiency'} isSubItem />
            <NavItem to="/reports/profit-loss" icon={<Banknote size={16} />} label="Profit & Loss" active={location.pathname === '/reports/profit-loss'} isSubItem />
            <NavItem to="/reports/tax" icon={<Banknote size={16} />} label="Tax Summary" active={location.pathname === '/reports/tax'} isSubItem />
            <NavItem to="/reports/expenses" icon={<Banknote size={16} />} label="Expense Report" active={location.pathname === '/reports/expenses'} isSubItem />
            <NavItem to="/reports/sales" icon={<FileText size={16} />} label="Sales Report" active={location.pathname === '/reports/sales'} isSubItem />
            <NavItem to="/reports/product-performance" icon={<PackageSearch size={16} />} label="Product Performance" active={location.pathname === '/reports/product-performance'} isSubItem />
            <NavItem to="/reports/bookings" icon={<FileText size={16} />} label="Bookings & Preorders" active={location.pathname === '/reports/bookings'} isSubItem />
            <NavItem to="/reports/payroll" icon={<Users size={16} />} label="Staff Payroll & Collections" active={location.pathname === '/reports/payroll'} isSubItem />
            <NavItem to="/reports/serials" icon={<Barcode size={16} />} label="Serial Lifecycle Audit" active={location.pathname === '/reports/serials'} isSubItem />
            <NavItem to="/reports/receipts" icon={<Banknote size={16} />} label="Receipts Report" active={location.pathname === '/reports/receipts'} isSubItem />
            <NavItem to="/reports/contracts" icon={<FileSpreadsheet size={16} />} label="Contract Wise" active={location.pathname === '/reports/contracts'} isSubItem />
            <NavItem to="/reports/schedules" icon={<FileSpreadsheet size={16} />} label="Schedule Wise" active={location.pathname === '/reports/schedules'} isSubItem />
            <NavItem to="/reports/stock" icon={<Box size={16} />} label="Stock Report" active={location.pathname === '/reports/stock'} isSubItem />
          </NavGroup>
          <NavItem to="/expenses" icon={<Banknote size={18} />} label="Branch Expenses" active={location.pathname === '/expenses'} />
          <NavItem to="/assets" icon={<Monitor size={18} />} label="Fixed Assets" active={location.pathname === '/assets'} />

          <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '8px' }}>Administration</div>
          <NavItem to="/branches" icon={<Building2 size={18} />} label="Branches" active={location.pathname === '/branches'} />
          <NavItem to="/users" icon={<Users size={18} />} label="User Management" active={location.pathname === '/users'} />
          <PermissionGuard permission="wallets:read" behavior="hide">
            <NavItem to="/wallets" icon={<Wallet size={18} />} label="Staff Wallets" active={location.pathname.startsWith('/wallets')} />
          </PermissionGuard>
          <NavItem to="/rbac" icon={<Shield size={18} />} label="Access Control" active={location.pathname === '/rbac'} />
          <NavItem to="/communications/sms-logs" icon={<MessageSquare size={18} />} label="SMS Logs" active={location.pathname === '/communications/sms-logs'} />
          <NavItem to="/settings" icon={<Settings size={18} />} label="Settings" active={location.pathname === '/settings'} />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Glass Header */}
        <header className="glass-nav" style={{ 
          padding: 'var(--spacing-3) var(--spacing-4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          borderRight: 'none'
        }}>
          
          {/* Left Side: Mobile Menu Toggle & Quick Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <button 
                className="mobile-only"
                onClick={() => setIsSidebarOpen(true)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--text-primary)'
                }}
             >
               <Menu size={24} />
             </button>
             
             <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QuickNavButton to="/pos" icon={<CreditCard size={18} />} tooltip="Point of Sale" />
                <QuickNavButton to="/trips" icon={<Truck size={18} />} tooltip="Field Trips" />
                <QuickNavButton to="/trips?status=RECONCILING" icon={<CheckCircle2 size={18} />} tooltip="Trip Reconciliations" />
                <QuickNavButton to="/collections" icon={<Banknote size={18} />} tooltip="Collections" />
             </div>
          </div>

          {/* Right Side: Theme Toggle & Profile Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
             <ThemeToggle />
             <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />
             
             {/* Profile Area */}
             <div 
               ref={profileRef}
               style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}
               onClick={() => setIsProfileOpen(!isProfileOpen)}
             >
               <div className="desktop-only" style={{ textAlign: 'right', flexDirection: 'column' }}>
                 <div style={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2 }}>{user?.name || 'System Admin'}</div>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email || 'admin@masterh.com'}</div>
               </div>
               <div style={{ 
                 width: '36px', height: '36px', 
                 borderRadius: '50%', 
                 background: 'var(--bg-tertiary)',
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                 color: 'var(--brand-primary)',
                 fontWeight: 700,
                 border: '1px solid var(--border-color)',
                 transition: 'all var(--transition-fast)',
                 overflow: 'hidden'
               }}
               onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
               onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
               >
                 {user?.profile_picture_url ? (
                   <img src={user.profile_picture_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                 ) : (
                   user?.name ? user.name.charAt(0).toUpperCase() : 'A'
                 )}
               </div>

               {/* Profile Dropdown Menu */}
               {isProfileOpen && (
                 <div className="glass-panel" style={{
                   position: 'absolute',
                   top: '110%',
                   right: 0,
                   width: '200px',
                   padding: 'var(--spacing-2)',
                   display: 'flex',
                   flexDirection: 'column',
                   gap: '4px',
                   zIndex: 100,
                   transformOrigin: 'top right',
                   animation: 'scaleIn 0.2s ease-out'
                 }}>
                   <Link to="/profile" style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: 'var(--spacing-2)',
                     padding: 'var(--spacing-2)',
                     color: 'var(--text-primary)',
                     fontSize: '0.875rem',
                     fontWeight: 500,
                     borderRadius: 'var(--border-radius-sm)',
                   }}
                   onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                   onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                   >
                     <User size={16} />
                     Account Profile
                   </Link>
                   
                   <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                   
                   <button style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: 'var(--spacing-2)',
                     padding: 'var(--spacing-2)',
                     color: 'var(--status-error)',
                     fontSize: '0.875rem',
                     fontWeight: 500,
                     background: 'transparent',
                     border: 'none',
                     borderRadius: 'var(--border-radius-sm)',
                     width: '100%',
                     textAlign: 'left'
                   }}
                   onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                   onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                   onClick={handleLogout}
                   >
                     <LogOut size={16} />
                     Sign Out
                   </button>
                 </div>
               )}
             </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: 'var(--spacing-4)', flex: 1 }}>
          <Outlet />
        </div>
      </main>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function NavItem({ to, icon, label, active, isSubItem = false }: { to: string, icon: React.ReactNode, label: string, active: boolean, isSubItem?: boolean }) {
  return (
    <Link to={to} style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 'var(--spacing-2)', // Reduced gap
      padding: isSubItem ? '6px 12px 6px 36px' : '8px 12px',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      background: active ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
      borderRadius: 'var(--border-radius-md)',
      transition: 'all var(--transition-fast)',
      textDecoration: 'none',
      fontWeight: 500,
      fontSize: '0.8125rem', // Reduced font size
      border: active ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid transparent'
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.background = 'var(--bg-tertiary)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }
    }}>
      <div style={{ color: active ? 'var(--brand-primary)' : 'inherit', display: 'flex', alignItems: 'center' }}>
        {icon}
      </div>
      <span>{label}</span>
    </Link>
  );
}

function NavGroup({ icon, label, children, active, defaultOpen = false }: { icon: React.ReactNode, label: string, children: React.ReactNode, active: boolean, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '8px 12px',
          color: active && !isOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
          background: active && !isOpen ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
          borderRadius: 'var(--border-radius-md)',
          transition: 'all var(--transition-fast)',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '0.8125rem',
        }}
        onMouseEnter={(e) => {
          if (!(active && !isOpen)) {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!(active && !isOpen)) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <div style={{ color: active ? 'var(--brand-primary)' : 'inherit', display: 'flex', alignItems: 'center' }}>
            {icon}
          </div>
          <span>{label}</span>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>
      
      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function QuickNavButton({ to, icon, tooltip }: { to: string, icon: React.ReactNode, tooltip: string }) {
  return (
    <Link 
      to={to}
      title={tooltip}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textDecoration: 'none'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--brand-primary)';
        e.currentTarget.style.color = '#fff';
        e.currentTarget.style.borderColor = 'var(--brand-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-secondary)';
        e.currentTarget.style.color = 'var(--text-secondary)';
        e.currentTarget.style.borderColor = 'var(--border-color)';
      }}
    >
      {icon}
    </Link>
  );
}
