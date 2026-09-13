import { useState, useMemo } from 'react';
import { useGetMapData } from '../api';
import { useTrips } from '../../operations/api';
import { MapPin, Truck, DollarSign, XCircle, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { OperationsMap } from '../components/OperationsMap';

export function MapDashboardPage() {
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  
  const [layers, setLayers] = useState({
    customers: false, // Default false, will show only customer points connected to trip transactions
    receipts: true,
    attempts: true,
    sales: true,
    routes: true
  });

  // Fetch the 100 most recent trips to select from
  const { data: tripsRes } = useTrips(1, 100);
  const trips = tripsRes?.data || [];

  // Find the currently selected trip object for the summary panel
  const selectedTrip = useMemo(() => {
    return trips.find((t: any) => t.id === selectedTripId);
  }, [trips, selectedTripId]);

  // Fetch map data filtered by the selected trip
  const { data, isLoading } = useGetMapData({ 
    trip_id: selectedTripId || undefined 
  });

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 60px)', background: 'var(--bg-primary)' }}>
      {/* Header & Selector Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 700 }}>
            <MapPin color="var(--brand-primary)" size={28} />
            Trip Audit Map
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Track driver coordinates, sales checkouts, and collection locations for individual trips
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Trip:</span>
          <select 
            className="form-control" 
            value={selectedTripId}
            onChange={e => setSelectedTripId(e.target.value)}
            style={{ width: '280px', padding: '6px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          >
            <option value="">-- Choose a Field Trip --</option>
            {trips.map((t: any) => (
              <option key={t.id} value={t.id}>
                {format(new Date(t.created_at), 'dd MMM yyyy')} - {t.driver?.name || 'Unknown Driver'} ({t.vehicle?.vehicle_number || 'No Vehicle'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, gap: '20px', minHeight: 0 }}>
        {/* Left Side Info Panel */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', overflowY: 'auto' }}>
          {selectedTrip ? (
            <>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                  <Truck size={18} color="var(--brand-primary)" />
                  Trip Details
                </h3>
              </div>

              {/* Stats & Metadata */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Driver:</span>
                  <span style={{ fontWeight: 600 }}>{selectedTrip.driver?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Vehicle:</span>
                  <span style={{ fontWeight: 600 }}>{selectedTrip.vehicle?.vehicle_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Start Odo:</span>
                  <span style={{ fontWeight: 600 }}>{selectedTrip.start_km ? `${selectedTrip.start_km} km` : 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>End Odo:</span>
                  <span style={{ fontWeight: 600 }}>{selectedTrip.end_km ? `${selectedTrip.end_km} km` : 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    background: selectedTrip.status === 'COMPLETED' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', 
                    color: selectedTrip.status === 'COMPLETED' ? 'var(--status-success)' : 'var(--brand-primary)' 
                  }}>{selectedTrip.status}</span>
                </div>
              </div>

              <div style={{ borderBottom: '1px solid var(--border-color)', margin: '8px 0' }} />

              {/* Activity Summary on this trip */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>Trip Activity Summary</h4>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <ShoppingCart size={18} color="#8B5CF6" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sales Logs</div>
                    <div style={{ fontSize: '15px', fontWeight: 700 }}>{data?.sales?.length || 0} Checked out</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <DollarSign size={18} color="#10B981" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Collections</div>
                    <div style={{ fontSize: '15px', fontWeight: 700 }}>{data?.receipts?.length || 0} Payments</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <XCircle size={18} color="#EF4444" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Missed Visits</div>
                    <div style={{ fontSize: '15px', fontWeight: 700 }}>{data?.attempts?.length || 0} Logged</div>
                  </div>
                </div>
              </div>

              <div style={{ borderBottom: '1px solid var(--border-color)', margin: '8px 0' }} />

              {/* Layers/Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>Filters</h4>
                
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
                  <span style={{ color: '#8B5CF6', fontWeight: 600 }}>Sales Checkouts</span>
                  <input type="checkbox" checked={layers.sales} onChange={e => setLayers({...layers, sales: e.target.checked})} />
                </label>

                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
                  <span style={{ color: '#10B981', fontWeight: 600 }}>Receipt Collections</span>
                  <input type="checkbox" checked={layers.receipts} onChange={e => setLayers({...layers, receipts: e.target.checked})} />
                </label>

                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
                  <span style={{ color: '#EF4444', fontWeight: 600 }}>Missed Collection Visits</span>
                  <input type="checkbox" checked={layers.attempts} onChange={e => setLayers({...layers, attempts: e.target.checked})} />
                </label>

                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
                  <span style={{ color: '#3B82F6', fontWeight: 600 }}>GPS Breadcrumb Route</span>
                  <input type="checkbox" checked={layers.routes} onChange={e => setLayers({...layers, routes: e.target.checked})} />
                </label>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              <Truck size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p>Please select a trip from the dropdown above to audit driver locations and routes.</p>
            </div>
          )}
        </div>

        {/* Map Area */}
        <div style={{ flex: 1, height: '100%' }}>
          <OperationsMap data={data} isLoading={isLoading} layers={layers} />
        </div>
      </div>
    </div>
  );
}
