import request from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';
import { moveInlineFiles } from '../services/fileMigration';
import { storeDataUrl } from '../services/fileStorage';
import { createCompany, auth, type TestCompany } from './helpers/fixtures';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('Photos, signatures and receipts', () => {
  let A: TestCompany;
  let B: TestCompany;
  beforeAll(async () => {
    A = await createCompany('Files');
    B = await createCompany('Other');
  });

  it('expense receipts are stored as files, readable only by the same company', async () => {
    const res = await request(app).post('/api/expenses').set(auth(A)).send({ type: 'FUEL', amount: 45000, receiptPhoto: PNG });
    expect(res.status).toBe(201);
    const stored = await prisma.expense.findUnique({ where: { id: res.body.data.id }, select: { receiptPhoto: true } });
    expect(stored?.receiptPhoto).toMatch(/^file:[0-9a-f-]{36}$/);
    const id = stored!.receiptPhoto!.slice(5);
    const own = await request(app).get(`/api/files/${id}`).set(auth(A));
    expect(own.status).toBe(200);
    expect(own.headers['content-type']).toContain('image/png');
    expect((await request(app).get(`/api/files/${id}`).set(auth(B))).status).toBe(404);
    expect((await request(app).get(`/api/files/${id}`)).status).toBe(401);
  });

  it('rejects files that are not images or PDFs', async () => {
    const res = await request(app).post('/api/expenses').set(auth(A)).send({ type: 'FUEL', amount: 1000, receiptPhoto: 'data:text/html;base64,PHNjcmlwdD4=' });
    expect(res.status).toBe(400);
  });

  it('old inline images are moved out of the business tables', async () => {
    const expense = await A.as(() => prisma.expense.create({ data: { expenseNumber: `EXP-T${Date.now()}`, type: 'FUEL', amount: 100, receiptPhoto: PNG, createdById: A.users.ADMIN.id } }));
    const moved = await A.as(() => moveInlineFiles());
    expect(moved).toBeGreaterThan(0);
    const after = await prisma.expense.findUnique({ where: { id: expense.id } });
    expect(after?.receiptPhoto).toMatch(/^file:/);
    const file = await prisma.storedFile.findUnique({ where: { id: after!.receiptPhoto!.slice(5) } });
    expect(file?.companyId).toBe(A.id);
  });

  it('a reference passed back in is kept as is', async () => {
    const ref = await A.as(() => storeDataUrl(PNG, 'receipt', { maxBytes: 10_000 }));
    expect(await A.as(() => storeDataUrl(ref, 'receipt', { maxBytes: 10_000 }))).toBe(ref);
  });
});
