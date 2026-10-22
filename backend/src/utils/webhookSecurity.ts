import dns from 'dns';
import http from 'http';
import https from 'https';
import net from 'net';

const blockedIpv4 = new net.BlockList();
[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
].forEach(([address, prefix]) => blockedIpv4.addSubnet(address as string, prefix as number, 'ipv4'));

const globalIpv6 = new net.BlockList();
globalIpv6.addSubnet('2000::', 3, 'ipv6');
const blockedIpv6 = new net.BlockList();
[
  ['2001::', 23], // IETF protocol assignments (including ORCHID)
  ['2001:db8::', 32], // Documentation
  ['2001:10::', 28], // ORCHID
  ['2002::', 16], // 6to4 embeds IPv4 destinations
  ['3fff::', 20], // Documentation
].forEach(([address, prefix]) => blockedIpv6.addSubnet(address as string, prefix as number, 'ipv6'));

export function isPublicAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return !blockedIpv4.check(address, 'ipv4');
  if (family === 6) return globalIpv6.check(address, 'ipv6') && !blockedIpv6.check(address, 'ipv6');
  return false;
}

function isPublicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host.includes('.') || /\.(localhost|local|internal|test|invalid)$/.test(host)) return false;
  return net.isIP(host) ? isPublicAddress(host) : true;
}

function resolveAll(hostname: string): Promise<dns.LookupAddress[]> {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) reject(error);
      else resolve(addresses);
    });
  });
}

/** Validate the URL and every current DNS answer before saving or sending it. */
export async function isSafeWebhookUrl(value: unknown): Promise<boolean> {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:')) return false;
    if (url.username || url.password || (url.port && url.port !== '443' && !(url.protocol === 'http:' && url.port === '80'))) return false;
    if (!isPublicHostname(url.hostname)) return false;
    const addresses = await resolveAll(url.hostname.replace(/^\[|\]$/g, ''));
    return addresses.length > 0 && addresses.every(({ address }) => isPublicAddress(address));
  } catch {
    return false;
  }
}

/** Resolve again at connect time to prevent DNS rebinding between validation and request. */
function safeLookup(hostname: string, options: any, callback: (...args: any[]) => void) {
  dns.lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
    if (error) return callback(error);
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
      return callback(new Error('Webhook destination resolved to a non-public address'));
    }
    if (options?.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
}

export function createSafeWebhookAgents() {
  return {
    httpAgent: new http.Agent({ lookup: safeLookup as any }),
    httpsAgent: new https.Agent({ lookup: safeLookup as any }),
  };
}
