import type { PermissionRule } from '@/utils';
import type { ReactNode } from 'react';

export interface AccessState {
  allowed: boolean;
  pending: boolean;
}

export interface AccessProps {
  rule: PermissionRule;
  fallback?: ReactNode;
  children: ReactNode | ((state: AccessState) => ReactNode);
}
