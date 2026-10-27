export interface Customer {
  id: string;
  name: string;
  /** Empty means unregistered. */
  taxId: string;
  /** ISO 3166-1 alpha-2 country code. */
  country: string;
  regionCode: string;
  email: string;
  phone: string;
  address: string;
}
