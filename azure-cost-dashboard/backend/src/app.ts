import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import { costRoutes } from './routes/cost.routes';
import { budgetRoutes } from './routes/budget.routes';
import { exportRoutes } from './routes/export.routes';
import { forecastRoutes } from './routes/forecast.routes';
import { reservationRoutes } from './routes/reservation.routes';
import { alertRoutes } from './routes/alert.routes';
import { logger } from './utils/logger';
import { DatabaseConfig } from './config/database.config';
import { AppError } from './utils/errors';
import { demoMiddleware } from './middleware/demo.middleware';

const app: Application = express();
const PORT = parseInt(process.env['WEBSITES_PORT'] ?? process.env['PORT'] ?? '3001', 10);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://management.azure.com'],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? '').split(',').filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env['NODE_ENV'] === 'development') {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  })
);

// ─── Body Parsing & Compression ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// ─── Request Logging ─────────────────────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (message: string) => logger.http(message.trim()) },
    skip: (_req, res) => res.statusCode < 400 && process.env['NODE_ENV'] === 'test',
  })
);

// ─── Global Rate Limiting ─────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'API rate limit exceeded.' },
});

app.use(globalLimiter);
app.use('/api/', apiLimiter);

// ─── Correlation ID middleware ─────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.headers['x-correlation-id'] ??= crypto.randomUUID();
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await DatabaseConfig.getInstance().healthCheck();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '1.0.0',
      environment: process.env['NODE_ENV'],
    });
  } catch {
    res.status(503).json({ status: 'unhealthy', timestamp: new Date().toISOString() });
  }
});

// ─── Swagger API Docs ─────────────────────────────────────────────────────────
if (process.env['NODE_ENV'] !== 'production') {
  try {
    const swaggerDoc = YAML.load(path.join(__dirname, '../docs/openapi.yaml'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, { explorer: true }));
  } catch {
    logger.warn('OpenAPI spec not found — Swagger UI disabled');
  }
}

// ─── Demo Mode Middleware (intercepts requests before real routes) ────────────
if (process.env['DEMO_MODE'] === 'true') {
  logger.info('🚀 DEMO MODE enabled — API responses served from mock data');
  app.use(demoMiddleware);
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/costs', costRoutes);
app.use('/api/v1/budgets', budgetRoutes);
app.use('/api/v1/forecasts', forecastRoutes);
app.use('/api/v1/exports', exportRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/alerts', alertRoutes);

// ─── Subscriptions (demo mode only) ──────────────────────────────────────────
app.get('/api/v1/subscriptions', (req, res, next) => {
  if (process.env['DEMO_MODE'] === 'true') return next(); // handled by demoMiddleware above
  res.status(501).json({ error: 'Not implemented' });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: Error | AppError, req: Request, res: Response, _next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] as string;
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const isOperational = err instanceof AppError ? err.isOperational : false;

  if (!isOperational) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack, correlationId });
  }

  res.status(statusCode).json({
    error: isOperational ? err.message : 'Internal server error',
    code: err instanceof AppError ? err.code : 'INTERNAL_ERROR',
    correlationId,
    ...(process.env['NODE_ENV'] === 'development' && { stack: err.stack }),
  });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    if (process.env['DEMO_MODE'] !== 'true') {
      await DatabaseConfig.getInstance().connect();
      logger.info('Database connected successfully');
    } else {
      logger.info('DEMO MODE — skipping database connection');
    }

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${process.env['NODE_ENV']}]`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully');
  await DatabaseConfig.getInstance().close();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});

bootstrap();

export default app;
