import sql from 'mssql';
import { logger } from '../utils/logger';

export interface DatabaseConfigOptions {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  connectionTimeout: number;
  requestTimeout: number;
  pool: {
    max: number;
    min: number;
    idleTimeoutMillis: number;
  };
}

/**
 * Singleton SQL Server connection pool manager.
 */
export class DatabaseConfig {
  private static instance: DatabaseConfig;
  private pool: sql.ConnectionPool | null = null;
  private readonly config: sql.config;

  private constructor() {
    this.config = {
      server: process.env['DB_SERVER'] ?? 'localhost',
      port: parseInt(process.env['DB_PORT'] ?? '1433', 10),
      database: process.env['DB_NAME'] ?? 'CostDashboardDB',
      user: process.env['DB_USER'] ?? '',
      password: process.env['DB_PASSWORD'] ?? '',
      options: {
        encrypt: process.env['DB_ENCRYPT'] !== 'false',
        trustServerCertificate: process.env['NODE_ENV'] !== 'production',
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
      },
      pool: {
        max: parseInt(process.env['DB_POOL_MAX'] ?? '10', 10),
        min: parseInt(process.env['DB_POOL_MIN'] ?? '2', 10),
        idleTimeoutMillis: 30000,
      },
    };
  }

  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  public async connect(): Promise<sql.ConnectionPool> {
    if (this.pool?.connected) return this.pool;

    this.pool = await sql.connect(this.config);
    this.pool.on('error', (err) => {
      logger.error('SQL Pool error', { error: err.message });
    });
    logger.info('SQL connection pool established');
    return this.pool;
  }

  public getPool(): sql.ConnectionPool {
    if (!this.pool?.connected) {
      throw new Error('Database pool not connected. Call connect() first.');
    }
    return this.pool;
  }

  public async healthCheck(): Promise<void> {
    const pool = this.getPool();
    await pool.request().query('SELECT 1 AS health');
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      logger.info('SQL connection pool closed');
    }
  }
}
