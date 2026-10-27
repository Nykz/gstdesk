import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Directory, Encoding } from '@capacitor/filesystem';
import { StorageKey } from '../../enums/storage-key.enum';
import { BackupFile } from '../../interfaces/backup.interface';
import { todayIso } from '../../utils/date.util';
import { migrateBackup } from '../../utils/migrate.util';
import { FILESYSTEM, IS_NATIVE, SHARE } from '../../tokens/native-plugins.tokens';
import { BusinessService } from '../business/business.service';
import { CustomerService } from '../customer/customer.service';
import { InvoiceService } from '../invoice/invoice.service';
import { StorageService } from '../storage/storage.service';

export const BACKUP_VERSION = 2;

@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(StorageService);
  private readonly native = inject(IS_NATIVE);
  private readonly filesystem = inject(FILESYSTEM);
  private readonly share = inject(SHARE);
  private readonly businessService = inject(BusinessService);
  private readonly customerService = inject(CustomerService);
  private readonly invoiceService = inject(InvoiceService);

  build(): BackupFile {
    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      business: this.businessService.business(),
      customers: this.customerService.customers(),
      invoices: this.invoiceService.invoices(),
    };
  }

  /**
   * Saves the backup as a JSON file and returns its file name. In a browser it is downloaded; inside the Android and
   * iOS apps there is no download bar, so it is written to the cache and handed to the system share sheet
   * (Save to Files, Drive, email, AirDrop...).
   */
  async download(): Promise<string> {
    const fileName = `gstdesk-backup-${todayIso()}.json`;
    const json = JSON.stringify(this.build(), null, 2);
    if (this.native) {
      const { uri } = await this.filesystem.writeFile({
        path: fileName,
        data: json,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await this.share.share({ title: 'GSTDesk backup', url: uri, dialogTitle: 'Save your backup' });
      return fileName;
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = this.document.createElement('a');
    link.href = url;
    link.download = fileName;
    this.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return fileName;
  }

  /** Replaces everything with the contents of a backup. Older India-only backups are upgraded. */
  async restore(text: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('This file is not valid JSON.');
    }
    const backup = migrateBackup(parsed);
    await this.businessService.replace(backup.business);
    await this.customerService.replaceAll(backup.customers);
    await this.invoiceService.replaceAll(backup.invoices);
    await this.storage.set(StorageKey.Seeded, true);
  }
}
