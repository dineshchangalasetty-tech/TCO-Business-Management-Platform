import { Request, Response, NextFunction } from 'express';
import { ExportService, ExportFormat } from '../services/export.service';
import { ValidationError } from '../utils/errors';
import { isValidDate } from '../utils/dateHelpers';

const exportService = ExportService.getInstance();

/**
 * POST /api/v1/exports
 * Generate a cost data export in CSV, Excel, or JSON format.
 */
export async function generateExport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subscriptionId, from, to, groupBy, format = 'csv', fileName } = req.body as {
      subscriptionId?: string;
      from?: string;
      to?: string;
      groupBy?: string;
      format?: ExportFormat;
      fileName?: string;
    };

    if (!subscriptionId) throw new ValidationError('subscriptionId is required');
    if (!from || !to) throw new ValidationError('from and to dates are required');
    if (!isValidDate(from) || !isValidDate(to)) throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
    if (!['csv', 'excel', 'json'].includes(format)) throw new ValidationError('format must be csv, excel, or json');

    const result = await exportService.generateExport({
      subscriptionId,
      from,
      to,
      groupBy,
      format,
      fileName,
    });

    if (!result.content) {
      res.status(500).json({ success: false, error: 'Export generation failed' });
      return;
    }

    const contentTypeMap: Record<ExportFormat, string> = {
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      json: 'application/json',
    };

    res.setHeader('Content-Type', contentTypeMap[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.fileSizeBytes.toString());
    res.setHeader('X-Row-Count', result.rowCount.toString());
    res.send(result.content);
  } catch (error) {
    next(error);
  }
}
