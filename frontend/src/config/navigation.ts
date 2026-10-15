import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users, Package, ShoppingCart, Truck, Car, MapPin, BarChart3, Bell, UserCheck, Settings,
  KanbanSquare, CalendarDays, Map, RotateCcw, ScanLine, Warehouse, FileText, TrendingUp, Award, FileBarChart,
  Wallet, MessagesSquare, History, Route,
} from 'lucide-react';
import type { UserRole } from '@/types';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  /** Extra words the command palette should match. */
  keywords?: string;
  /** Shown in the phone tab bar for these roles (first four per role). */
  mobileFor?: UserRole[];
  badge?: 'pendingUsers' | 'unreadNotifications' | 'unreadMessages';
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const ALL: UserRole[] = ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER', 'DRIVER'];
const STAFF: UserRole[] = ['ADMIN', 'WAREHOUSE_STAFF', 'DISPATCH_OFFICER'];
const STOCK: UserRole[] = ['ADMIN', 'WAREHOUSE_STAFF'];
const FLEET: UserRole[] = ['ADMIN', 'DISPATCH_OFFICER'];

/** Single source of truth for navigation: sidebar, phone tab bar and command palette. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ALL, keywords: 'home overview', mobileFor: ALL },
      { name: 'My Deliveries', href: '/my-deliveries', icon: Route, roles: ['DRIVER'], keywords: 'route stops proof signature', mobileFor: ['DRIVER'] },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Orders', href: '/orders', icon: ShoppingCart, roles: STAFF, keywords: 'deliveries customers', mobileFor: ['WAREHOUSE_STAFF', 'DISPATCH_OFFICER', 'ADMIN'] },
      { name: 'Order Board', href: '/orders/board', icon: KanbanSquare, roles: STAFF, keywords: 'kanban drag status pipeline' },
      { name: 'Dispatch', href: '/dispatch', icon: Truck, roles: FLEET, keywords: 'assign schedule auto', mobileFor: ['DISPATCH_OFFICER'] },
      { name: 'Live Map', href: '/map', icon: Map, roles: FLEET, keywords: 'drivers location gps', mobileFor: ['DISPATCH_OFFICER', 'ADMIN'] },
      { name: 'Calendar', href: '/calendar', icon: CalendarDays, roles: FLEET, keywords: 'schedule maintenance week' },
      { name: 'Tracking', href: '/tracking', icon: MapPin, roles: ['ADMIN', 'DISPATCH_OFFICER', 'DRIVER'], keywords: 'deliveries status' },
      { name: 'Returns', href: '/returns', icon: RotateCcw, roles: STAFF, keywords: 'failed refund reschedule' },
    ],
  },
  {
    title: 'Warehouse',
    items: [
      { name: 'Inventory', href: '/inventory', icon: Package, roles: STOCK, keywords: 'stock items products', mobileFor: ['WAREHOUSE_STAFF'] },
      { name: 'Scanner', href: '/scanner', icon: ScanLine, roles: STOCK, keywords: 'barcode qr camera', mobileFor: ['WAREHOUSE_STAFF'] },
      { name: 'Warehouses', href: '/warehouses', icon: Warehouse, roles: STOCK, keywords: 'locations transfers' },
      { name: 'Purchasing', href: '/purchasing', icon: FileText, roles: STOCK, keywords: 'suppliers purchase orders restock' },
      { name: 'Forecasting', href: '/forecasting', icon: TrendingUp, roles: STOCK, keywords: 'demand prediction reorder' },
    ],
  },
  {
    title: 'Fleet',
    items: [
      { name: 'Drivers', href: '/drivers', icon: UserCheck, roles: ['ADMIN', 'DISPATCH_OFFICER', 'DRIVER'], keywords: 'staff' },
      { name: 'Vehicles', href: '/vehicles', icon: Car, roles: ['ADMIN', 'DISPATCH_OFFICER', 'DRIVER'], keywords: 'trucks fleet maintenance' },
      { name: 'Scorecards', href: '/scorecards', icon: Award, roles: FLEET, keywords: 'performance drivers ranking' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { name: 'Reports', href: '/reports', icon: BarChart3, roles: STAFF, keywords: 'analytics charts export' },
      { name: 'Report Builder', href: '/reports/builder', icon: FileBarChart, roles: STAFF, keywords: 'custom schedule email' },
      { name: 'Payments', href: '/payments', icon: Wallet, roles: STAFF, keywords: 'momo airtel invoices cash' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { name: 'Messages', href: '/messages', icon: MessagesSquare, roles: ALL, keywords: 'chat', badge: 'unreadMessages', mobileFor: ['DRIVER'] },
      { name: 'Notifications', href: '/notifications', icon: Bell, roles: ALL, keywords: 'alerts', badge: 'unreadNotifications', mobileFor: ['DRIVER'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { name: 'Users', href: '/users', icon: Users, roles: ['ADMIN'], keywords: 'accounts approve team', badge: 'pendingUsers', mobileFor: ['ADMIN'] },
      { name: 'Audit Log', href: '/audit', icon: History, roles: ['ADMIN'], keywords: 'history changes who' },
      { name: 'Settings', href: '/settings', icon: Settings, roles: ALL, keywords: 'preferences profile security two-factor webhooks' },
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
