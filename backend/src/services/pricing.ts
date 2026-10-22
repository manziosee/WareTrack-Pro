import { prisma } from '../lib/prisma';

/**
 * The price a customer pays for one line, step by step:
 *   1. the item's list price (or the pack's own price),
 *   2. replaced by the customer's price list price, if they have one,
 *   3. minus the best active promotion for the item or its category,
 *   4. minus the customer's own discount percentage.
 * Prices include VAT; VAT-exempt items carry a 0% VAT rate.
 */

export interface PriceInput {
  item: { id: number; unitPrice: unknown; category: string; vatExempt?: boolean | null };
  pack?: { unitsPerPack: number; price: unknown } | null;
  /** Number of sold units (packs if a pack is chosen) */
  quantity: number;
  account?: { priceListId: number | null; discountPercent: unknown } | null;
  companyTaxRate: number;
}

export interface PriceResult {
  /** Price per sold unit before discounts */
  listPrice: number;
  /** Price per sold unit actually charged */
  unitPrice: number;
  /** Discount per sold unit */
  discount: number;
  vatRate: number;
  appliedPriceList: boolean;
  promotion: string | null;
  customerDiscountPercent: number;
}

const money = (v: number) => Math.round(v * 100) / 100;

export async function priceLine(input: PriceInput, now = new Date()): Promise<PriceResult> {
  const { item, pack, quantity, account } = input;
  const units = pack ? pack.unitsPerPack : 1;
  let base = pack ? (Number(pack.price) || Number(item.unitPrice) * units) : Number(item.unitPrice);
  const listPrice = money(base);

  let appliedPriceList = false;
  if (account?.priceListId) {
    const entry = await prisma.priceListItem.findFirst({ where: { priceListId: account.priceListId, itemId: item.id, priceList: { active: true } } });
    if (entry) {
      base = Number(entry.price) * units;
      appliedPriceList = true;
    }
  }

  // Best promotion for this item (or its category) that is running now and met by the quantity
  const baseUnits = quantity * units;
  const promotions = await prisma.promotion.findMany({
    where: { active: true, startsAt: { lte: now }, endsAt: { gte: now }, minQuantity: { lte: baseUnits }, OR: [{ itemId: item.id }, { itemId: null, category: item.category }] },
  });
  let promoDiscount = 0;
  let promotion: string | null = null;
  for (const p of promotions) {
    const off = p.type === 'PERCENT' ? (base * Number(p.value)) / 100 : Number(p.value) * units;
    if (off > promoDiscount) {
      promoDiscount = Math.min(off, base);
      promotion = p.name;
    }
  }

  const afterPromo = base - promoDiscount;
  const customerDiscountPercent = Math.max(0, Math.min(100, Number(account?.discountPercent || 0)));
  const unitPrice = money(Math.max(0, afterPromo * (1 - customerDiscountPercent / 100)));
  return {
    listPrice,
    unitPrice,
    discount: money(Math.max(0, listPrice - unitPrice)),
    vatRate: item.vatExempt ? 0 : input.companyTaxRate,
    appliedPriceList,
    promotion,
    customerDiscountPercent,
  };
}

/** VAT inside a VAT-inclusive amount. */
export const vatIncluded = (gross: number, rate: number) => (rate > 0 ? money(gross - gross / (1 + rate)) : 0);
