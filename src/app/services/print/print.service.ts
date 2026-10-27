import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { IS_NATIVE, PRINTER } from '../../tokens/native-plugins.tokens';
import { buildPrintHtml, printElement } from '../../utils/print.util';

/**
 * Opens the print / save-as-PDF dialog for an invoice. In a browser that is the page's own print dialog; inside
 * the Android and iOS apps the web view cannot print, so the native print sheet is used instead.
 */
@Injectable({ providedIn: 'root' })
export class PrintService {
  private readonly document = inject(DOCUMENT);
  private readonly native = inject(IS_NATIVE);
  private readonly printer = inject(PRINTER);

  async print(source: HTMLElement, name = 'Invoice'): Promise<void> {
    if (this.native) {
      await this.printer.printHtml({ name, html: buildPrintHtml(source, name, this.document) });
      return;
    }
    printElement(source);
  }
}
