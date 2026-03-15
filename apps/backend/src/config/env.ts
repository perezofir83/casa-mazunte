import { z } from 'zod';
import { config } from 'dotenv';
import path from 'path';

// Load .env from backend directory
config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Environment variable validation schema.
 * App crashes immediately on startup if any required var is missing.
 * This is intentional - fail fast, fail loud.
 */
const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Claude API
  CLAUDE_API_KEY: z.string().optional(),

  // Ultramsg (optional in dev)
  ULTRAMSG_INSTANCE_ID: z.string().optional(),
  ULTRAMSG_TOKEN: z.string().optional(),

  // Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  PHONE_ENCRYPTION_KEY: z.string().length(32, 'PHONE_ENCRYPTION_KEY must be exactly 32 characters'),

  // CORS
  CORS_ORIGIN: z.string().url().default('http://localhost:3001'),

  // Image storage
  IMAGE_STORAGE: z.enum(['local', 'gcs']).default('local'),
  IMAGE_LOCAL_PATH: z.string().default('./uploads'),
  GCS_BUCKET: z.string().optional(),

  // Capture API key (shared secret with extension)
  CAPTURE_API_KEY: z.string().min(16, 'CAPTURE_API_KEY must be at least 16 characters'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Environment variable validation failed:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;
