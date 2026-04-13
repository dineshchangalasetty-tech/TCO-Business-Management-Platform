import { AzureApiClient } from '../utils/azureApiClient';
import { CacheService } from './cache.service';
import { loadAzureConfig } from '../config/azure.config';
import { StorageSharedKeyCredential, BlobServiceClient } from '@azure/storage-blob';
import ExcelJS from 'exceljs';
import { logger } from '../utils/logger';

export type ExportFormat = 'csv' | 'excel' | 'json';

export interface ExportRequest {
  subscriptionId: string;
  from: string;
  to: string;
  groupBy?: string;
  format: ExportFormat;
  fileName?: string;
}

export interface ExportResult {
  fileName: string;
  format: ExportFormat;
  rowCount: number;
  fileSizeBytes: number;
  downloadUrl?: string;
  content?: Buffer;
}

/**
 * Export service — generates CSV, Excel, or JSON cost exports
 * and optionally uploads to Azure Blob Storage.
 */
export class ExportService {
  private static instance: ExportService;
  private readonly apiClient = AzureApiClient.getInstance();
  private readonly cache = CacheService.getInstance();

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  /**
   * Generate a cost data export in the specified format.
   */
  public async generateExport(request: ExportRequest): Promise<ExportResult> {
    const { subscriptionId, from, to, groupBy, format, fileName } = request;

    logger.info('Generating cost export', { subscriptionId, from, to, format });

    // Fetch raw cost data
    const config = await loadAzureConfig();
    const queryBody = {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: { from, to },
      dataset: {
        granularity: 'Daily',
        aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
        ...(groupBy && { grouping: [{ type: 'Dimension', name: groupBy }] }),
        sorting: [{ direction: 'Ascending', name: 'BillingMonth' }],
      },
    };

    const url = `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=${config.costManagementApiVersion}`;
    const response = await this.apiClient.post<{
      properties: {
        columns: Array<{ name: string; type: string }>;
        rows: Array<Array<string | number>>;
      };
    }>(url, queryBody);

    const { columns, rows } = response.properties;
    const baseFileName = fileName ?? `cost-export-${subscriptionId}-${from}-${to}`;

    switch (format) {
      case 'csv':
        return this.generateCsv(baseFileName, columns, rows);
      case 'excel':
        return this.generateExcel(baseFileName, columns, rows, subscriptionId, from, to);
      case 'json':
        return this.generateJson(baseFileName, columns, rows);
      default:
        return this.generateCsv(baseFileName, columns, rows);
    }
  }

  private generateCsv(
    fileName: string,
    columns: Array<{ name: string }>,
    rows: Array<Array<string | number>>
  ): ExportResult {
    const header = columns.map((c) => c.name).join(',');
    const dataRows = rows.map((row) =>
      row.map((cell) => (typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : String(cell))).join(',')
    );
    const csvContent = [header, ...dataRows].join('\n');
    const content = Buffer.from(csvContent, 'utf-8');

    return {
      fileName: `${fileName}.csv`,
      format: 'csv',
      rowCount: rows.length,
      fileSizeBytes: content.byteLength,
      content,
    };
  }

  private async generateExcel(
    fileName: string,
    columns: Array<{ name: string }>,
    rows: Array<Array<string | number>>,
    subscriptionId: string,
    from: string,
    to: string
  ): Promise<ExportResult> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Azure Cost Dashboard';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Cost Data', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Header row with styling
    worksheet.addRow(columns.map((c) => c.name));
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    headerRow.alignment = { horizontal: 'center' };

    // Set column widths
    columns.forEach((col, i) => {
      const column = worksheet.getColumn(i + 1);
      column.width = Math.max(col.name.length + 4, 15);
    });

    // Data rows with alternating colors
    rows.forEach((row, rowIdx) => {
      const dataRow = worksheet.addRow(row);
      if (rowIdx % 2 === 0) {
        dataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
      }
    });

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Export Summary']);
    summarySheet.addRow(['Subscription ID', subscriptionId]);
    summarySheet.addRow(['Date Range', `${from} to ${to}`]);
    summarySheet.addRow(['Total Rows', rows.length]);
    summarySheet.addRow(['Generated At', new Date().toISOString()]);

    const buffer = await workbook.xlsx.writeBuffer();
    const content = Buffer.from(buffer);

    return {
      fileName: `${fileName}.xlsx`,
      format: 'excel',
      rowCount: rows.length,
      fileSizeBytes: content.byteLength,
      content,
    };
  }

  private generateJson(
    fileName: string,
    columns: Array<{ name: string }>,
    rows: Array<Array<string | number>>
  ): ExportResult {
    const data = rows.map((row) =>
      Object.fromEntries(columns.map((col, i) => [col.name, row[i]]))
    );
    const jsonContent = JSON.stringify({ exportedAt: new Date().toISOString(), rows: data }, null, 2);
    const content = Buffer.from(jsonContent, 'utf-8');

    return {
      fileName: `${fileName}.json`,
      format: 'json',
      rowCount: rows.length,
      fileSizeBytes: content.byteLength,
      content,
    };
  }
}
