import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiResponse } from '../types/index.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response<ApiResponse>) => {
  const timestamp = new Date().toISOString();
  let dbStatus = 'disconnected';
  let dbLatencyMs: number | null = null;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = `unavailable (${error instanceof Error ? error.message : 'connection refused'})`;
  }

  const memoryUsage = process.memoryUsage();

  res.status(200).json({
    success: true,
    message: 'Brightloop Subscription Management System API operational',
    data: {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        rssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
        heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
      },
    },
    meta: {
      timestamp,
      version: '1.0.0',
    },
  });
});

