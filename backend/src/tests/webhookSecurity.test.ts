import { isPublicAddress, isSafeWebhookUrl } from '../utils/webhookSecurity';

describe('webhook destination address checks', () => {
  it.each([
    '0.0.0.0', '10.1.2.3', '100.64.0.1', '127.0.0.1', '169.254.169.254',
    '172.20.0.1', '192.168.1.1', '198.18.0.1', '203.0.113.12', '224.0.0.1',
    '::1', 'fc00::1', 'fe80::1', '2001::1', '2001:db8::1', '2002:0808:0808::1', '3fff::1',
  ])('rejects non-public address %s', (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111'])('allows public address %s', (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });

  it.each([
    'http://127.0.0.1/hook', 'https://localhost/hook', 'https://user:pass@example.com/hook',
    'https://example.com:8443/hook', 'file:///etc/passwd',
  ])('rejects unsafe webhook URL %s', async (url) => {
    await expect(isSafeWebhookUrl(url)).resolves.toBe(false);
  });
});
