import { prisma } from './prisma';
import { runWithoutTenant } from './tenantContext';

/**
 * Document numbers (ORD-000123, PO-2026-0007, ACC-0012…) are unique across the
 * whole system, so public links like /track/ORD-000123 always point to one
 * order. They are therefore counted across all companies, not per company.
 */
const SOURCES = {
  order: { table: 'delivery_orders', column: 'order_number' },
  purchaseOrder: { table: 'purchase_orders', column: 'po_number' },
  transfer: { table: 'stock_transfers', column: 'transfer_number' },
  return: { table: 'return_requests', column: 'return_number' },
  account: { table: 'customer_accounts', column: 'account_number' },
  handover: { table: 'cash_handovers', column: 'handover_number' },
  expense: { table: 'expenses', column: 'expense_number' },
  stockCount: { table: 'stock_counts', column: 'count_number' },
} as const;

export type DocumentKind = keyof typeof SOURCES;

/** Next number like `${prefix}-000124`, after the highest existing one with that prefix. */
export async function nextDocumentNumber(kind: DocumentKind, prefix: string, size: number) {
  const { table, column } = SOURCES[kind];
  const rows = await runWithoutTenant(() =>
    prisma.$queryRawUnsafe<{ max: bigint | number | null }[]>(
      // Only numbers made of 1–12 digits after the prefix count (ignores odd hand-typed values)
      `SELECT MAX(CAST(SUBSTRING("${column}" FROM '([0-9]{1,12})$') AS BIGINT)) AS max FROM "${table}" WHERE "${column}" LIKE $1 AND "${column}" ~ '-[0-9]{1,12}$'`,
      `${prefix}-%`
    )
  );
  const next = Number(rows[0]?.max || 0) + 1;
  return `${prefix}-${String(next).padStart(size, '0')}`;
}

const isUniqueClash = (error: any) => error?.code === 'P2002';

/**
 * Create a record that needs a fresh document number, retrying with the next
 * number if another request took the same one at the same moment.
 */
export async function withDocumentNumber<T>(
  kind: DocumentKind,
  prefix: string,
  size: number,
  create: (number: string) => Promise<T>,
  attempts = 5
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const number = await nextDocumentNumber(kind, prefix, size);
    try {
      return await create(number);
    } catch (error) {
      if (!isUniqueClash(error) || attempt >= attempts) throw error;
    }
  }
}
