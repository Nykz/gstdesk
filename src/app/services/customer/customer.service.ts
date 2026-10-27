import { Injectable, inject, signal } from '@angular/core';
import { StorageKey } from '../../enums/storage-key.enum';
import { Customer } from '../../interfaces/customer.interface';
import { newId } from '../../utils/id.util';
import { migrateCustomers } from '../../utils/migrate.util';
import { StorageService } from '../storage/storage.service';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly storage = inject(StorageService);

  private readonly _customers = signal<Customer[]>([]);
  readonly customers = this._customers.asReadonly();

  async load(): Promise<void> {
    this._customers.set(migrateCustomers(await this.storage.get<unknown>(StorageKey.Customers, [])));
  }

  byId(id: string): Customer | undefined {
    return this._customers().find((customer) => customer.id === id);
  }

  async add(data: Omit<Customer, 'id'>): Promise<Customer> {
    const customer: Customer = { ...data, id: newId('cust') };
    await this.persist([...this._customers(), customer]);
    return customer;
  }

  async update(customer: Customer): Promise<void> {
    await this.persist(this._customers().map((c) => (c.id === customer.id ? customer : c)));
  }

  async remove(id: string): Promise<void> {
    await this.persist(this._customers().filter((c) => c.id !== id));
  }

  async replaceAll(customers: Customer[]): Promise<void> {
    await this.persist(customers);
  }

  private async persist(customers: Customer[]): Promise<void> {
    this._customers.set(customers);
    await this.storage.set(StorageKey.Customers, customers);
  }
}
