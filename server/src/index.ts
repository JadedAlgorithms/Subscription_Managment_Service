import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { apiRouter } from './routes/index.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

// Load environment configuration
dotenv.config();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// ------------------------------------------------------------------------------
// Core Security & Request Parsing Middlewares
// ------------------------------------------------------------------------------

app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        CLIENT_URL,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
      ];
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev, configurable for prod
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// ------------------------------------------------------------------------------
// API Routes (Mounted on both /api and /api/v1 for seamless routing)
// ------------------------------------------------------------------------------

app.use('/api', apiRouter);
if (API_PREFIX !== '/api') {
  app.use(API_PREFIX, apiRouter);
}

// Fallback Root Route
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'Brightloop Subscription Management API',
    status: 'ONLINE',
    version: '1.0.0',
    documentation: `${API_PREFIX}/overview`,
    health: `${API_PREFIX}/health`,
  });
});

// ------------------------------------------------------------------------------
// Catch-all 404 Route
// ------------------------------------------------------------------------------

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl} - Route not found`, 404));
});

// ------------------------------------------------------------------------------
// Centralized Error Handling
// ------------------------------------------------------------------------------

app.use(errorHandler);

// ------------------------------------------------------------------------------
// Server Initialization
// ------------------------------------------------------------------------------

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` Brightloop Subscription Engine Server Active`);
    console.log(` Port: ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` API Base: http://localhost:${PORT}${API_PREFIX}`);
    console.log(` Health:   http://localhost:${PORT}${API_PREFIX}/health`);
    console.log(`====================================================`);
  });
}

export default app;

