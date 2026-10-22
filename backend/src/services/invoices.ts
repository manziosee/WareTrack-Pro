import { prisma } from '../lib/prisma';
import { vatIncluded } from './pricing';

export class InvoiceError extends Error {
  constructor(message: string, public status = 404) {
    super(message);
  }
}

/**
 * The invoice for an order (created on first request), with everything needed
 * to print it. Prices include VAT; VAT is worked out per line.
 */
export async function buildInvoice(orderIdValue: number) {
  const orderId = orderIdValue;
  const order = await prisma.deliveryOrder.findUnique({
    where: { id: orderId },
    include: { items: true, payments: { where: { status: 'SUCCESSFUL' }, orderBy: { completedAt: 'desc' } } },
  });
  if (!order) throw new InvoiceError('Order not found');
  const company = await prisma.company.findUnique({
    where: { id: order.companyId },
    select: { name: true, legalName: true, legalAddress: true, taxNumber: true, currency: true, taxRate: true, invoicePrefix: true },
  });
  if (!company) throw new InvoiceError('Company settings not found');
  let invoice = await prisma.invoice.findUnique({ where: { orderId } });
  const configuredRate = Number(company.taxRate);
  const historicalRate = invoice && Number(invoice.subtotal) > 0 ? Number(invoice.tax) / Number(invoice.subtotal) : configuredRate;
  const vatRate = Number.isFinite(historicalRate) ? historicalRate : configuredRate;
  // Prices include VAT: the invoice total is the order total (what the customer pays)
  const total = Math.round(Number(order.totalAmount) * 100) / 100;
  // Newer orders carry a VAT rate per line (0% for VAT-exempt items)
  const perLine = order.items.some((i) => i.vatRate !== null);
  const tax = perLine
    ? Math.round(order.items.reduce((s, i) => s + vatIncluded(Number(i.totalPrice), i.vatRate === null ? vatRate : Number(i.vatRate)), 0) * 100) / 100
    : Math.round((total - total / (1 + vatRate)) * 100) / 100;
  const subtotal = Math.round((total - tax) * 100) / 100;
  const account = order.accountId ? await prisma.customerAccount.findUnique({ where: { id: order.accountId } }) : null;
  const dueDate = new Date((order.deliveredAt || order.createdAt).getTime() + (account?.paymentTermsDays || 0) * 86400000);
  const status = order.paymentStatus === 'PAID' ? 'PAID' : order.paymentStatus === 'PARTIAL' ? 'PARTIAL' : 'UNPAID';
  if (!invoice) {
    invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `${company.invoicePrefix}-${String(order.id).padStart(6, '0')}`, orderId, subtotal, tax, total, status, dueDate,
        paidAt: status === 'PAID' ? new Date() : null,
      },
    });
  } else if (Number(invoice.total) !== total || Number(invoice.tax) !== tax) {
    // Older invoices added VAT on top of the order total; bring them in line
    invoice = await prisma.invoice.update({ where: { id: invoice.id }, data: { subtotal, tax, total, status } });
  }
  return {
      invoice,
      order: {
        orderNumber: order.orderNumber, customerName: order.customerName, customerEmail: order.customerEmail, contactNumber: order.contactNumber,
        deliveryAddress: order.deliveryAddress, paymentMethod: order.paymentMethod, createdAt: order.createdAt, deliveredAt: order.deliveredAt,
        items: order.items.map((i) => ({
          name: i.itemName, quantity: i.quantity, unit: i.unit, unitPrice: Number(i.unitPrice), total: Number(i.totalPrice),
          discount: Number(i.discountAmount || 0), vatRate: i.vatRate === null ? vatRate : Number(i.vatRate), vatExempt: i.vatRate !== null && Number(i.vatRate) === 0,
        })),
      },
      payments: order.payments,
      company: { ...company, taxRate: vatRate },
      taxLabel: company.taxNumber ? 'Tax' : 'VAT',
      vatRate,
    };
}
