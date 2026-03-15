import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Image storage abstraction.
 * Local filesystem in dev, GCS in production.
 * Max image size: 5MB, allowed types: JPEG, PNG, WebP
 */

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export interface StoredImage {
  id: string;
  url: string;
  storageKey: string;
}

/**
 * Save a base64-encoded image to local storage.
 * Returns the storage key and URL for the saved image.
 */
export async function saveImage(
  base64Data: string,
  listingId: string
): Promise<StoredImage> {
  const imageId = crypto.randomUUID();

  // Detect image type from base64 header
  const match = base64Data.match(/^data:(image\/\w+);base64,/);
  let buffer: Buffer;
  let extension = '.jpg';

  if (match) {
    // Has data URL prefix
    const mimeType = match[1];
    if (!ALLOWED_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported image type: ${mimeType}`);
    }
    extension = mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg';
    buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  } else {
    // Raw base64
    buffer = Buffer.from(base64Data, 'base64');
  }

  // Validate size
  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error(`Image too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB (max ${MAX_IMAGE_SIZE / 1024 / 1024}MB)`);
  }

  if (env.IMAGE_STORAGE === 'local') {
    return saveLocal(buffer, listingId, imageId, extension);
  } else {
    // TODO: GCS implementation for production
    throw new Error('GCS storage not implemented yet');
  }
}

async function saveLocal(
  buffer: Buffer,
  listingId: string,
  imageId: string,
  extension: string
): Promise<StoredImage> {
  const uploadsDir = path.resolve(env.IMAGE_LOCAL_PATH);
  const listingDir = path.join(uploadsDir, listingId);

  // Create directories if they don't exist
  if (!fs.existsSync(listingDir)) {
    fs.mkdirSync(listingDir, { recursive: true });
  }

  const filename = `${imageId}${extension}`;
  const filepath = path.join(listingDir, filename);
  const storageKey = `${listingId}/${filename}`;

  fs.writeFileSync(filepath, buffer);

  return {
    id: imageId,
    url: `/uploads/${storageKey}`,
    storageKey,
  };
}

/**
 * Delete all images for a listing.
 */
export async function deleteListingImages(listingId: string): Promise<void> {
  if (env.IMAGE_STORAGE === 'local') {
    const listingDir = path.join(path.resolve(env.IMAGE_LOCAL_PATH), listingId);
    if (fs.existsSync(listingDir)) {
      fs.rmSync(listingDir, { recursive: true });
    }
  }
}

/**
 * Validate that a file is a safe image.
 * Checks magic bytes, not just extension.
 */
export function validateImageBuffer(buffer: Buffer): boolean {
  // Check JPEG magic bytes
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // Check PNG magic bytes
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // Check WebP (RIFF....WEBP)
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return true;

  return false;
}
