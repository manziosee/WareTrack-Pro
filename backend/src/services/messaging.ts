import axios from 'axios';

/**
 * Customer and driver messaging. Each channel switches on when its environment
 * variables are set; otherwise messages are skipped (and logged in development).
 *
 * SMS (Africa's Talking):   AT_USERNAME, AT_API_KEY, optional AT_SENDER_ID
 * WhatsApp (Meta Cloud API): WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 */

export const channels = {
  sms: () => Boolean(process.env.AT_USERNAME && process.env.AT_API_KEY),
  whatsapp: () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
};

/** Normalise Rwandan numbers to +2507XXXXXXXX. */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits.length >= 11 ? digits : null;
  if (digits.startsWith('250')) return `+${digits}`;
  if (digits.startsWith('07')) return `+250${digits.slice(1)}`;
  if (digits.startsWith('7') && digits.length === 9) return `+250${digits}`;
  digits = digits.replace(/^0+/, '');
  return digits.length >= 9 ? `+${digits}` : null;
}

export async function sendSms(to: string | null | undefined, message: string) {
  const phone = normalizePhone(to);
  if (!phone) return { sent: false, reason: 'invalid phone' };
  if (!channels.sms()) {
    if (process.env.NODE_ENV !== 'production') console.log(`📱 [sms disabled] ${phone}: ${message}`);
    return { sent: false, reason: 'sms not configured' };
  }
  try {
    const sandbox = process.env.AT_USERNAME === 'sandbox';
    const url = sandbox ? 'https://api.sandbox.africastalking.com/version1/messaging' : 'https://api.africastalking.com/version1/messaging';
    const body = new URLSearchParams({ username: process.env.AT_USERNAME!, to: phone, message });
    if (process.env.AT_SENDER_ID) body.set('from', process.env.AT_SENDER_ID);
    await axios.post(url, body.toString(), {
      timeout: 10000,
      headers: { apiKey: process.env.AT_API_KEY!, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    });
    return { sent: true };
  } catch (error: any) {
    console.error('SMS failed:', error?.response?.data || error?.message);
    return { sent: false, reason: 'provider error' };
  }
}

export async function sendWhatsApp(to: string | null | undefined, message: string) {
  const phone = normalizePhone(to);
  if (!phone) return { sent: false, reason: 'invalid phone' };
  if (!channels.whatsapp()) return { sent: false, reason: 'whatsapp not configured' };
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      { messaging_product: 'whatsapp', to: phone.replace('+', ''), type: 'text', text: { body: message } },
      { timeout: 10000, headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
    );
    return { sent: true };
  } catch (error: any) {
    console.error('WhatsApp failed:', error?.response?.data || error?.message);
    return { sent: false, reason: 'provider error' };
  }
}

/** Send on every configured channel (WhatsApp first, SMS as well). */
export async function notifyCustomer(phone: string | null | undefined, message: string) {
  const results = await Promise.all([sendWhatsApp(phone, message), sendSms(phone, message)]);
  return { whatsapp: results[0], sms: results[1] };
}

const appUrl = () => (process.env.FRONTEND_URL || 'https://ware-track-pro.vercel.app').replace(/\/$/, '');

/** Short status message for the customer, with a tracking link. */
export function orderStatusMessage(order: { orderNumber: string; customerName: string; status: string; driverName?: string | null; timeSlotStart?: Date | null }) {
  const link = `${appUrl()}/track/${order.orderNumber}`;
  const slot = order.timeSlotStart
    ? ` between ${order.timeSlotStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kigali' })} and ${new Date(order.timeSlotStart.getTime() + 2 * 3600000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kigali' })}`
    : '';
  switch (order.status) {
    case 'DISPATCHED':
      return `WareTrack: your order ${order.orderNumber} is ready and assigned${order.driverName ? ` to ${order.driverName}` : ''}. Expected${slot || ' soon'}. Track: ${link}`;
    case 'IN_TRANSIT':
      return `WareTrack: ${order.orderNumber} is on the way${order.driverName ? ` with ${order.driverName}` : ''}. Track it live: ${link}`;
    case 'DELIVERED':
      return `WareTrack: ${order.orderNumber} was delivered. Thank you, ${order.customerName}! Rate your delivery: ${link}`;
    case 'FAILED':
      return `WareTrack: we couldn't deliver ${order.orderNumber} today. We'll contact you to reschedule. Details: ${link}`;
    default:
      return `WareTrack: order ${order.orderNumber} is now ${order.status.replace(/_/g, ' ').toLowerCase()}. ${link}`;
  }
}
