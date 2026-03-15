import * as argon2 from 'argon2';
import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Hash a phone number using Argon2 for secure deduplication.
 * Same phone always produces the same hash (using phone as salt).
 * This allows checking "have we seen this phone before?" without storing it in plaintext.
 */
export async function hashPhone(phone: string): Promise<string> {
  const normalized = normalizePhone(phone);
  // Use a deterministic salt derived from the phone itself
  // This allows dedup without storing plaintext
  const salt = crypto.createHash('sha256').update(normalized).digest().slice(0, 16);

  return argon2.hash(normalized, {
    salt,
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Encrypt a phone number using AES-256-GCM.
 * Only admin can decrypt (using PHONE_ENCRYPTION_KEY).
 * Used to generate wa.me links for the frontend.
 */
export function encryptPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  const key = Buffer.from(env.PHONE_ENCRYPTION_KEY, 'utf-8');
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(normalized, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a phone number. Only used server-side for generating wa.me links.
 * NEVER expose decrypted phone numbers to the frontend directly.
 */
export function decryptPhone(encryptedPhone: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedPhone.split(':');
  const key = Buffer.from(env.PHONE_ENCRYPTION_KEY, 'utf-8');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');

  return decrypted;
}

/**
 * Generate a wa.me contact URL from an encrypted phone.
 * Pre-fills a message in Spanish referencing the listing.
 */
export function generateWhatsAppLink(encryptedPhone: string, listingId: string): string {
  const phone = decryptPhone(encryptedPhone);
  // Remove any non-digit characters except leading +
  const cleanPhone = phone.replace(/[^\d]/g, '');
  const message = encodeURIComponent(
    `Hola! Vi tu anuncio en Casa Mazunte (ref: ${listingId.slice(0, 8)}). ¿Sigue disponible?`
  );
  return `https://wa.me/${cleanPhone}?text=${message}`;
}

/**
 * Normalize phone number format.
 * Mexican phones: remove spaces, ensure +52 prefix.
 */
function normalizePhone(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If starts with +, keep as is
  if (cleaned.startsWith('+')) return cleaned;

  // If 10 digits (Mexican local), add +52
  if (cleaned.length === 10) return `+52${cleaned}`;

  // If 12 digits starting with 52, add +
  if (cleaned.length === 12 && cleaned.startsWith('52')) return `+${cleaned}`;

  // If 13 digits starting with 521 (with 1 for mobile), keep as +52 format
  if (cleaned.length === 13 && cleaned.startsWith('521')) return `+${cleaned}`;

  return `+${cleaned}`;
}
