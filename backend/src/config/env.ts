/**
 * Central access to required environment variables.
 * The server refuses to start in production if a required value is missing,
 * instead of silently falling back to an insecure default.
 */

const REQUIRED_IN_PRODUCTION = ['DATABASE_URL', 'JWT_SECRET'] as const;

export function validateEnv(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);

  if (missing.length > 0 && isProduction) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (isProduction && (process.env.JWT_SECRET || '').length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long in production');
  }

  const emailKeys = ['EMAILJS_SERVICE_ID', 'EMAILJS_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY', 'EMAILJS_PRIVATE_KEY'];
  const missingEmail = emailKeys.filter((key) => !process.env[key]);
  if (missingEmail.length > 0) {
    console.warn(`⚠️  Email is not fully configured (missing ${missingEmail.join(', ')}); login OTP emails will fail`);
  }
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is not set');
    }
    return 'development-only-insecure-secret';
  }
  return secret;
}

/** Origins allowed to call the API from a browser. */
export function getAllowedOrigins(): string[] {
  const configured = [process.env.FRONTEND_URL, ...(process.env.CORS_ORIGINS || '').split(',')]
    .map((origin) => origin?.trim().replace(/\/$/, ''))
    .filter((origin): origin is string => Boolean(origin));

  if (process.env.NODE_ENV !== 'production') {
    configured.push('http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173');
  }
  return Array.from(new Set(configured));
}
