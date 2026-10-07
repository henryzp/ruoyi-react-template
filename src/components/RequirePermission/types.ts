import type { PermissionRule } from '@/utils';
import type { ReactNode } from 'react';

export interface RequirePermissionProps {
  rule: PermissionRule;
  children?: ReactNode;
}
