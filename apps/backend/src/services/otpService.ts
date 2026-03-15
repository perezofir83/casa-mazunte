/**
 * OTP Service - generates and verifies one-time passwords for owner auth.
 * OTPs expire after 5 minutes and allow max 3 attempts.
 */

import { PrismaClient } from '@prisma/client';
import { hashPhone } from './phoneHasher';

const prisma = new PrismaClient();

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;
const OTP_LENGTH = 6;

/**
 * Generate a 6-digit OTP code
 */
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create a new OTP for the given phone number.
 * Invalidates any existing unused OTPs for the same phone.
 */
export async function createOTP(phone: string): Promise<string> {
  const phoneHash = await hashPhone(phone);

  // Invalidate old OTPs for this phone
  await prisma.ownerOTP.updateMany({
    where: { phoneHash, used: false },
    data: { used: true },
  });

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.ownerOTP.create({
    data: { phoneHash, code, expiresAt },
  });

  return code;
}

/**
 * Verify an OTP code for the given phone number.
 * Returns true if valid, false otherwise.
 * Increments attempt counter; marks as used if correct.
 */
export async function verifyOTP(phone: string, code: string): Promise<boolean> {
  const phoneHash = await hashPhone(phone);
  const now = new Date();

  const otp = await prisma.ownerOTP.findFirst({
    where: {
      phoneHash,
      used: false,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) return false;

  // Too many attempts
  if (otp.attempts >= MAX_ATTEMPTS) {
    await prisma.ownerOTP.update({
      where: { id: otp.id },
      data: { used: true },
    });
    return false;
  }

  // Wrong code - increment attempts
  if (otp.code !== code) {
    await prisma.ownerOTP.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  // Valid - mark as used
  await prisma.ownerOTP.update({
    where: { id: otp.id },
    data: { used: true },
  });

  return true;
}

/**
 * Clean up expired OTPs (run periodically)
 */
export async function cleanExpiredOTPs(): Promise<void> {
  await prisma.ownerOTP.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
