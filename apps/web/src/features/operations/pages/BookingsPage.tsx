import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/axios';
import { PackageSearch, Trash2, Map, Filter } from 'lucide-react';
import { DataTable } from '../../../components/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';

interface PendingOrder {
  id: string;
  status: string;
  quantity: number;
  remarks: string | null;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  items: { product_name: string, quantity: number }[];
  advance_payment: string;
  sale_type_preference: string | null;
  offline_receipt_number: string | null;
}

interface RouteType {
  id: string;
  name: string;
}

export function BookingsPage() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const [routeIdFilter, setRouteIdFilter] = useState<string>('');

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [routeIdFilter]);

  const fetchRoutes = async () => {
    try {
      const res = await apiClient.get('/routes');
      if (res.data?.success) {
        setRoutes(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load routes', err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = '/orders?status=PENDING';
      if (routeIdFilter) {
        url += `&routeId=${routeIdFilter}`;
      }
      const res = await apiClient.get(url);
      if (res.data?.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this pending order?')) return;
    setDeletingId(id);
    try {
      const res = await apiClient.delete(`/orders/${id}`);
      if (res.data?.success) {
        setOrders(prev => prev.filter(o => o.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete order', err);
      alert('Failed to delete order. It may have already been fulfilled.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<PendingOrder>[] = [
    {
      header: 'Date & Ref',
      accessorKey: 'created_at',
      cell: (info) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>{new Date(info.getValue() as string).toLocaleDateString('en-GB')}</span>
          {info.row.original.offline_receipt_number && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace' }}>
              Offline: {info.row.original.offline_receipt_number}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Customer',
      accessorKey: 'customer_name',
      cell: (info) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{info.row.original.customer_name || 'Unknown'}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{info.row.original.customer_phone || 'No phone'}</div>
        </div>
      )
    },
    {
      header: 'Products',
      accessorKey: 'items',
      cell: (info) => {
        const items = info.getValue() as { product_name: string, quantity: number }[];
        if (!items || items.length === 0) return <span>No items</span>;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ fontSize: '13px' }}>
                <span style={{ fontWeight: 500, color: 'var(--brand-primary)' }}>{item.quantity}x</span> {item.product_name}
              </div>
            ))}
          </div>
        );
      }
    },
    {
      header: 'Deposit',
      accessorKey: 'advance_payment',
      cell: (info) => {
        const val = parseFloat(info.getValue() as string);
        return <span style={{ fontWeight: 600, color: val > 0 ? 'var(--status-success)' : 'var(--text-muted)' }}>
          Rs {val.toFixed(2)}
        </span>;
      }
    },
    {
      header: 'Pref. Sale',
      accessorKey: 'sale_type_preference',
      cell: (info) => (
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {info.getValue() as string || '-'}
        </span>
      )
    },
    {
      header: 'Remarks',
      accessorKey: 'remarks',
      cell: (info) => info.getValue() ? <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{info.getValue() as string}</span> : '-'
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (info) => (
        <span style={{ 
          padding: '4px 8px', 
          borderRadius: '12px', 
          fontSize: '11px', 
          fontWeight: 700,
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: 'var(--status-warning)'
        }}>
          {info.getValue() as string}
        </span>
      )
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: (info) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-primary"
            onClick={() => navigate(`/bookings/${info.row.original.id}/checkout`)}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            Fulfill
          </button>
          <button 
            className="btn-secondary"
            onClick={() => handleDelete(info.row.original.id)}
            disabled={deletingId === info.row.original.id}
            style={{ padding: '6px', color: 'var(--status-error)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
            title="Cancel Booking"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <PackageSearch size={28} color="var(--brand-primary)" />
            Bookings
          </h1>
          <p className="page-description">Manage customer bookings and advance deposits</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/bookings/new')}>
          Create Booking
        </button>
      </div>

      <div className="glass-panel" style={{ padding: 'var(--spacing-3)', display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '14px' }}>
          <Filter size={18} />
          Filters:
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Map size={16} color="var(--text-muted)" />
          <select 
            className="input-field" 
            style={{ width: '250px', padding: '8px 12px' }}
            value={routeIdFilter}
            onChange={(e) => setRouteIdFilter(e.target.value)}
          >
            <option value="">All Routes</option>
            {routes.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-panel">
        <DataTable 
          columns={columns}
          data={orders}
          isLoading={loading}
          emptyMessage="No pending bookings found."
        />
      </div>
    </div>
  );
}
