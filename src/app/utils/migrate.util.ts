import { BackupFile } from '../interfaces/backup.interface';
import { Business } from '../interfaces/business.interface';
import { Customer } from '../interfaces/customer.interface';
import { Invoice, InvoiceItem } from '../interfaces/invoice.interface';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { TaxTreatment } from '../enums/tax-treatment.enum';
import { defaultBusiness } from './business.util';

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

const num = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** First defined value among the new name and the old India-only names. */
function pick(raw: Raw, ...names: string[]): unknown {
  for (const name of names) if (raw[name] !== undefined && raw[name] !== null) return raw[name];
  return undefined;
}

export function migrateBusiness(raw: unknown): Business {
  const source = isRecord(raw) ? raw : {};
  const base = defaultBusiness(str(source['country'], 'IN') || 'IN');
  return {
    name: str(source['name'], base.name),
    country: base.country,
    currency: str(source['currency'], base.currency) || base.currency,
    taxId: str(pick(source, 'taxId', 'gstin')),
    regionCode: str(pick(source, 'regionCode', 'stateCode'), base.regionCode),
    customTaxName: str(source['customTaxName']),
    defaultTaxRate: num(pick(source, 'defaultTaxRate', 'defaultGstRate'), base.defaultTaxRate),
    address: str(source['address']),
    email: str(source['email']),
    phone: str(source['phone']),
    invoicePrefix: str(source['invoicePrefix'], base.invoicePrefix) || base.invoicePrefix,
    bankName: str(source['bankName']),
    accountNumber: str(source['accountNumber']),
    bankCode: str(pick(source, 'bankCode', 'ifsc')),
    paymentId: str(pick(source, 'paymentId', 'upiId')),
  };
}

export function migrateCustomer(raw: unknown): Customer | null {
  if (!isRecord(raw) || typeof raw['id'] !== 'string') return null;
  return {
    id: raw['id'],
    name: str(raw['name']),
    taxId: str(pick(raw, 'taxId', 'gstin')),
    country: str(raw['country'], 'IN') || 'IN',
    regionCode: str(pick(raw, 'regionCode', 'stateCode')),
    email: str(raw['email']),
    phone: str(raw['phone']),
    address: str(raw['address']),
  };
}

function migrateItem(raw: unknown, index: number): InvoiceItem {
  const source = isRecord(raw) ? raw : {};
  return {
    id: str(source['id'], `item_${index}`),
    description: str(source['description']),
    itemCode: str(pick(source, 'itemCode', 'hsn')),
    quantity: num(source['quantity'], 1),
    rate: num(source['rate']),
    taxRate: num(pick(source, 'taxRate', 'gstRate')),
  };
}

const STATUSES = Object.values(InvoiceStatus) as string[];

export function migrateInvoice(raw: unknown): Invoice | null {
  if (!isRecord(raw) || typeof raw['id'] !== 'string') return null;
  const status = str(raw['status']);
  const items = Array.isArray(raw['items']) ? raw['items'] : [];
  const invoice: Invoice = {
    id: raw['id'],
    number: str(raw['number']),
    customerId: str(raw['customerId']),
    issueDate: str(raw['issueDate']),
    dueDate: str(raw['dueDate']),
    status: STATUSES.includes(status) ? (status as InvoiceStatus) : InvoiceStatus.Draft,
    regime: str(raw['regime'], 'IN') || 'IN',
    currency: str(raw['currency'], 'INR') || 'INR',
    exchangeRate: num(raw['exchangeRate'], 1) || 1,
    taxTreatment:
      raw['taxTreatment'] === TaxTreatment.Exempt ? TaxTreatment.Exempt : TaxTreatment.Standard,
    items: items.map(migrateItem),
    notes: str(raw['notes']),
  };
  const sellerRegion = str(raw['sellerRegionCode']);
  if (sellerRegion) invoice.sellerRegionCode = sellerRegion;
  return invoice;
}

export function migrateCustomers(raw: unknown): Customer[] {
  return Array.isArray(raw) ? raw.map(migrateCustomer).filter((c): c is Customer => c !== null) : [];
}

export function migrateInvoices(raw: unknown): Invoice[] {
  return Array.isArray(raw) ? raw.map(migrateInvoice).filter((i): i is Invoice => i !== null) : [];
}

/** Parses a backup file; throws on anything that is not a GSTDesk backup. */
export function migrateBackup(raw: unknown): BackupFile {
  if (!isRecord(raw) || !isRecord(raw['business']) || !Array.isArray(raw['customers']) || !Array.isArray(raw['invoices'])) {
    throw new Error('This file is not a valid backup.');
  }
  return {
    version: 2,
    exportedAt: str(raw['exportedAt']),
    business: migrateBusiness(raw['business']),
    customers: migrateCustomers(raw['customers']),
    invoices: migrateInvoices(raw['invoices']),
  };
}
