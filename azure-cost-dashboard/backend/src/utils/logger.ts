import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${ts} [${level}]: ${stack ?? message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] ?? 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), errors({ stack: true }), json()),
  defaultMeta: {
    service: 'azure-cost-dashboard-api',
    environment: process.env['NODE_ENV'],
  },
  transports: [
    new winston.transports.Console({
      format:
        process.env['NODE_ENV'] === 'development'
          ? combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), devFormat)
          : combine(timestamp(), errors({ stack: true }), json()),
      silent: process.env['NODE_ENV'] === 'test',
    }),
  ],
});

// Write errors to file in production
if (process.env['NODE_ENV'] === 'production') {
  logger.add(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    })
  );
}
