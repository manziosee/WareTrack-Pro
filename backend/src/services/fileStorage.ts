import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '../lib/prisma';
import { getTenantContext } from '../lib/tenantContext';

/**
 * File storage for photos, signatures and receipts.
 *
 * With S3_BUCKET (+ S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_ENDPOINT for
 * Cloudflare R2) files go to object storage; otherwise they are kept in the
 * stored_files table, away from the business tables. Either way records keep a
 * short reference: "file:<id>".
 */

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf' };
export const FILE_PREFIX = 'file:';
export const isFileRef = (value: unknown): value is string => typeof value === 'string' && value.startsWith(FILE_PREFIX);
export const isDataUrl = (value: unknown): value is string => typeof value === 'string' && value.startsWith('data:');

let client: S3Client | null | undefined;
function s3() {
  if (client !== undefined) return client;
  const { S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_REGION } = process.env;
  client = S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY
    ? new S3Client({
        region: S3_REGION || 'auto',
        endpoint: S3_ENDPOINT || undefined,
        forcePathStyle: Boolean(S3_ENDPOINT),
        credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
      })
    : null;
  return client;
}

export const storageBackend = () => (s3() ? 's3' : 'db');

export class FileInputError extends Error {}

function parseDataUrl(dataUrl: string) {
  const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) throw new FileInputError('Files must be sent as base64 data URLs');
  const contentType = match[1].toLowerCase();
  if (!TYPES[contentType]) throw new FileInputError('Only PNG, JPEG, WebP images or PDF files are accepted');
  return { contentType, bytes: Buffer.from(match[2], 'base64') };
}

/**
 * Save a data URL and return its "file:<id>" reference. Values that are already
 * references (or empty) are returned unchanged, so callers can pass either.
 */
export async function storeDataUrl(value: string | null | undefined, kind: string, options: { maxBytes: number; createdById?: number; companyId?: number; branchId?: number | null }) {
  if (!value) return null;
  if (isFileRef(value)) return value;
  const { contentType, bytes } = parseDataUrl(value);
  if (bytes.length > options.maxBytes) throw new FileInputError(`The file is too large (max ${Math.round(options.maxBytes / 1024)} KB)`);
  const tenant = getTenantContext();
  const companyId = options.companyId ?? tenant?.companyId;
  if (!companyId) throw new Error('Files must be stored for a company');
  const branchId = options.branchId !== undefined ? options.branchId : tenant?.branchId ?? null;
  const id = crypto.randomUUID();
  const bucket = process.env.S3_BUCKET;
  const store = s3();
  let objectKey: string | null = null;
  if (store && bucket) {
    objectKey = `${companyId}/${kind}/${id}.${TYPES[contentType]}`;
    await store.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: bytes, ContentType: contentType }));
  }
  await prisma.storedFile.create({
    data: { id, companyId, branchId, kind, contentType, size: bytes.length, storage: objectKey ? 's3' : 'db', objectKey, data: objectKey ? null : bytes, createdById: options.createdById ?? null },
  });
  return `${FILE_PREFIX}${id}`;
}

/** Read a stored file (inside the caller's company only). */
export async function readStoredFile(id: string) {
  const file = await prisma.storedFile.findUnique({ where: { id } });
  if (!file) return null;
  if (file.storage === 'db') return { contentType: file.contentType, body: Buffer.from(file.data || []) };
  const store = s3();
  if (!store || !file.objectKey) return null;
  const object = await store.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: file.objectKey }));
  const body = Buffer.from(await object.Body!.transformToByteArray());
  return { contentType: file.contentType, body };
}
