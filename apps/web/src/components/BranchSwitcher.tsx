import { useBranches } from '../features/branches/api';
import { useBranchStore } from '../hooks/useBranchStore';
import { Building2 } from 'lucide-react';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function BranchSwitcher() {
  const { data: branches, isLoading } = useBranches();
  const { activeBranchId, setActiveBranchId } = useBranchStore();
  const queryClient = useQueryClient();

  // Auto-select first branch if none is active
  useEffect(() => {
    if (!activeBranchId && branches && branches.length > 0) {
      // Find a default active one, or just the first
      const defaultBranch = branches.find(b => b.isActive) || branches[0];
      setActiveBranchId(defaultBranch.id);
    }
  }, [branches, activeBranchId, setActiveBranchId]);

  return (
    <div style={{
      marginBottom: 'var(--spacing-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <label style={{
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        Active Branch Context
      </label>
      
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--brand-primary)',
          pointerEvents: 'none'
        }}>
          <Building2 size={16} />
        </div>
        
        <select
          value={activeBranchId || ''}
          onChange={(e) => {
            setActiveBranchId(e.target.value);
            queryClient.invalidateQueries(); // Force full reload for new branch data
          }}
          disabled={isLoading || !branches?.length}
          style={{
            width: '100%',
            padding: '10px 12px 10px 36px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-sm)',
            color: 'var(--text-primary)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 500,
            appearance: 'none',
            cursor: 'pointer',
            outline: 'none',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all var(--transition-fast)'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--brand-primary)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border-color)';
          }}
        >
          {isLoading ? (
            <option value="">Loading branches...</option>
          ) : !branches?.length ? (
            <option value="">No branches available</option>
          ) : (
            branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name} {!branch.isActive && '(Inactive)'}
              </option>
            ))
          )}
        </select>
        
        {/* Custom dropdown arrow to replace native appearance */}
        <div style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: 'var(--text-secondary)'
        }}>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
