import React from 'react';
import { useAuth } from '../hooks/useAuth';

type PermissionGuardProps = {
  permission: string;
  fallback?: React.ReactNode;
  behavior?: 'hide' | 'disable';
  children: React.ReactNode;
};

export function PermissionGuard({ permission, fallback = null, behavior = 'hide', children }: PermissionGuardProps) {
  const hasPermission = useAuth((s) => s.hasPermission);
  
  if (!hasPermission(permission)) {
    if (behavior === 'disable') {
      if (React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement, {
          disabled: true,
          style: { ...((children.props as any).style || {}), opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' },
          title: 'You do not have permission to perform this action'
        } as any);
      }
      return <span style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Permission denied">{children}</span>;
    }
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
