import { Business } from './business.interface';
import { Customer } from './customer.interface';
import { Invoice } from './invoice.interface';

export interface BackupFile {
  version: number;
  exportedAt: string;
  business: Business;
  customers: Customer[];
  invoices: Invoice[];
}
