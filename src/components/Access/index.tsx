import { usePermission } from '@/hooks/usePermission';
import type { AccessProps } from './types';

const Access = ({ rule, fallback = null, children }: AccessProps) => {
  const state = usePermission(rule);
  if (typeof children === 'function') return children(state);
  return state.pending || !state.allowed ? fallback : children;
};

export default Access;
