import { InvoiceStatus } from '../enums/invoice-status.enum';
import { TaxTreatment } from '../enums/tax-treatment.enum';
import { Business } from '../interfaces/business.interface';
import { Customer } from '../interfaces/customer.interface';
import { Invoice } from '../interfaces/invoice.interface';
import { addDays, addMonths, daysBetween, parseIso, toIso } from './date.util';
import { buildGstin } from './gstin.util';
import { nextInvoiceNumber } from './invoice-number.util';

export interface DemoData {
  business: Business;
  customers: Customer[];
  invoices: Invoice[];
}

/** Small deterministic PRNG (mulberry32) so the demo data is the same on every install. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CustomerSeed {
  name: string;
  pan: string | null;
  regionCode: string;
  city: string;
  weight: number;
}

// Maharashtra customers are twice as likely to be picked. PANs are fictional.
const CUSTOMER_SEEDS: CustomerSeed[] = [
  { name: 'Kalpataru Retail Pvt Ltd', pan: 'AABCK1234F', regionCode: '27', city: 'Mumbai', weight: 2 },
  { name: 'Sahyadri Foods LLP', pan: 'AAFFS5678G', regionCode: '27', city: 'Nashik', weight: 2 },
  { name: 'Bluepeak Logistics', pan: 'AACCB9012H', regionCode: '27', city: 'Pune', weight: 2 },
  { name: 'Lumen Health Clinics', pan: 'AADCL3456J', regionCode: '29', city: 'Bengaluru', weight: 1 },
  { name: 'Rajdhani Interiors', pan: 'AAGFR7890K', regionCode: '07', city: 'New Delhi', weight: 1 },
  { name: 'Narmada Textiles', pan: 'AAHCN2345L', regionCode: '24', city: 'Surat', weight: 1 },
  { name: 'Cauvery Tech Solutions', pan: 'AAICC6789M', regionCode: '33', city: 'Chennai', weight: 1 },
  { name: 'Priya Menon (Freelance)', pan: null, regionCode: '27', city: 'Pune', weight: 1 },
];

const SERVICES = [
  { description: 'Website design and development', itemCode: '998314', rates: [45000, 60000, 85000] },
  { description: 'Monthly social media management', itemCode: '998361', rates: [18000, 24000] },
  { description: 'Brand identity package', itemCode: '998391', rates: [35000, 52000] },
  { description: 'SEO optimisation retainer', itemCode: '998361', rates: [15000, 22000] },
  { description: 'Mobile app UI design', itemCode: '998314', rates: [48000, 70000] },
  { description: 'Hosting and maintenance (annual)', itemCode: '998315', rates: [9000, 14000] },
];

const ISSUE_DAYS = [3, 9, 14, 20, 26];

export function buildDemoBusiness(): Business {
  return {
    name: 'Aarav Digital Studio',
    country: 'IN',
    currency: 'INR',
    taxId: buildGstin('27', 'AAQPA4821K'),
    regionCode: '27',
    customTaxName: '',
    defaultTaxRate: 18,
    address: '12, Karve Road, Kothrud, Pune, Maharashtra 411038',
    email: 'hello@aaravdigital.example',
    phone: '+91 98765 43210',
    invoicePrefix: 'INV',
    bankName: 'HDFC Bank, Kothrud Branch',
    accountNumber: '50200012345678',
    bankCode: 'HDFC0000123',
    paymentId: 'aaravdigital@okhdfcbank',
  };
}

export function buildDemoCustomers(): Customer[] {
  return CUSTOMER_SEEDS.map((seed, index) => ({
    id: `cust_demo_${index + 1}`,
    name: seed.name,
    taxId: seed.pan ? buildGstin(seed.regionCode, seed.pan) : '',
    country: 'IN',
    regionCode: seed.regionCode,
    email: `accounts@${seed.name.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 14)}.example`,
    phone: `+91 9${String(100000000 + index * 1111111).slice(0, 9)}`,
    address: `${seed.city}, India`,
  }));
}

/** 6 months of invoices (3 to 5 a month) plus one draft dated today. */
export function buildDemoData(today: string): DemoData {
  const random = createRandom(2026);
  const business = buildDemoBusiness();
  const customers = buildDemoCustomers();
  const startMonth = 4;

  const totalWeight = CUSTOMER_SEEDS.reduce((sum, seed) => sum + seed.weight, 0);
  const pickCustomer = (): Customer => {
    let roll = random() * totalWeight;
    for (let i = 0; i < CUSTOMER_SEEDS.length; i++) {
      roll -= CUSTOMER_SEEDS[i].weight;
      if (roll <= 0) return customers[i];
    }
    return customers[0];
  };

  const makeItems = (idPrefix: string) => {
    const count = 1 + Math.floor(random() * 2);
    return Array.from({ length: count }, (_, i) => {
      const service = SERVICES[Math.floor(random() * SERVICES.length)];
      const taxRate = random() < 0.85 ? 18 : random() < 0.5 ? 12 : 5;
      return {
        id: `${idPrefix}_${i + 1}`,
        description: service.description,
        itemCode: service.itemCode,
        quantity: 1,
        rate: service.rates[Math.floor(random() * service.rates.length)],
        taxRate,
      };
    });
  };

  const plan: { issueDate: string }[] = [];
  const thisMonthStart = `${today.slice(0, 7)}-01`;
  const todayDay = parseIso(today).day;
  for (let offset = 5; offset >= 0; offset--) {
    const monthStart = addMonths(thisMonthStart, -offset);
    const { year, month } = parseIso(monthStart);
    const count = 3 + Math.floor(random() * 3);
    for (const day of ISSUE_DAYS.slice(0, count)) {
      if (offset === 0 && day >= todayDay) continue;
      plan.push({ issueDate: toIso(year, month, day) });
    }
  }

  const invoices: Invoice[] = [];
  const numbers: string[] = [];
  const issue = (issueDate: string, status: InvoiceStatus, id: string): Invoice => {
    const number = nextInvoiceNumber(business.invoicePrefix, issueDate, startMonth, numbers);
    numbers.push(number);
    return {
      id,
      number,
      customerId: pickCustomer().id,
      issueDate,
      dueDate: addDays(issueDate, 15),
      status,
      regime: 'IN',
      currency: 'INR',
      exchangeRate: 1,
      taxTreatment: TaxTreatment.Standard,
      items: makeItems(id),
      notes: 'Thank you for your business.',
      sellerRegionCode: business.regionCode,
    };
  };

  plan.forEach(({ issueDate }, index) => {
    const age = daysBetween(issueDate, today);
    const paid = age > 45 ? random() < 0.95 : index % 3 === 0;
    invoices.push(issue(issueDate, paid ? InvoiceStatus.Paid : InvoiceStatus.Unpaid, `inv_demo_${index + 1}`));
  });

  const draft = issue(today, InvoiceStatus.Draft, `inv_demo_${plan.length + 1}`);
  invoices.push(draft);

  return { business, customers, invoices };
}
