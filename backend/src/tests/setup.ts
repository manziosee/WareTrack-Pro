import { prisma } from '../lib/prisma';

/**
 * Tests create real rows. Refuse to run anywhere except a local test database,
 * so `npm test` can never touch production data.
 */
const url = process.env.DATABASE_URL || '';
const host = (() => { try { return new URL(url).hostname; } catch { return ''; } })();
const dbName = (() => { try { return new URL(url).pathname.slice(1); } catch { return ''; } })();
if (!['localhost', '127.0.0.1', 'postgres'].includes(host) || !/test/i.test(dbName)) {
  throw new Error(`Tests only run against a local database whose name contains "test" (got ${host || 'no host'}/${dbName || 'no db'}). Set DATABASE_URL, e.g. postgresql://postgres:postgres@localhost:5432/waretrack_test`);
}

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-'.padEnd(64, 'x');
process.env.OSRM_URL = 'off';

afterAll(async () => {
  await prisma.$disconnect();
});

jest.setTimeout(60000);
