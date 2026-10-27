export interface Business {
  name: string;
  /** Tax regime code, e.g. IN. */
  country: string;
  currency: string;
  taxId: string;
  regionCode: string;
  customTaxName: string;
  defaultTaxRate: number;
  address: string;
  email: string;
  phone: string;
  invoicePrefix: string;
  bankName: string;
  accountNumber: string;
  bankCode: string;
  paymentId: string;
}
