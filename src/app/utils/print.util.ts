const PRINT_ROOT_ID = 'print-root';
const PRINTING_CLASS = 'is-printing';

/**
 * Clones the invoice paper into a #print-root div appended to <body>, marks <html> as printing,
 * opens the print dialog and cleans both up on afterprint.
 * Never hide the page with `body * { visibility: hidden }`: Ionic's shadow-DOM scroller prints blank.
 */
export function printElement(source: HTMLElement, doc: Document = document, win: Window = window): void {
  doc.getElementById(PRINT_ROOT_ID)?.remove();
  const root = doc.createElement('div');
  root.id = PRINT_ROOT_ID;
  root.appendChild(source.cloneNode(true));
  doc.body.appendChild(root);
  doc.documentElement.classList.add(PRINTING_CLASS);

  const cleanup = () => {
    root.remove();
    doc.documentElement.classList.remove(PRINTING_CLASS);
    win.removeEventListener('afterprint', cleanup);
  };
  win.addEventListener('afterprint', cleanup);
  win.print();
}

/** Page rules that make a standalone print document look the same as the A4 paper on screen. */
const PRINT_DOCUMENT_RULES = `
@page { size: A4; margin: 0; }
html, body { position: static !important; overflow: visible !important; height: auto !important; margin: 0; background: #ffffff !important; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`;

/**
 * A complete, self-contained HTML document for the invoice paper: the page's own style sheets are copied in
 * so the native print service (which renders it in a separate web view) needs nothing from the app.
 */
export function buildPrintHtml(source: HTMLElement, title: string, doc: Document = document): string {
  const css = Array.from(doc.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n');
      } catch {
        return ''; // cross-origin sheet: not readable, and the paper does not depend on one
      }
    })
    .join('\n');
  const safeTitle = title.replace(/[<>&"]/g, '');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>${css}\n${PRINT_DOCUMENT_RULES}</style></head><body>${source.outerHTML}</body></html>`;
}
