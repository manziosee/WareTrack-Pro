import axios from 'axios';
import crypto from 'crypto';

/**
 * Mobile Money collections.
 *
 * MTN MoMo (Collection API): MOMO_BASE_URL (default sandbox), MOMO_SUBSCRIPTION_KEY,
 *   MOMO_API_USER, MOMO_API_KEY, MOMO_TARGET_ENV (sandbox | mtnrwanda), MOMO_CURRENCY (EUR in sandbox, RWF live)
 * Airtel Money (Collections API): AIRTEL_BASE_URL (default UAT), AIRTEL_CLIENT_ID,
 *   AIRTEL_CLIENT_SECRET, AIRTEL_COUNTRY (RW), AIRTEL_CURRENCY (RWF)
 */

export type Provider = 'MTN_MOMO' | 'AIRTEL_MONEY';

export const providerConfigured = (p: Provider) =>
  p === 'MTN_MOMO'
    ? Boolean(process.env.MOMO_SUBSCRIPTION_KEY && process.env.MOMO_API_USER && process.env.MOMO_API_KEY)
    : Boolean(process.env.AIRTEL_CLIENT_ID && process.env.AIRTEL_CLIENT_SECRET);

export interface CollectionResult {
  reference: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  message?: string;
}

const msisdn = (phone: string) => phone.replace(/[^\d]/g, '').replace(/^0/, '250');

// ---------------------------------------------------------------------------
// MTN MoMo
// ---------------------------------------------------------------------------

const momoBase = () => process.env.MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
let momoToken: { value: string; expires: number } | null = null;

async function momoAccessToken() {
  if (momoToken && momoToken.expires > Date.now() + 30000) return momoToken.value;
  const basic = Buffer.from(`${process.env.MOMO_API_USER}:${process.env.MOMO_API_KEY}`).toString('base64');
  const res = await axios.post(`${momoBase()}/collection/token/`, null, {
    headers: { Authorization: `Basic ${basic}`, 'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY! },
    timeout: 15000,
  });
  momoToken = { value: res.data.access_token, expires: Date.now() + Number(res.data.expires_in || 3600) * 1000 };
  return momoToken.value;
}

async function momoRequest(amount: number, phone: string, externalId: string, note: string): Promise<CollectionResult> {
  const reference = crypto.randomUUID();
  const token = await momoAccessToken();
  await axios.post(
    `${momoBase()}/collection/v1_0/requesttopay`,
    {
      amount: String(Math.round(amount)),
      currency: process.env.MOMO_CURRENCY || (process.env.MOMO_TARGET_ENV === 'mtnrwanda' ? 'RWF' : 'EUR'),
      externalId,
      payer: { partyIdType: 'MSISDN', partyId: msisdn(phone) },
      payerMessage: note.slice(0, 160),
      payeeNote: note.slice(0, 160),
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': reference,
        'X-Target-Environment': process.env.MOMO_TARGET_ENV || 'sandbox',
        'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY!,
      },
      timeout: 15000,
    }
  );
  return { reference, status: 'PENDING', message: 'Payment request sent to the customer’s phone' };
}

async function momoStatus(reference: string): Promise<CollectionResult> {
  const token = await momoAccessToken();
  const res = await axios.get(`${momoBase()}/collection/v1_0/requesttopay/${reference}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Target-Environment': process.env.MOMO_TARGET_ENV || 'sandbox', 'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY! },
    timeout: 15000,
  });
  const s = String(res.data.status || '').toUpperCase();
  return { reference, status: s === 'SUCCESSFUL' ? 'SUCCESSFUL' : s === 'FAILED' || s === 'REJECTED' ? 'FAILED' : 'PENDING', message: res.data.reason };
}

// ---------------------------------------------------------------------------
// Airtel Money
// ---------------------------------------------------------------------------

const airtelBase = () => process.env.AIRTEL_BASE_URL || 'https://openapiuat.airtel.africa';
let airtelToken: { value: string; expires: number } | null = null;

async function airtelAccessToken() {
  if (airtelToken && airtelToken.expires > Date.now() + 30000) return airtelToken.value;
  const res = await axios.post(
    `${airtelBase()}/auth/oauth2/token`,
    { client_id: process.env.AIRTEL_CLIENT_ID, client_secret: process.env.AIRTEL_CLIENT_SECRET, grant_type: 'client_credentials' },
    { timeout: 15000 }
  );
  airtelToken = { value: res.data.access_token, expires: Date.now() + Number(res.data.expires_in || 180) * 1000 };
  return airtelToken.value;
}

const airtelHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'X-Country': process.env.AIRTEL_COUNTRY || 'RW',
  'X-Currency': process.env.AIRTEL_CURRENCY || 'RWF',
});

async function airtelRequest(amount: number, phone: string, externalId: string): Promise<CollectionResult> {
  const reference = `WT${Date.now()}${crypto.randomInt(100, 999)}`;
  const token = await airtelAccessToken();
  const res = await axios.post(
    `${airtelBase()}/merchant/v1/payments/`,
    {
      reference: externalId,
      subscriber: { country: process.env.AIRTEL_COUNTRY || 'RW', currency: process.env.AIRTEL_CURRENCY || 'RWF', msisdn: msisdn(phone).replace(/^250/, '') },
      transaction: { amount: Math.round(amount), country: process.env.AIRTEL_COUNTRY || 'RW', currency: process.env.AIRTEL_CURRENCY || 'RWF', id: reference },
    },
    { headers: airtelHeaders(token), timeout: 15000 }
  );
  const ok = res.data?.status?.success !== false;
  return { reference, status: ok ? 'PENDING' : 'FAILED', message: res.data?.status?.message };
}

async function airtelStatus(reference: string): Promise<CollectionResult> {
  const token = await airtelAccessToken();
  const res = await axios.get(`${airtelBase()}/standard/v1/payments/${reference}`, { headers: airtelHeaders(token), timeout: 15000 });
  const s = String(res.data?.data?.transaction?.status || '').toUpperCase();
  return { reference, status: s === 'TS' ? 'SUCCESSFUL' : s === 'TF' ? 'FAILED' : 'PENDING', message: res.data?.data?.transaction?.message };
}

// ---------------------------------------------------------------------------

export async function requestCollection(provider: Provider, amount: number, phone: string, externalId: string, note: string) {
  return provider === 'MTN_MOMO' ? momoRequest(amount, phone, externalId, note) : airtelRequest(amount, phone, externalId);
}

export async function collectionStatus(provider: Provider, reference: string) {
  return provider === 'MTN_MOMO' ? momoStatus(reference) : airtelStatus(reference);
}
