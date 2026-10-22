import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../app';
import { prisma } from '../lib/prisma';
import { saveOtp } from '../services/otpStore';
import { createCompany, auth, type TestCompany } from './helpers/fixtures';

describe('Sign-in', () => {
  let C: TestCompany;
  let email: string;
  beforeAll(async () => {
    C = await createCompany('Auth');
    email = C.users.WAREHOUSE_STAFF.email;
    await prisma.user.update({ where: { email }, data: { password: await bcrypt.hash('Passw0rd!', 4), totpSecret: 'JBSWY3DPEHPK3PXP' } });
  });

  const signInWithCode = async (body: Record<string, unknown> = {}) => {
    const first = await request(app).post('/api/auth/login').send({ email, password: 'Passw0rd!' });
    expect(first.status).toBe(200);
    expect(first.body.requiresOTP).toBe(true);
    // The code itself is emailed; put a known one in place
    const user = await prisma.user.findUnique({ where: { email } });
    await saveOtp(email, 'LOGIN', '123456', user!.id, 60_000);
    return request(app).post('/api/auth/verify-login-otp').send({ email, otp: '123456', ...body });
  };

  it('never sends the password hash or authenticator secret back', async () => {
    const res = await signInWithCode();
    expect(res.status).toBe(200);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('totpSecret');
    expect(text).not.toContain('JBSWY3DPEHPK3PXP');
    expect(text).not.toMatch(/"password"/);
    const me = await request(app).get('/api/auth/me').set(auth(C, 'WAREHOUSE_STAFF'));
    expect(JSON.stringify(me.body)).not.toContain('JBSWY3DPEHPK3PXP');
  });

  it('a trusted browser skips the emailed code until the password changes', async () => {
    const verified = await signInWithCode({ rememberDevice: true });
    const deviceToken = verified.body.data.deviceToken;
    expect(typeof deviceToken).toBe('string');

    const again = await request(app).post('/api/auth/login').send({ email, password: 'Passw0rd!', deviceToken });
    expect(again.body.requiresOTP).toBe(false);
    expect(again.body.data.tokens.access).toBeTruthy();

    // Wrong password still fails, even on a trusted browser
    expect((await request(app).post('/api/auth/login').send({ email, password: 'nope', deviceToken })).status).toBe(401);

    const devices = await request(app).get('/api/auth/trusted-devices').set(auth(C, 'WAREHOUSE_STAFF'));
    expect(devices.body.data.length).toBeGreaterThan(0);

    const changed = await request(app).put('/api/auth/change-password').set(auth(C, 'WAREHOUSE_STAFF')).send({ currentPassword: 'Passw0rd!', newPassword: 'NewPassw0rd!2' });
    expect(changed.status).toBe(200);
    const after = await request(app).post('/api/auth/login').send({ email, password: 'NewPassw0rd!2', deviceToken });
    expect(after.body.requiresOTP).toBe(true);
  });

  it('a device token from another user does not work', async () => {
    const other = C.users.DISPATCH_OFFICER.email;
    await prisma.user.update({ where: { email: other }, data: { password: await bcrypt.hash('Passw0rd!', 4) } });
    const res = await request(app).post('/api/auth/login').send({ email: other, password: 'Passw0rd!', deviceToken: 'x'.repeat(43) });
    expect(res.body.requiresOTP).toBe(true);
  });
});
