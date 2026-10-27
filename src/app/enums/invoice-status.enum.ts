export enum InvoiceStatus {
  Draft = 'draft',
  Unpaid = 'unpaid',
  Paid = 'paid',
}

/** Derived display status: "overdue" is never stored. */
export type DisplayStatus = `${InvoiceStatus}` | 'overdue';
