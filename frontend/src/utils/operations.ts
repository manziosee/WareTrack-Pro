import type { QueryClient } from '@tanstack/react-query';

/**
 * Orders, dispatches, drivers and vehicles move together: a status change on
 * one page must show on the others. Call after any change to any of them.
 */
export function refreshOperations(queryClient: QueryClient) {
  for (const key of [
    ['list', 'orders'],
    ['list', 'dispatches'],
    ['list', 'drivers'],
    ['list', 'vehicles'],
    ['driver-assignments'],
    ['vehicle-history'],
    ['reports'],
    ['insights'],
    ['my-deliveries'],
  ]) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}

export type DeliveryStage = 'WAITING' | 'ASSIGNED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'PROBLEM' | 'CANCELLED';

/** Where an order is in the delivery flow (one definition for Tracking, Dispatch and Orders). */
export function stageOf(order: { status: string; driverId?: number | null; driver?: unknown }): DeliveryStage {
  switch (order.status) {
    case 'PENDING': return order.driverId || order.driver ? 'ASSIGNED' : 'WAITING';
    case 'DISPATCHED': return 'DISPATCHED';
    case 'IN_TRANSIT': return 'IN_TRANSIT';
    case 'DELIVERED': return 'DELIVERED';
    case 'CANCELLED': return 'CANCELLED';
    default: return 'PROBLEM'; // FAILED, RETURNED
  }
}

export const isToday = (value?: string | Date | null) => Boolean(value) && new Date(value as string).toDateString() === new Date().toDateString();
