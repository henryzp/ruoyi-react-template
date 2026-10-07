import type { CSSProperties, ReactNode } from 'react';

export interface EllipsisTextProps {
  text: ReactNode;
  maxWidth?: number | string;
  as?: 'span' | 'div';
  className?: string;
  style?: CSSProperties;
}
