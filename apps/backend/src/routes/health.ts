import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/health
 * Health check endpoint for monitoring.
 * Returns server status, environment, and DB connectivity.
 */
router.get('/', async (_req, res) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      data: {
        status: 'healthy',
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        services: {
          database: 'connected',
          llm: env.CLAUDE_API_KEY ? 'configured' : 'not configured',
          ultramsg:
            env.ULTRAMSG_INSTANCE_ID && env.ULTRAMSG_TOKEN
              ? 'configured'
              : 'not configured',
        },
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      },
    });
  }
});

export default router;
