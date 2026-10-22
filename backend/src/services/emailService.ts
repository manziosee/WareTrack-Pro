import { emailTemplates } from '../config/emailTemplates';
import axios from 'axios';

const BLOCKED_DOMAINS = /@(example\.(com|org|net|rw)|.*\.test|.*\.local|waretrack\.com|local\.test)$/i;

const escapeHtml = (v: string) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface EmailData {
  email: string;
  title: string;
  name: string;
  message: string;
  time?: string;
  actionPath?: string;
  actionLabel?: string;
  /** Files sent with the email (Resend and Brevo only; EmailJS cannot attach) */
  attachments?: { filename: string; content: Buffer }[];
}

const appUrl = (path: string) => {
  const origin = (process.env.PUBLIC_APP_URL || 'https://ware-track-pro.vercel.app').replace(/\/$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
};

export class EmailService {
  private static serviceId = process.env.EMAILJS_SERVICE_ID;
  private static templateId = process.env.EMAILJS_TEMPLATE_ID;
  private static publicKey = process.env.EMAILJS_PUBLIC_KEY;
  private static privateKey = process.env.EMAILJS_PRIVATE_KEY;

  /** Which provider sends mail: Resend or Brevo when their key is set, otherwise EmailJS. */
  static provider(): 'resend' | 'brevo' | 'emailjs' | 'none' {
    if (process.env.RESEND_API_KEY) return 'resend';
    if (process.env.BREVO_API_KEY) return 'brevo';
    if (this.serviceId && this.templateId && this.publicKey) return 'emailjs';
    return 'none';
  }

  static async sendEmail(data: EmailData): Promise<boolean> {
    // Never mail placeholder or demo addresses; they bounce back to the sender's inbox
    if (!data.email || BLOCKED_DOMAINS.test(data.email.trim())) {
      console.warn(`Email skipped for placeholder address: ${data.email}`);
      return false;
    }
    const provider = this.provider();
    try {
      if (provider === 'resend') return await this.sendViaResend(data);
      if (provider === 'brevo') return await this.sendViaBrevo(data);
      if (provider === 'emailjs') return await this.sendViaEmailJS(data);
      return false;
    } catch (error: any) {
      console.error(`Email sending failed (${provider}):`, error?.response?.data || error?.message);
      return false;
    }
  }

  private static html(data: EmailData) {
    const body = escapeHtml(data.message).replace(/\n/g, '<br/>');
    const actionUrl = appUrl(data.actionPath || '/dashboard');
    const action = `<div style="padding:0 24px 24px"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#2F5778;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">${escapeHtml(data.actionLabel || 'Open Dashboard')}</a></div>`;
    return `<!doctype html><html><body style="margin:0;background:#F6F8FB;font-family:Arial,Helvetica,sans-serif;color:#1F2937">
<div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EEF1F5">
<div style="background:linear-gradient(135deg,#2F5778,#4682B4);padding:20px 24px;color:#fff">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.8">WareTrack Pro</div>
<div style="font-size:20px;font-weight:bold;margin-top:4px">${escapeHtml(data.title)}</div></div>
<div style="padding:24px;font-size:15px;line-height:1.6">Hello ${escapeHtml(data.name)},<br/><br/>${body}</div>
${action}
<div style="padding:16px 24px;border-top:1px solid #EEF1F5;font-size:12px;color:#6B7280">Sent by WareTrack Pro · ${escapeHtml(data.time || new Date().toLocaleString('en-GB', { timeZone: 'Africa/Kigali' }))}</div>
</div></body></html>`;
  }

  private static async sendViaResend(data: EmailData) {
    const res = await axios.post(
      'https://api.resend.com/emails',
      { from: process.env.EMAIL_FROM || 'WareTrack Pro <onboarding@resend.dev>', to: [data.email], subject: `WareTrack-Pro: ${data.title}`, html: this.html(data), text: data.message,
        ...(data.attachments?.length ? { attachments: data.attachments.map((a) => ({ filename: a.filename, content: a.content.toString('base64') })) } : {}) },
      { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, timeout: 15000 }
    );
    return res.status >= 200 && res.status < 300;
  }

  private static async sendViaBrevo(data: EmailData) {
    const from = process.env.EMAIL_FROM || 'WareTrack Pro <no-reply@waretrack.rw>';
    const match = from.match(/^(.*)<(.+)>$/);
    const res = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: (match?.[1] || 'WareTrack Pro').trim(), email: (match?.[2] || from).trim() },
        to: [{ email: data.email, name: data.name }],
        subject: `WareTrack-Pro: ${data.title}`,
        htmlContent: this.html(data),
        textContent: data.message,
        ...(data.attachments?.length ? { attachment: data.attachments.map((a) => ({ name: a.filename, content: a.content.toString('base64') })) } : {}),
      },
      { headers: { 'api-key': process.env.BREVO_API_KEY!, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    return res.status >= 200 && res.status < 300;
  }

  private static async sendViaEmailJS(data: EmailData) {
    const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', {
      service_id: this.serviceId,
      template_id: this.templateId,
      user_id: this.publicKey,
      accessToken: this.privateKey,
      template_params: {
        email: data.email,
        title: data.title,
        name: data.name,
        message: data.message,
        time: data.time || new Date().toLocaleString(),
        action_url: appUrl(data.actionPath || '/dashboard'),
        button_url: appUrl(data.actionPath || '/dashboard'),
        link: appUrl(data.actionPath || '/dashboard'),
        url: appUrl(data.actionPath || '/dashboard'),
        action_label: data.actionLabel || 'Open Dashboard',
        button_label: data.actionLabel || 'Open Dashboard',
        dashboard_url: appUrl('/dashboard'),
        dashboard_link: appUrl('/dashboard'),
        login_url: appUrl('/login'),
        reports_url: appUrl('/reports'),
        report_url: appUrl('/reports')
      }
    }, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
    return response.status === 200;
  }

  static async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    return this.sendEmail({
      email: userEmail,
      title: emailTemplates.welcome.title,
      name: userName,
      message: emailTemplates.welcome.getMessage(userName)
    });
  }

  static async sendOrderNotification(userEmail: string, userName: string, orderNumber: string, status: string): Promise<boolean> {
    return this.sendEmail({
      email: userEmail,
      title: emailTemplates.orderUpdate.title(orderNumber),
      name: userName,
      message: emailTemplates.orderUpdate.getMessage(orderNumber, status, userName),
      actionPath: `/track/${encodeURIComponent(orderNumber)}`,
      actionLabel: 'Track Order'
    });
  }

  static async sendLowStockAlert(adminEmail: string, itemName: string, currentStock: number, minStock: number = 10): Promise<boolean> {
    return this.sendEmail({
      email: adminEmail,
      title: emailTemplates.lowStock.title,
      name: 'Inventory System',
      message: emailTemplates.lowStock.getMessage(itemName, currentStock, minStock)
    });
  }

  static async sendDispatchNotification(driverEmail: string, driverName: string, orderNumber: string, customerName: string, address: string): Promise<boolean> {
    return this.sendEmail({
      email: driverEmail,
      title: emailTemplates.dispatch.title,
      name: driverName,
      message: emailTemplates.dispatch.getMessage(driverName, orderNumber, customerName, address)
    });
  }

  static async sendDeliveryConfirmation(customerEmail: string, customerName: string, orderNumber: string, deliveryTime: string = new Date().toLocaleTimeString()): Promise<boolean> {
    return this.sendEmail({
      email: customerEmail,
      title: emailTemplates.delivery.title,
      name: customerName,
      message: emailTemplates.delivery.getMessage(customerName, orderNumber, deliveryTime)
    });
  }

  static async sendNotificationEmail(userEmail: string, notification: any): Promise<boolean> {
    return this.sendEmail({
      email: userEmail,
      title: `WareTrack-Pro: ${notification.title}`,
      name: 'System',
      message: notification.message
    });
  }

  static async sendSystemAlert(adminEmail: string, alertType: string, message: string): Promise<boolean> {
    return this.sendEmail({
      email: adminEmail,
      title: `System Alert: ${alertType}`,
      name: 'System Administrator',
      message: `Alert Type: ${alertType}\n\nDetails: ${message}\n\nTime: ${new Date().toLocaleString()}`
    });
  }

  static async sendPasswordResetOTP(userEmail: string, userName: string, otp: string): Promise<boolean> {
    return this.sendEmail({
      email: userEmail,
      title: 'Password Reset - WareTrack-Pro',
      name: userName,
      message: `Your password reset OTP is: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`,
      actionPath: '/login',
      actionLabel: 'Go to Sign In'
    });
  }

  static async sendPasswordResetConfirmation(userEmail: string, userName: string): Promise<boolean> {
    return this.sendEmail({
      email: userEmail,
      title: 'Password Reset Successful - WareTrack-Pro',
      name: userName,
      message: `Your password has been successfully reset.\n\nIf you didn't make this change, please contact support immediately.`,
      actionPath: '/login',
      actionLabel: 'Sign In'
    });
  }

  static async sendLoginOTP(userEmail: string, userName: string, otp: string): Promise<boolean> {
    return this.sendEmail({
      email: userEmail,
      title: 'Login Verification - WareTrack-Pro',
      name: userName,
      message: `Your login verification OTP is: ${otp}\n\nThis OTP will expire in 5 minutes.\n\nIf you didn't attempt to login, please secure your account immediately.`,
      actionPath: '/login',
      actionLabel: 'Continue to Sign In'
    });
  }
}
