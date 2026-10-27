import { TestBed } from '@angular/core/testing';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { IS_NATIVE, PRINTER } from '../../tokens/native-plugins.tokens';
import { PrintService } from './print.service';

describe('PrintService', () => {
  afterEach(() => {
    document.getElementById('print-root')?.remove();
    document.documentElement.classList.remove('is-printing');
    vi.restoreAllMocks();
  });

  it('in a browser, prints a clone of the element through #print-root', async () => {
    TestBed.configureTestingModule({ providers: provideNativeMocks().providers });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const paper = document.createElement('article');
    paper.textContent = 'Paper';
    await TestBed.inject(PrintService).print(paper);
    expect(print).toHaveBeenCalledTimes(1);
    expect(document.querySelector('#print-root article')?.textContent).toBe('Paper');
    expect(document.documentElement.classList.contains('is-printing')).toBe(true);
    window.dispatchEvent(new Event('afterprint'));
    expect(document.getElementById('print-root')).toBeNull();
  });

  it('in the Android / iOS app, hands a standalone document to the native print sheet', async () => {
    const printHtml = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        ...provideNativeMocks().providers,
        { provide: IS_NATIVE, useValue: true },
        { provide: PRINTER, useValue: { printHtml } },
      ],
    });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const paper = document.createElement('article');
    paper.textContent = 'Paper';
    await TestBed.inject(PrintService).print(paper, 'INV-1');
    expect(print).not.toHaveBeenCalled();
    expect(printHtml).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'INV-1', html: expect.stringContaining('<article>Paper</article>') }),
    );
  });
});
