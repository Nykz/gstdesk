import { Business } from '../interfaces/business.interface';
import { Customer } from '../interfaces/customer.interface';
import { Invoice } from '../interfaces/invoice.interface';
import { ValidationIssue } from '../interfaces/validation.interface';
import { isIsoDate } from './date.util';

/** Issues that block issuing an invoice. Drafts are never validated. */
export function validateInvoice(
  invoice: Invoice,
  business: Business,
  customer: Customer | undefined,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (field: string, message: string) => issues.push({ field, message });

  if (!business.name.trim()) add('business', 'Add your business name in Settings first.');
  if (!customer) add('customer', 'Choose a customer.');
  if (!isIsoDate(invoice.issueDate)) add('issueDate', 'Enter a valid issue date.');
  if (!isIsoDate(invoice.dueDate)) add('dueDate', 'Enter a valid due date.');
  else if (isIsoDate(invoice.issueDate) && invoice.dueDate < invoice.issueDate) {
    add('dueDate', 'Due date cannot be before the issue date.');
  }
  if (invoice.currency !== business.currency && !(invoice.exchangeRate > 0)) {
    add('exchangeRate', 'Enter an exchange rate greater than zero.');
  }
  if (invoice.items.length === 0) add('items', 'Add at least one line item.');
  invoice.items.forEach((item, index) => {
    const row = `Item ${index + 1}`;
    if (!item.description.trim()) add(`items.${index}.description`, `${row}: add a description.`);
    if (!(item.quantity > 0)) add(`items.${index}.quantity`, `${row}: quantity must be more than zero.`);
    if (!(item.rate >= 0)) add(`items.${index}.rate`, `${row}: rate cannot be negative.`);
    if (!(item.taxRate >= 0 && item.taxRate <= 100)) {
      add(`items.${index}.taxRate`, `${row}: tax rate must be between 0 and 100.`);
    }
  });
  return issues;
}
