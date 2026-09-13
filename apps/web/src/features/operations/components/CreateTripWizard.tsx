import { useState } from 'react';
import { useCreateTrip } from '../api';
import { useRoutes } from '../../routes/api';
import { useVehicles } from '../../vehicles/api';
import { useUsers } from '../../users/api';
import { MapPin, Truck, UserCircle, Users, Plus, X } from 'lucide-react';

export function CreateTripWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [routeId, setRouteId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [inchargeId, setInchargeId] = useState('');
  const [tripType, setTripType] = useState('BOTH');
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [staff, setStaff] = useState<{user_id: string, duty: string}[]>([]);

  const { data: routesData } = useRoutes();
  const { data: vehiclesData } = useVehicles();
  const { data: usersData } = useUsers();

  const routes = Array.isArray(routesData) ? routesData : ((routesData as any)?.data || []);
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : ((vehiclesData as any)?.data || []);
  const users = Array.isArray(usersData) ? usersData : ((usersData as any)?.data || []);
  const createTrip = useCreateTrip();

  const handleNext = async () => {
    if (step === 1) {
      if (!routeId || !vehicleId || !inchargeId || !plannedDate) return alert("Please fill all required fields");
      setStep(2);
    } else if (step === 2) {
      try {
        await createTrip.mutateAsync({
          route_id: routeId,
          vehicle_id: vehicleId,
          incharge_id: inchargeId,
          type: tripType,
          planned_date: plannedDate,
          staff: staff.length > 0 ? staff : undefined
        });
        onClose();
      } catch (e: any) {
        alert(e.message || "Failed to create trip");
      }
    }
  };

  const addStaff = () => {
    if (staff.length >= 4) return alert("Maximum 4 staff allowed");
    setStaff([...staff, { user_id: '', duty: 'Assistant' }]);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ width: '500px', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Plan New Trip</h2>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-primary)', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
            Step {step} of 2
          </span>
        </div>

        <div style={{ padding: '24px', minHeight: '320px', maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {step === 1 && (
            <>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16}/> Route</span>
                <SearchableSelect 
                  value={routeId}
                  onChange={setRouteId}
                  options={routes?.map((r: any) => ({ label: r.name, value: r.id })) || []}
                  placeholder="-- Search Route --"
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Truck size={16}/> Vehicle</span>
                <SearchableSelect 
                  value={vehicleId}
                  onChange={setVehicleId}
                  options={vehicles?.map((v: any) => ({ label: `${v.license_plate} (${v.model})`, value: v.id })) || []}
                  placeholder="-- Search Vehicle --"
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}><UserCircle size={16}/> In-Charge</span>
                <SearchableSelect 
                  value={inchargeId}
                  onChange={setInchargeId}
                  options={users?.map((u: any) => ({ label: u.name || u.email, value: u.id })) || []}
                  placeholder="-- Search Trip In-Charge --"
                />
              </label>

              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Trip Type</span>
                  <select value={tripType} onChange={e => setTripType(e.target.value)} style={{ padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}>
                    <option value="SALE">Sales Only</option>
                    <option value="COLLECTION">Collections Only</option>
                    <option value="BOTH">Sales & Collections</option>
                  </select>
                </label>
                <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Planned Date</span>
                  <input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }} />
                </label>
              </div>
            </>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <Users size={18} />
                  <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Additional Staff (Optional)</h3>
                </div>
                <button onClick={addStaff} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  <Plus size={16} /> Add Staff
                </button>
              </div>
              
              {staff.length === 0 && (
                <div style={{ padding: '24px', background: 'var(--bg-tertiary)', borderRadius: '8px', textAlign: 'center', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No additional staff assigned.
                </div>
              )}
              
              {staff.map((s, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                  <div style={{ flex: 2 }}>
                    <SearchableSelect 
                      value={s.user_id}
                      onChange={(v) => { const newS = [...staff]; newS[index].user_id = v; setStaff(newS); }}
                      options={users?.map((u: any) => ({ label: u.name || u.email, value: u.id })) || []}
                      placeholder="Search Staff"
                    />
                  </div>
                  <input value={s.duty} onChange={e => { const newS = [...staff]; newS[index].duty = e.target.value; setStaff(newS); }} placeholder="Duty (e.g. Driver)" style={{ flex: 1, padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                  <button onClick={() => setStaff(staff.filter((_, i) => i !== index))} style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><X size={16}/></button>
                </div>
              ))}
              
              <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <strong>Note:</strong> Initial stock loading is disabled for this version. You can create the trip now and use it directly for collections or sales.
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
          <button 
            onClick={step === 1 ? onClose : () => setStep(1)}
            style={{ flex: 1, padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          <button 
            onClick={handleNext}
            disabled={createTrip.isPending}
            style={{ flex: 2, padding: '12px', background: 'var(--brand-primary)', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', opacity: createTrip.isPending ? 0.7 : 1 }}
          >
            {createTrip.isPending ? 'Processing...' : step === 2 ? 'Create Trip' : 'Next Step'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchableSelect({ value, onChange, options, placeholder }: { value: string, onChange: (v: string) => void, options: {label: string, value: string}[], placeholder: string }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(o => o.value === value);
  const displayValue = isOpen ? query : (selectedOption ? (selectedOption.label || '') : '');
  
  const filtered = options.filter(o => (o.label || '').toLowerCase().includes((query || '').toLowerCase()));
  
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input 
        value={displayValue}
        onChange={e => { setQuery(e.target.value); setIsOpen(true); onChange(''); }}
        onFocus={() => { setIsOpen(true); setQuery(''); }}
        onBlur={() => setIsOpen(false)}
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
      />
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>No results found</div>
          ) : (
            filtered.map(o => (
              <div 
                key={o.value} 
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  onChange(o.value); 
                  setIsOpen(false); 
                  setQuery(''); 
                }}
                style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '13px', background: o.value === value ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = o.value === value ? 'var(--bg-secondary)' : 'transparent'}
              >
                {o.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

