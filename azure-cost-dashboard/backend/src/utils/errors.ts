/**
 * Custom application error class with HTTP status code and operational flag.
 * Operational errors are expected (e.g. validation, not found) vs programmer errors.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class AzureApiError extends AppError {
  public readonly azureStatusCode?: number;
  public readonly azureErrorCode?: string;

  constructor(message: string, azureStatusCode?: number, azureErrorCode?: string) {
    super(message, 502, 'AZURE_API_ERROR');
    this.azureStatusCode = azureStatusCode;
    this.azureErrorCode = azureErrorCode;
  }
}

export class CacheError extends AppError {
  constructor(message: string) {
    super(message, 503, 'CACHE_ERROR', false);
  }
}
