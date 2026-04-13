import { Request, Response, NextFunction } from 'express';
import { ForecastService } from '../services/forecast.service';
import { ValidationError } from '../utils/errors';

const forecastService = ForecastService.getInstance();

/**
 * GET /api/v1/forecasts
 * Get cost forecast for a subscription (30, 60, or 90 days ahead).
 */
export async function getForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subscriptionId, daysAhead = '30', includeActual = 'true' } = req.query as Record<string, string>;

    if (!subscriptionId) throw new ValidationError('subscriptionId is required');

    const days = parseInt(daysAhead, 10);
    if (![30, 60, 90].includes(days)) throw new ValidationError('daysAhead must be 30, 60, or 90');

    const result = await forecastService.getForecast({
      subscriptionId,
      daysAhead: days as 30 | 60 | 90,
      includeActualToDate: includeActual === 'true',
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
