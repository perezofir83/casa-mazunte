import express from 'express';
import path from 'path';
import { env } from './config/env';
import { helmetConfig, corsConfig, generalLimiter } from './config/security';
import { sanitizeMiddleware } from './middleware/sanitize';
import { startPromotionExpiryCron } from './jobs/promotionExpiry';

// Route imports
import healthRouter from './routes/health';
import listingsRouter from './routes/listings';
import captureRouter from './routes/capture';
import adminRouter from './routes/admin';
import webhookRouter from './routes/webhook';

const app = express();

// ============================================
// Global Middleware (Security First)
// ============================================
app.use(helmetConfig);
app.use(corsConfig);
app.use(generalLimiter);
app.use(express.json({ limit: '10mb' })); // Allow large payloads for images
app.use(express.urlencoded({ extended: false }));
app.use(sanitizeMiddleware);

// ============================================
// Static files (uploaded images in dev)
// ============================================
if (env.IMAGE_STORAGE === 'local') {
  app.use('/uploads', express.static(path.resolve(env.IMAGE_LOCAL_PATH)));
}

// ============================================
// API Routes
// ============================================
app.use('/api/health', healthRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/capture', captureRouter);
app.use('/api/admin', adminRouter);
app.use('/api/webhook', webhookRouter);

// ============================================
// 404 handler
// ============================================
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// ============================================
// Global error handler
// ============================================
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// ============================================
// Start server
// ============================================
app.listen(env.PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║         🏠 Casa Mazunte Backend             ║
╠══════════════════════════════════════════════╣
║  Environment: ${env.NODE_ENV.padEnd(30)}║
║  Port:        ${String(env.PORT).padEnd(30)}║
║  CORS Origin: ${env.CORS_ORIGIN.padEnd(30)}║
║  LLM:         ${(env.CLAUDE_API_KEY ? 'Claude Haiku ✓' : 'Not configured ✗').padEnd(30)}║
║  Ultramsg:    ${(env.ULTRAMSG_INSTANCE_ID ? 'Configured ✓' : 'Not configured (stub)').padEnd(30)}║
║  Images:      ${env.IMAGE_STORAGE.padEnd(30)}║
╚══════════════════════════════════════════════╝
  `);

  // Start cron jobs
  startPromotionExpiryCron();
});

export default app;
