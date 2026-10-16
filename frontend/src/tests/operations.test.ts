import { describe, expect, it } from 'vitest';
import { stageOf } from '@/utils/operations';

describe('stageOf', () => {
  it('splits pending orders into waiting and assigned', () => {
    expect(stageOf({ status: 'PENDING' })).toBe('WAITING');
    expect(stageOf({ status: 'PENDING', driverId: 4 })).toBe('ASSIGNED');
  });

  it('maps moving, finished and problem orders', () => {
    expect(stageOf({ status: 'DISPATCHED', driverId: 1 })).toBe('DISPATCHED');
    expect(stageOf({ status: 'IN_TRANSIT', driverId: 1 })).toBe('IN_TRANSIT');
    expect(stageOf({ status: 'DELIVERED' })).toBe('DELIVERED');
    expect(stageOf({ status: 'FAILED' })).toBe('PROBLEM');
    expect(stageOf({ status: 'RETURNED' })).toBe('PROBLEM');
    expect(stageOf({ status: 'CANCELLED' })).toBe('CANCELLED');
  });
});
