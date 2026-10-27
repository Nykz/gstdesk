import { buildPrintHtml, printElement } from './print.util';

describe('printElement', () => {
  afterEach(() => {
    document.getElementById('print-root')?.remove();
    document.documentElement.classList.remove('is-printing');
  });

  it('clones the paper into #print-root, prints, and cleans up on afterprint', () => {
    const source = document.createElement('article');
    source.textContent = 'Invoice body';
    source.className = 'paper';
    const print = vi.fn();
    const win = Object.assign(new EventTarget(), { print }) as unknown as Window;

    printElement(source, document, win);

    const root = document.getElementById('print-root');
    expect(root).not.toBeNull();
    expect(root?.querySelector('.paper')?.textContent).toBe('Invoice body');
    expect(root?.firstChild).not.toBe(source);
    expect(document.documentElement.classList.contains('is-printing')).toBe(true);
    expect(print).toHaveBeenCalledTimes(1);

    win.dispatchEvent(new Event('afterprint'));
    expect(document.getElementById('print-root')).toBeNull();
    expect(document.documentElement.classList.contains('is-printing')).toBe(false);
  });

  it('replaces a stale #print-root', () => {
    const stale = document.createElement('div');
    stale.id = 'print-root';
    document.body.appendChild(stale);
    const win = Object.assign(new EventTarget(), { print: vi.fn() }) as unknown as Window;
    printElement(document.createElement('div'), document, win);
    expect(document.querySelectorAll('#print-root')).toHaveLength(1);
  });
});

describe('buildPrintHtml', () => {
  it('wraps the paper in a standalone A4 document with the page styles copied in', () => {
    const style = document.createElement('style');
    style.textContent = '.paper { width: 210mm; }';
    document.head.appendChild(style);
    const paper = document.createElement('article');
    paper.className = 'paper';
    paper.textContent = 'Invoice body';
    const html = buildPrintHtml(paper, 'INV-26-27-001');
    style.remove();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>INV-26-27-001</title>');
    expect(html).toContain('width: 210mm');
    expect(html).toContain('size: A4');
    expect(html).toContain('<article class="paper">Invoice body</article>');
  });

  it('keeps markup out of the title', () => {
    expect(buildPrintHtml(document.createElement('div'), '<b>x</b>')).toContain('<title>bx/b</title>');
  });
});
