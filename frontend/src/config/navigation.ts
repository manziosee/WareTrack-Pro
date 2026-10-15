import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users, Package, ShoppingCart, Truck, Car, MapPin, BarChart3, Bell, UserCheck, Settings,
} from 'lucide-react';
import type { UserRole } from '@/types';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  /** Extra words the command palette should match. */
  keywords?: string;
  /** Shown in the phone tab bar for these roles. */
  mobileFor?: UserRole[];
  badge?: 'pendingUsers' | 'unreadNotifications' | 'unreadMessages';
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const ALL: UserRole[] = ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER', 'DRIVER'];

/** Single source of truth for navigation: sidebar, phone tab bar and command palette. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ALL, keywords: 'home overview', mobileFor: ALL },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Orders', href: '/orders', icon: ShoppingCart, roles: ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER'], keywords: 'deliveries customers', mobileFor: ['WAREHOUSE_STAFF', 'DISPATCH_OFFICER'] },
      { name: 'Dispatch', href: '/dispatch', icon: Truck, roles: ['ADMIN', 'DISPATCH_OFFICER'], keywords: 'assign schedule', mobileFor: ['DISPATCH_OFFICER'] },
      { name: 'Tracking', href: '/tracking', icon: MapPin, roles: ['ADMIN', 'DISPATCH_OFFICER', 'DRIVER'], keywords: 'deliveries status', mobileFor: ['DRIVER'] },
    ],
  },
  {
    title: 'Warehouse',
    items: [
      { name: 'Inventory', href: '/inventory', icon: Package, roles: ['ADMIN', 'WAREHOUSE_STAFF'], keywords: 'stock items products', mobileFor: ['WAREHOUSE_STAFF'] },
    ],
  },
  {
    title: 'Fleet',
    items: [
      { name: 'Drivers', href: '/drivers', icon: UserCheck, roles: ['ADMIN', 'DISPATCH_OFFICER', 'DRIVER'], keywords: 'staff' },
      { name: 'Vehicles', href: '/vehicles', icon: Car, roles: ['ADMIN', 'DISPATCH_OFFICER', 'DRIVER'], keywords: 'trucks fleet maintenance' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER'], keywords: 'analytics charts export' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { name: 'Notifications', href: '/notifications', icon: Bell, roles: ALL, keywords: 'alerts', badge: 'unreadNotifications', mobileFor: ['DRIVER'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { name: 'Users', href: '/users', icon: Users, roles: ['ADMIN'], keywords: 'accounts approve team', badge: 'pendingUsers' },
      { name: 'Settings', href: '/settings', icon: Settings, roles: ALL, keywords: 'preferences profile theme' },
    ],
  },
];

export function navForRole(role?: UserRole): NavSection[] {
  if (!role) return [];
  return NAV_SECTIONS
    .map((section) => ({ ...section, items: section.items.filter((item) => item.roles.includes(role)) }))
    .filter((section) => section.items.length > 0);
}

export function mobileNavForRole(role?: UserRole): NavItem[] {
  if (!role) return [];
  return NAV_SECTIONS.flatMap((s) => s.items).filter((item) => item.mobileFor?.includes(role)).slice(0, 4);
}
