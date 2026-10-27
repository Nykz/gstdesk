import { TestBed } from '@angular/core/testing';
import { StorageKey } from '../../enums/storage-key.enum';
import { ThemeMode } from '../../enums/theme-mode.enum';
import { provideNativeMocks } from '../../../testing/native-mocks';
import { STATUS_BAR } from '../../tokens/native-plugins.tokens';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let mocks: ReturnType<typeof provideNativeMocks>;
  let systemListener: ((e: { matches: boolean }) => void) | undefined;
  let systemDark = false;
  const html = document.documentElement;

  beforeEach(() => {
    html.classList.remove('ion-palette-dark');
    systemListener = undefined;
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          get matches() {
            return systemDark;
          },
          addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => (systemListener = fn),
        }) as unknown as MediaQueryList,
    );
    mocks = provideNativeMocks();
    TestBed.configureTestingModule({ providers: mocks.providers });
  });

  afterEach(() => {
    systemDark = false;
    vi.restoreAllMocks();
    html.classList.remove('ion-palette-dark');
  });

  it('defaults to the system mode and follows a light system', async () => {
    const service = TestBed.inject(ThemeService);
    await service.load();
    expect(service.mode()).toBe(ThemeMode.System);
    expect(html.classList.contains('ion-palette-dark')).toBe(false);
  });

  it('follows a dark system and live changes', async () => {
    systemDark = true;
    const service = TestBed.inject(ThemeService);
    await service.load();
    expect(html.classList.contains('ion-palette-dark')).toBe(true);
    systemListener?.({ matches: false });
    expect(html.classList.contains('ion-palette-dark')).toBe(false);
  });

  it('explicit dark and light override the system, and persist', async () => {
    const service = TestBed.inject(ThemeService);
    await service.load();
    await service.setMode(ThemeMode.Dark);
    expect(html.classList.contains('ion-palette-dark')).toBe(true);
    expect(service.isDark()).toBe(true);
    expect(mocks.preferences.store.get(StorageKey.Theme)).toBe('"dark"');
    await service.setMode(ThemeMode.Light);
    expect(html.classList.contains('ion-palette-dark')).toBe(false);
  });

  it('restores the saved mode and ignores junk', async () => {
    mocks.preferences.store.set(StorageKey.Theme, '"dark"');
    const service = TestBed.inject(ThemeService);
    await service.load();
    expect(service.mode()).toBe(ThemeMode.Dark);

    mocks.preferences.store.set(StorageKey.Theme, '"purple"');
    await service.load();
    expect(service.mode()).toBe(ThemeMode.System);
  });

  it('tells the native status bar to use light icons on a dark app and dark icons on a light one', async () => {
    const setStyle = vi.fn().mockResolvedValue(undefined);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [...provideNativeMocks().providers, { provide: STATUS_BAR, useValue: { setStyle } }],
    });
    const service = TestBed.inject(ThemeService);
    await service.load();
    await service.setMode(ThemeMode.Dark);
    expect(setStyle).toHaveBeenLastCalledWith({ style: 'DARK' });
    await service.setMode(ThemeMode.Light);
    expect(setStyle).toHaveBeenLastCalledWith({ style: 'LIGHT' });
  });

  it('ignores a missing status bar (a browser)', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ...provideNativeMocks().providers,
        { provide: STATUS_BAR, useValue: { setStyle: () => Promise.reject(new Error('not implemented')) } },
      ],
    });
    await expect(TestBed.inject(ThemeService).setMode(ThemeMode.Dark)).resolves.toBeUndefined();
  });
});
