/**
 * One source of truth for status colours, so "Delivered" looks the same on every page,
 * chart and PDF.
 */

export type StatusTone = 'success' | 'info' | 'warning' | 'error' | 'gray' | 'primary' | 'accent';

const TONES: Record<string, StatusTone> = {
  // Orders and dispatches
  PENDING: 'gray',
  SCHEDULED: 'primary',
  ASSIGNED: 'primary',
  DISPATCHED: 'warning',
  IN_TRANSIT: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'error',
  FAILED: 'error',
  RETURNED: 'accent',
  // Priority
  LOW: 'gray',
  MEDIUM: 'warning',
  HIGH: 'error',
  URGENT: 'error',
  // People and assets
  ACTIVE: 'success',
  INACTIVE: 'gray',
  AVAILABLE: 'success',
  ON_DUTY: 'info',
  BUSY: 'warning',
  OFF_DUTY: 'gray',
  IN_USE: 'info',
  MAINTENANCE: 'warning',
  OUT_OF_SERVICE: 'error',
  // Stock
  IN_STOCK: 'success',
  LOW_STOCK: 'warning',
  OUT_OF_STOCK: 'error',
  DISCONTINUED: 'error',
  // Payments and invoices
  PAID: 'success',
  UNPAID: 'warning',
  REFUNDED: 'accent',
  SUCCESSFUL: 'success',
  VOID: 'gray',
  // Purchasing, transfers and returns
  DRAFT: 'gray',
  SENT: 'info',
  RECEIVED: 'success',
  PARTIAL: 'warning',
  REQUESTED: 'warning',
  APPROVED: 'primary',
  RESCHEDULED: 'info',
  REJECTED: 'error',
  FAILED_DELIVERY: 'error',
  RETURN: 'accent',
  // Accounts
  PENDING_APPROVAL: 'warning',
};

export const toneFor = (status?: string | null): StatusTone =>
  TONES[(status || '').toUpperCase().replace(/[\s-]+/g, '_')] || 'gray';

export const statusLabel = (status?: string | null): string =>
  (status || 'Unknown').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());

/** Hex colours for charts, matched to the badge tones. */
export const TONE_HEX: Record<StatusTone, string> = {
  success: '#10B981',
  info: '#3B82F6',
  warning: '#F59E0B',
  error: '#EF4444',
  gray: '#94A3B8',
  primary: '#4682B4',
  accent: '#FF8C42',
};

export const statusHex = (status?: string | null) => TONE_HEX[toneFor(status)];

/** Order of the delivery pipeline, used by progress bars, Kanban and tracking. */
export const ORDER_PIPELINE = ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'] as const;
