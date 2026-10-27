export interface MonthBar {
  key: string;
  label: string;
  billed: number;
  collected: number;
}

export interface TaxBreakdownRow {
  label: string;
  amount: number;
}

export interface TopCustomer {
  customerId: string;
  name: string;
  amount: number;
  share: number;
}

export interface DashboardStats {
  billed: number;
  collected: number;
  outstanding: number;
  overdueAmount: number;
  overdueCount: number;
  collectedShare: number;
  taxCollected: TaxBreakdownRow[];
  totalTax: number;
  months: MonthBar[];
  /** Percentage change of this month's billed vs last month; null when no base. */
  monthOverMonth: number | null;
  topCustomers: TopCustomer[];
  hasData: boolean;
}
