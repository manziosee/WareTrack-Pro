import { prisma } from '../lib/prisma';
import { isDataUrl, storeDataUrl } from './fileStorage';

/**
 * Move photos, signatures and receipts that were saved inline (base64 in the
 * business tables) into file storage, a small batch at a time. Runs inside a
 * company context from the background jobs; safe to run repeatedly.
 */
export async function moveInlineFiles(batch = 25) {
  let moved = 0;
  const convert = async (value: string | null, kind: string, row: { companyId: number; branchId: number | null }) => {
    if (!isDataUrl(value)) return value;
    try {
      return await storeDataUrl(value, kind, { maxBytes: 5_000_000, companyId: row.companyId, branchId: row.branchId });
    } catch {
      return value; // unreadable data stays where it is
    }
  };

  const proofs = await prisma.deliveryProof.findMany({
    where: { OR: [{ signatureData: { startsWith: 'data:' } }, { photoUrl: { startsWith: 'data:' } }] },
    select: { id: true, companyId: true, branchId: true, signatureData: true, photoUrl: true },
    take: batch,
  });
  for (const p of proofs) {
    await prisma.deliveryProof.update({
      where: { id: p.id },
      data: { signatureData: await convert(p.signatureData, 'signature', p), photoUrl: await convert(p.photoUrl, 'delivery-photo', p) },
    });
    moved += 1;
  }

  const returns = await prisma.returnRequest.findMany({ where: { photoUrl: { startsWith: 'data:' } }, select: { id: true, companyId: true, branchId: true, photoUrl: true }, take: batch });
  for (const r of returns) {
    await prisma.returnRequest.update({ where: { id: r.id }, data: { photoUrl: await convert(r.photoUrl, 'exception-photo', r) } });
    moved += 1;
  }

  const expenses = await prisma.expense.findMany({ where: { receiptPhoto: { startsWith: 'data:' } }, select: { id: true, companyId: true, branchId: true, receiptPhoto: true }, take: batch });
  for (const e of expenses) {
    await prisma.expense.update({ where: { id: e.id }, data: { receiptPhoto: await convert(e.receiptPhoto, 'receipt', e) } });
    moved += 1;
  }
  return moved;
}
