import { Request, Response, NextFunction } from 'express';
import { ReservationService } from '../services/reservation.service';
import { ValidationError } from '../utils/errors';

const reservationService = ReservationService.getInstance();

/**
 * GET /api/v1/reservations
 * Get reservation utilization portfolio summary.
 */
export async function getReservationSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subscriptionId, grain = 'Monthly', from, to } = req.query as Record<string, string>;

    if (!subscriptionId) throw new ValidationError('subscriptionId is required');
    if (!['Daily', 'Monthly'].includes(grain)) throw new ValidationError('grain must be Daily or Monthly');

    const result = await reservationService.getReservationSummary({
      subscriptionId,
      grain: grain as 'Daily' | 'Monthly',
      ...(from && to && { from, to }),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
