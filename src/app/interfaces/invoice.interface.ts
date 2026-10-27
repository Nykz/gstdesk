import { InvoiceStatus } from '../enums/invoice-status.enum';
import { TaxTreatment } from '../enums/tax-treatment.enum';

export interface InvoiceItem {
  id: string;
  description: string;
  itemCode: string;
  quantity: number;
  rate: number;
  taxRate: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  /** ISO yyyy-mm-dd. */
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  /** Regime code snapshotted at creation. */
  regime: string;
  currency: string;
  /** Home currency per 1 invoice currency. */
  exchangeRate: number;
  taxTreatment: TaxTreatment;
  items: InvoiceItem[];
  notes: string;
  /** Seller region snapshotted at creation so later Settings changes never re-split the tax. */
  sellerRegionCode?: string;
}
