import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { LogOut, MessageSquare, Package, RefreshCw, Save, Truck } from 'lucide-react';
import Button from '@/components/ui/Button';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'https://waretrack-pro.onrender.com/api' });
const tokenKey = 'waretrack_customer_token';
const companyKey = 'waretrack_customer_company';
const contacts = ['ANY', 'PHONE', 'EMAIL', 'SMS', 'WHATSAPP'];

type CustomerProfile = {
  id: number; name: string; email: string; phone: string | null; address: string | null;
  preferredDeliveryWindow: string | null; deliveryInstructions: string | null; contactPreference: string;
};
type CustomerOrder = {
  id: number; orderNumber: string; status: string; createdAt: string; scheduledDate: string | null;
  deliveryAddress: string; totalAmount: number | string; paymentStatus: string;
  invoice?: { invoiceNumber: string; total: number | string; status: string; dueDate: string | null } | null;
};
type CustomerAccountSummary = { balance: number; overdue: number; accounts: { accountNumber: string; name: string; creditLimit: number; status: string; balance: number; overdue: number }[] };

export default function CustomerPortal() {
  const [searchParams] = useSearchParams();
  const [companyId, setCompanyId] = useState(searchParams.get('companyId') || sessionStorage.getItem(companyKey) || '1');
  const [token, setToken] = useState(sessionStorage.getItem(tokenKey) || '');
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [accountSummary, setAccountSummary] = useState<CustomerAccountSummary | null>(null);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<number, string>>({});
  const [feedbackCategory, setFeedbackCategory] = useState<Record<number, string>>({});

  const request = useCallback((method: 'get' | 'patch', path: string, data?: unknown) => {
    const config = { headers: { Authorization: `Bearer ${token}`, 'X-Company-Id': companyId } };
    return method === 'get' ? api.get(path, config) : api.patch(path, data, config);
  }, [companyId, token]);

  async function submitOrderFeedback(orderId: number) {
    const text = feedbackDrafts[orderId]?.trim() || '';
    if (text.length < 5) { setMessage('Please enter at least 5 characters for your feedback.'); return; }
    try {
      await api.post('/features/customer/feedback', { orderId, category: feedbackCategory[orderId] || 'DELIVERY', message: text }, { headers: { Authorization: `Bearer ${token}`, 'X-Company-Id': companyId } });
      setFeedbackDrafts((current) => ({ ...current, [orderId]: '' }));
      setMessage(`Your feedback for order ${orderId} was sent to our team.`);
    } catch (error: any) { setMessage(error?.response?.data?.error?.message || 'Could not send feedback. Please try again.'); }
  }

  const loadPortal = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [profileResponse] = await Promise.all([
        request('get', '/features/customer/me'),
      ]);
      const customer = profileResponse.data.data as CustomerProfile;
      setProfile(customer);
      const [ordersResponse, accountResponse] = await Promise.all([
        request('get', `/features/customer/${customer.id}/orders`),
        request('get', '/features/customer/me/account'),
      ]);
      setOrders(ordersResponse.data.data || []);
      setAccountSummary(accountResponse.data.data || null);
      setMessage('');
    } catch (error: any) {
      if (error?.response?.status === 401) {
        sessionStorage.removeItem(tokenKey);
        setToken('');
        setProfile(null);
      }
      setMessage(error?.response?.data?.error?.message || 'Could not load your account. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [request, token]);

  useEffect(() => { void loadPortal(); }, [loadPortal]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const response = await api.post('/features/customer/login', credentials, { headers: { 'X-Company-Id': companyId } });
      const customerToken = response.data.data.token as string;
      sessionStorage.setItem(tokenKey, customerToken);
      sessionStorage.setItem(companyKey, companyId);
      setToken(customerToken);
    } catch (error: any) {
      setMessage(error?.response?.data?.error?.message || 'Sign-in failed. Check your details and company ID.');
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setLoading(true);
    try {
      const response = await request('patch', '/features/customer/me', {
        phone: profile.phone || '', address: profile.address || '',
        preferredDeliveryWindow: profile.preferredDeliveryWindow || '',
        deliveryInstructions: profile.deliveryInstructions || '', contactPreference: profile.contactPreference,
      });
      setProfile(response.data.data);
      setMessage('Your contact and delivery preferences have been saved.');
    } catch (error: any) {
      setMessage(error?.response?.data?.error?.message || 'Could not save your preferences.');
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    sessionStorage.removeItem(tokenKey);
    setToken(''); setProfile(null); setOrders([]); setAccountSummary(null); setMessage('');
  }

  const field = 'mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100';
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-gray-900 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 font-semibold"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white"><Package className="h-5 w-5" /></span>WareTrack customer portal</Link>
          {token && <Button variant="secondary" size="sm" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>}
        </header>

        {!token ? (
          <section className="mx-auto max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold">View your deliveries</h1>
            <p className="mt-2 text-sm text-gray-500">Sign in to view orders, invoices, and saved delivery preferences.</p>
            <form onSubmit={signIn} className="mt-6 space-y-4">
              <label className="block text-sm font-medium">Company ID<input className={field} inputMode="numeric" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required /></label>
              <label className="block text-sm font-medium">Email<input className={field} type="email" autoComplete="username" value={credentials.email} onChange={(e) => setCredentials({ ...credentials, email: e.target.value })} required /></label>
              <label className="block text-sm font-medium">Password<input className={field} type="password" autoComplete="current-password" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} required /></label>
              <Button type="submit" disabled={loading} className="w-full">{loading ? 'Signing in…' : 'Sign in'}</Button>
            </form>
            {message && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
          </section>
        ) : (
          <div className="space-y-6">
            {profile && <>
              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between"><div><h1 className="text-xl font-bold">Hello, {profile.name}</h1><p className="text-sm text-gray-500">{profile.email}</p></div><Button variant="secondary" size="sm" onClick={() => void loadPortal()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
                <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">Phone<input className={field} value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
                  <label className="text-sm font-medium">Contact preference<select className={field} value={profile.contactPreference} onChange={(e) => setProfile({ ...profile, contactPreference: e.target.value })}>{contacts.map((v) => <option key={v} value={v}>{v === 'ANY' ? 'No preference' : v}</option>)}</select></label>
                  <label className="text-sm font-medium sm:col-span-2">Delivery address<textarea className={`${field} h-20 py-2`} value={profile.address || ''} onChange={(e) => setProfile({ ...profile, address: e.target.value })} maxLength={500} /></label>
                  <label className="text-sm font-medium">Preferred delivery window<input className={field} placeholder="Weekdays, 9am–12pm" value={profile.preferredDeliveryWindow || ''} onChange={(e) => setProfile({ ...profile, preferredDeliveryWindow: e.target.value })} maxLength={100} /></label>
                  <label className="text-sm font-medium">Access instructions<textarea className={`${field} h-20 py-2`} value={profile.deliveryInstructions || ''} onChange={(e) => setProfile({ ...profile, deliveryInstructions: e.target.value })} maxLength={2000} /></label>
                  <div className="sm:col-span-2"><Button type="submit" disabled={loading}><Save className="mr-2 h-4 w-4" />Save preferences</Button></div>
                </form>
              </section>
              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Truck className="h-5 w-5 text-primary-600" />Order history and invoices</h2>
                {accountSummary && accountSummary.accounts.length > 0 && <div className="mb-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-gray-500">Account balance</p><p className="mt-1 text-lg font-semibold">{Number(accountSummary.balance).toLocaleString()} RWF</p></div><div className="rounded-xl bg-amber-50 p-4"><p className="text-xs text-amber-800">Overdue</p><p className="mt-1 text-lg font-semibold text-amber-900">{Number(accountSummary.overdue).toLocaleString()} RWF</p></div></div>}
                {orders.length === 0 ? <p className="text-sm text-gray-500">No orders found.</p> : <div className="divide-y divide-gray-100">{orders.map((order) => <article key={order.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-semibold">{order.orderNumber} <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">{order.status.replaceAll('_', ' ')}</span></p><p className="mt-1 text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()} · {order.deliveryAddress}</p>{order.invoice && <p className="mt-1 text-xs text-gray-600">Invoice {order.invoice.invoiceNumber} · {order.invoice.status} · {Number(order.invoice.total).toLocaleString()} RWF</p>}<details className="mt-2"><summary className="flex cursor-pointer items-center gap-1 text-sm text-primary-700"><MessageSquare className="h-4 w-4"/>Report an issue with this order</summary><div className="mt-2 grid gap-2 sm:grid-cols-[160px_1fr_auto]"><select aria-label="Feedback category" className={field} value={feedbackCategory[order.id] || 'DELIVERY'} onChange={(event) => setFeedbackCategory((current) => ({ ...current, [order.id]: event.target.value }))}><option value="DELIVERY">Delivery</option><option value="PRODUCT">Product</option><option value="SERVICE">Service</option><option value="OTHER">Other</option></select><textarea aria-label="Order feedback" className={`${field} min-h-10 py-2`} minLength={5} maxLength={4000} placeholder="Tell us what happened" value={feedbackDrafts[order.id] || ''} onChange={(event) => setFeedbackDrafts((current) => ({ ...current, [order.id]: event.target.value }))}/><Button size="sm" onClick={() => void submitOrderFeedback(order.id)}>Send</Button></div></details></div><div className="text-sm font-semibold">{Number(order.totalAmount).toLocaleString()} RWF</div></article>)}</div>}
              </section>
            </>}
            {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
