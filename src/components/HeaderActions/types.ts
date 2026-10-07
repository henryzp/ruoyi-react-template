export interface HeaderActionsProps {
  adminPath?: string;
  roleLabel?: string;
  showUtilities?: boolean;
}
export interface UtilityItem {
  key: 'ai' | 'message' | 'admin';
  icon: string;
  label: string;
  badge?: number;
  showBadge?: boolean;
}
