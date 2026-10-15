import crypto from 'crypto';

/** RFC 6238 time-based one-time passwords (Google Authenticator, Authy, 1Password…). */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateSecret(bytes = 20) {
  const buf = crypto.randomBytes(bytes);
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(secret: string) {
  const clean = secret.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';
  for (const c of clean) {
    const v = ALPHABET.indexOf(c);
    if (v === -1) throw new Error('Invalid base32 secret');
    bits += v.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function hotp(key: Buffer, counter: number) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

/** Accepts the current code and one step either side (±30s clock drift). */
export function verifyTotp(secret: string, token: string, window = 1) {
  if (!/^\d{6}$/.test(String(token || ''))) return false;
  const key = base32Decode(secret);
  const step = Math.floor(Date.now() / 30000);
  for (let w = -window; w <= window; w++) {
    const expected = hotp(key, step + w);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(token)))) return true;
  }
  return false;
}

export function otpauthUrl(secret: string, account: string, issuer = 'WareTrack Pro') {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
