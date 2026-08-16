
import { LucideIcon } from 'lucide-react';
import type { Permission } from './types/common';

export type IconColor =
  | 'purple'
  | 'green'
  | 'blue'
  | 'sky'
  | 'orange'
  | 'red'
  | 'indigo'
  | 'pink'
  | 'teal'
  | 'yellow'
  | 'slate'
  | 'emerald';

export interface MenuItem {
  id: string;
  labelKey: string; // Updated from 'label' to support i18n
  icon: LucideIcon;
  path: string;
  color: IconColor;
  /**
   * Server-side permission required to see this menu item.
   * When present, visibility is decided by `useAllPermissions()`
   * (via the `get_user_permissions()` RPC), not by client-side role
   * checks. Replaces the legacy `isOwner` flag (ADR-003 Phase 3).
   */
  requiredPermission?: Permission;
}

export type ThemeColor = 'emerald' | 'purple' | 'amber' | 'blue' | 'slate' | 'red' | 'rose' | 'indigo';

export interface StatConfig {
  id: string;
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  theme: ThemeColor;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorClass: string;
  iconBgClass: string;
}

export interface ChartData {
  name: string;
  value: number;
  fill?: string;
}

export interface SalesData {
  name: string;
  sales: number;
  purchases: number;
}

export type AppStatus = 'idle' | 'loading' | 'success' | 'error';