import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DollarSign, XCircle, Clock, ShoppingCart, User } from 'lucide-react';
import { format } from 'date-fns';
import MarkerClusterGroup from 'react-leaflet-cluster';

// Custom icons using Lucide SVGs and colors
const createCustomIcon = (color: string, iconHtml: string) => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        border: 2px solid white;
      ">
        ${iconHtml}
      </div>
      <div style="
        width: 0; 
        height: 0; 
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid ${color};
        margin: -2px auto 0;
      "></div>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40],
  });
};

export const mapIcons = {
  customer: createCustomIcon('#3B82F6', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'),
  receipt: createCustomIcon('#10B981', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>'),
  promise: createCustomIcon('#F59E0B', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'),
  missed: createCustomIcon('#EF4444', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'),
  sale: createCustomIcon('#8B5CF6', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>')
};

// Custom Cluster Icon
const createClusterIcon = function (cluster: any) {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `
      <div style="
        background-color: #3b82f6; 
        width: 32px; 
        height: 32px; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        color: white; 
        font-weight: bold;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">
        <span>${count}</span>
      </div>
    `,
    className: 'custom-leaflet-cluster-icon',
    iconSize: L.point(32, 32, true),
  });
};

// Component to auto-center map based on markers and routes
function MapBounds({ data, layers }: { data: any, layers: any }) {
  const map = useMap();
  
  React.useEffect(() => {
    const bounds = L.latLngBounds([]);
    let hasPoints = false;
    
    if (layers.sales && data?.sales) {
      data.sales.forEach((s: any) => {
        if (s.gps_lat && s.gps_lng) { bounds.extend([Number(s.gps_lat), Number(s.gps_lng)]); hasPoints = true; }
        if (s.customer?.gps_lat && s.customer?.gps_lng) { bounds.extend([Number(s.customer.gps_lat), Number(s.customer.gps_lng)]); hasPoints = true; }
      });
    }
    
    if (layers.receipts && data?.receipts) {
      data.receipts.forEach((r: any) => {
        if (r.gps_lat && r.gps_lng) { bounds.extend([Number(r.gps_lat), Number(r.gps_lng)]); hasPoints = true; }
        if (r.customer?.gps_lat && r.customer?.gps_lng) { bounds.extend([Number(r.customer.gps_lat), Number(r.customer.gps_lng)]); hasPoints = true; }
      });
    }

    if (layers.attempts && data?.attempts) {
      data.attempts.forEach((a: any) => {
        if (a.gps_lat && a.gps_lng) { bounds.extend([Number(a.gps_lat), Number(a.gps_lng)]); hasPoints = true; }
        if (a.customer?.gps_lat && a.customer?.gps_lng) { bounds.extend([Number(a.customer.gps_lat), Number(a.customer.gps_lng)]); hasPoints = true; }
      });
    }
    
    if (layers.routes && data?.routes) {
      data.routes.forEach((r: any) => {
        if (r.gps_lat && r.gps_lng) { bounds.extend([Number(r.gps_lat), Number(r.gps_lng)]); hasPoints = true; }
      });
    }
    
    if (hasPoints) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [data, layers, map]);

  return null;
}

interface OperationsMapProps {
  data: any;
  isLoading: boolean;
  layers: {
    customers: boolean;
    receipts: boolean;
    attempts: boolean;
    sales: boolean;
    routes: boolean;
  };
}

export function OperationsMap({ data, isLoading, layers }: OperationsMapProps) {
  const defaultCenter: [number, number] = [7.8731, 80.7718]; // Center to Sri Lanka
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  return (
    <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', minHeight: '400px', height: '100%' }}>
      {isLoading && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            Loading audit markers...
          </div>
        </div>
      )}

      <MapContainer 
        center={defaultCenter} 
        zoom={8} 
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        
        <MapBounds data={data} layers={layers} />

        {/* --- 1. INTERACTIVE GEOMETRY LAYER (Shows home & line ONLY on click selection) --- */}
        {layers.sales && data?.sales?.map((sale: any) => {
          const lat = Number(sale.gps_lat);
          const lng = Number(sale.gps_lng);
          const custLat = sale.customer?.gps_lat ? Number(sale.customer.gps_lat) : null;
          const custLng = sale.customer?.gps_lng ? Number(sale.customer.gps_lng) : null;
          const isSelected = selectedMarkerId === `sale-${sale.id}`;

          return isSelected && custLat && custLng ? (
            <React.Fragment key={`selected-sale-${sale.id}`}>
              {/* Customer Home Address Marker */}
              <Marker position={[custLat, custLng]} icon={mapIcons.customer}>
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3B82F6', fontWeight: 'bold', marginBottom: '6px' }}>
                      <User size={16} /> Registered Home Address
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{sale.customer?.full_name}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{sale.customer?.address}</p>
                  </div>
                </Popup>
              </Marker>
              {/* Connect Line */}
              <Polyline 
                positions={[[custLat, custLng], [lat, lng]]} 
                color="#8B5CF6" 
                weight={2} 
                dashArray="5, 5" 
              />
            </React.Fragment>
          ) : null;
        })}

        {layers.receipts && data?.receipts?.map((receipt: any) => {
          const lat = Number(receipt.gps_lat);
          const lng = Number(receipt.gps_lng);
          const custLat = receipt.customer?.gps_lat ? Number(receipt.customer.gps_lat) : null;
          const custLng = receipt.customer?.gps_lng ? Number(receipt.customer.gps_lng) : null;
          const isSelected = selectedMarkerId === `rec-${receipt.id}`;

          return isSelected && custLat && custLng ? (
            <React.Fragment key={`selected-rec-${receipt.id}`}>
              {/* Customer Home Address Marker */}
              <Marker position={[custLat, custLng]} icon={mapIcons.customer}>
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3B82F6', fontWeight: 'bold', marginBottom: '6px' }}>
                      <User size={16} /> Registered Home Address
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{receipt.customer?.full_name}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{receipt.customer?.address}</p>
                  </div>
                </Popup>
              </Marker>
              {/* Connect Line */}
              <Polyline 
                positions={[[custLat, custLng], [lat, lng]]} 
                color="#10B981" 
                weight={2} 
                dashArray="5, 5" 
              />
            </React.Fragment>
          ) : null;
        })}

        {layers.attempts && data?.attempts?.filter((a: any) => a.status !== 'COLLECTED').map((attempt: any) => {
          const lat = Number(attempt.gps_lat);
          const lng = Number(attempt.gps_lng);
          const custLat = attempt.customer?.gps_lat ? Number(attempt.customer.gps_lat) : null;
          const custLng = attempt.customer?.gps_lng ? Number(attempt.customer.gps_lng) : null;
          const isSelected = selectedMarkerId === `att-${attempt.id}`;

          return isSelected && custLat && custLng ? (
            <React.Fragment key={`selected-att-${attempt.id}`}>
              {/* Customer Home Address Marker */}
              <Marker position={[custLat, custLng]} icon={mapIcons.customer}>
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3B82F6', fontWeight: 'bold', marginBottom: '6px' }}>
                      <User size={16} /> Registered Home Address
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{attempt.customer?.full_name}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{attempt.customer?.address}</p>
                  </div>
                </Popup>
              </Marker>
              {/* Connect Line */}
              <Polyline 
                positions={[[custLat, custLng], [lat, lng]]} 
                color="#EF4444" 
                weight={2} 
                dashArray="5, 5" 
              />
            </React.Fragment>
          ) : null;
        })}

        {/* --- 2. MARKERS LAYER (Clustered & Spiderfied) --- */}
        <MarkerClusterGroup 
          chunkedLoading 
          maxClusterRadius={15}
          iconCreateFunction={createClusterIcon}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
        >
          {/* Sales Markers */}
          {layers.sales && data?.sales?.map((sale: any) => {
            const lat = Number(sale.gps_lat);
            const lng = Number(sale.gps_lng);

            return (
              <Marker 
                key={`sale-${sale.id}`}
                position={[lat, lng]} 
                icon={mapIcons.sale}
                eventHandlers={{
                  click: () => setSelectedMarkerId(`sale-${sale.id}`),
                  popupclose: () => setSelectedMarkerId(null)
                }}
              >
                <Popup>
                  <div style={{ minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8B5CF6', fontWeight: 'bold', marginBottom: '6px' }}>
                      <ShoppingCart size={16} /> Sale Checkout
                    </div>
                    
                    {sale.sale_type === 'INSTALLMENT' ? (
                      (() => {
                        const total = Number(sale.total);
                        const downpaymentPaid = Number(sale.contract?.downpayment || 0);
                        const recoverySchedule = sale.contract?.schedules?.find((s: any) => s.installment_number === 0);
                        const recoveryAmount = recoverySchedule ? Number(recoverySchedule.amount_due) : 0;
                        const effectiveDp = downpaymentPaid + recoveryAmount;
                        const principal = total - effectiveDp;
                        const interest = principal * (Number(sale.contract?.scheme?.interest_rate || 0) / 100);
                        const grandTotal = total + interest;

                        return (
                          <>
                            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>Amount Collected</div>
                            <h3 style={{ margin: '2px 0 6px 0', fontSize: '18px', color: '#10B981', fontWeight: 800 }}>
                              Rs. {downpaymentPaid.toLocaleString('en-GB')}
                            </h3>

                            <div style={{ fontSize: '12px', color: '#333', display: 'flex', flexDirection: 'column', gap: '3px', borderTop: '1px solid #eee', paddingTop: '6px', marginTop: '4px' }}>
                              <div><strong>Customer:</strong> {sale.customer?.full_name}</div>
                              <div><strong>Product Total:</strong> Rs. {total.toLocaleString('en-GB')}</div>
                              <div><strong>Min Required DP:</strong> Rs. {effectiveDp.toLocaleString('en-GB')}</div>
                              {recoveryAmount > 0 && (
                                <div style={{ color: '#d97706', fontWeight: 600 }}>
                                  Gap (Schedule 0): Rs. {recoveryAmount.toLocaleString('en-GB')}
                                </div>
                              )}
                              <div><strong>Financed Principal:</strong> Rs. {principal.toLocaleString('en-GB')}</div>
                              <div><strong>Interest ({sale.contract?.scheme?.interest_rate}%):</strong> Rs. {interest.toLocaleString('en-GB')}</div>
                              <div style={{ borderTop: '1px dashed #ccc', paddingTop: '3px', marginTop: '3px', fontWeight: 700, color: '#1e40af' }}>
                                Grand Total Payable: Rs. {grandTotal.toLocaleString('en-GB')}
                              </div>
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      <>
                        <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>Total Amount</div>
                        <h3 style={{ margin: '2px 0 6px 0', fontSize: '18px', color: '#10B981', fontWeight: 800 }}>
                          Rs. {Number(sale.total).toLocaleString('en-GB')}
                        </h3>
                        <div style={{ fontSize: '12px', color: '#333' }}>
                          <div><strong>Customer:</strong> {sale.customer?.full_name}</div>
                          <div><strong>Type:</strong> Direct Sale</div>
                        </div>
                      </>
                    )}

                    <div style={{ fontSize: '12px', color: '#666', borderTop: '1px solid #eee', paddingTop: '8px', marginTop: '8px' }}>
                      <div><strong>Invoice:</strong> #{sale.id.slice(-6).toUpperCase()}</div>
                      <div><strong>Time:</strong> {format(new Date(sale.created_at), 'MMM d, h:mm a')}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Collection Markers */}
          {layers.receipts && data?.receipts?.map((receipt: any) => {
            const lat = Number(receipt.gps_lat);
            const lng = Number(receipt.gps_lng);

            return (
              <Marker 
                key={`rec-${receipt.id}`}
                position={[lat, lng]} 
                icon={mapIcons.receipt}
                eventHandlers={{
                  click: () => setSelectedMarkerId(`rec-${receipt.id}`),
                  popupclose: () => setSelectedMarkerId(null)
                }}
              >
                <Popup>
                  <div style={{ minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontWeight: 'bold', marginBottom: '6px' }}>
                      <DollarSign size={16} /> Receipt Collection
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>Amount Collected</div>
                    <h3 style={{ margin: '2px 0 6px 0', fontSize: '18px', color: '#10B981', fontWeight: 800 }}>
                      Rs. {Number(receipt.amount).toLocaleString('en-GB')}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#333', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div><strong>Customer:</strong> {receipt.customer?.full_name}</div>
                      <div><strong>Receipt:</strong> {receipt.receipt_no}</div>
                      <div><strong>Mode:</strong> {receipt.payment_mode}</div>
                      <div><strong>Time:</strong> {format(new Date(receipt.created_at), 'MMM d, h:mm a')}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Attempt Markers (Exclude COLLECTED since they are already rendered as Receipts) */}
          {layers.attempts && data?.attempts?.filter((a: any) => a.status !== 'COLLECTED').map((attempt: any) => {
            const lat = Number(attempt.gps_lat);
            const lng = Number(attempt.gps_lng);

            return (
              <Marker 
                key={`att-${attempt.id}`}
                position={[lat, lng]} 
                icon={attempt.status === 'PROMISE_TO_PAY' ? mapIcons.promise : mapIcons.missed}
                eventHandlers={{
                  click: () => setSelectedMarkerId(`att-${attempt.id}`),
                  popupclose: () => setSelectedMarkerId(null)
                }}
              >
                <Popup>
                  <div style={{ minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: attempt.status === 'PROMISE_TO_PAY' ? '#F59E0B' : '#EF4444', fontWeight: 'bold', marginBottom: '6px' }}>
                      {attempt.status === 'PROMISE_TO_PAY' ? <Clock size={16} /> : <XCircle size={16} />}
                      {attempt.status.replace(/_/g, ' ')}
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#333' }}><strong>Customer:</strong> {attempt.customer?.full_name}</p>
                    {attempt.remarks && (
                      <div style={{ background: '#fef2f2', padding: '8px', borderRadius: '6px', fontSize: '12px', marginBottom: '8px' }}>
                        "{attempt.remarks}"
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#666', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                      <div><strong>Time:</strong> {format(new Date(attempt.created_at), 'MMM d, h:mm a')}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>

        {/* --- GPS ROUTE BREADCRUMBS --- */}
        {layers.routes && data?.routes && data.routes.length > 0 && (
          <React.Fragment>
            <Polyline 
              positions={data.routes.map((r: any) => [Number(r.gps_lat), Number(r.gps_lng)])}
              color="#3B82F6"
              weight={4}
              opacity={0.7}
              dashArray="10, 10"
            />
            {data.routes.map((r: any, pIndex: number) => (
              <CircleMarker
                key={`point-${r.id || pIndex}`}
                center={[Number(r.gps_lat), Number(r.gps_lng)]}
                radius={4}
                pathOptions={{ color: '#3B82F6', fillColor: '#fff', fillOpacity: 1, weight: 2 }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600 }}>Breadcrumb Log</div>
                    <div style={{ color: '#666' }}>{format(new Date(r.timestamp), 'hh:mm a')}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </React.Fragment>
        )}

      </MapContainer>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: white !important;
          color: #333 !important;
        }
      `}</style>
    </div>
  );
}
