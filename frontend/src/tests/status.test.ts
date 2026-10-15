import { toneFor, statusLabel, statusHex, TONE_HEX } from '@/utils/status';

describe('status helpers', () => {
  it('maps order statuses to consistent tones', () => {
    expect(toneFor('DELIVERED')).toBe('success');
    expect(toneFor('in_transit')).toBe('info');
    expect(toneFor('In Transit')).toBe('info');
    expect(toneFor('CANCELLED')).toBe('error');
    expect(toneFor('something-new')).toBe('gray');
    expect(toneFor(undefined)).toBe('gray');
  });

  it('formats labels for people', () => {
    expect(statusLabel('IN_TRANSIT')).toBe('In Transit');
    expect(statusLabel(null)).toBe('Unknown');
  });

  it('gives charts the same colour as badges', () => {
    expect(statusHex('DELIVERED')).toBe(TONE_HEX.success);
    expect(statusHex('FAILED')).toBe(TONE_HEX.error);
  });
});
