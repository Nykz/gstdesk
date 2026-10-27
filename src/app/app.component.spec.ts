import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { provideNativeMocks } from '../testing/native-mocks';
import { AppComponent } from './app.component';
import { SetupFormComponent } from './components/setup-form/setup-form.component';
import { SetupService } from './services/setup/setup.service';

describe('AppComponent', () => {
  const present = vi.fn();
  const create = vi.fn();

  beforeEach(async () => {
    present.mockReset().mockResolvedValue(undefined);
    create.mockReset().mockResolvedValue({ present });
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        ...provideNativeMocks().providers,
        { provide: ModalController, useValue: { create } },
      ],
    }).compileComponents();
  });

  it('renders a split pane with the sidebar menu and the router outlet', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('ion-split-pane')?.getAttribute('contentId') ?? root.querySelector('ion-split-pane')).toBeTruthy();
    expect(root.querySelector('ion-menu app-sidebar')).not.toBeNull();
    expect(root.querySelector('ion-router-outlet#main')).not.toBeNull();
  });

  it('does not show the setup on a returning install', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(create).not.toHaveBeenCalled();
  });

  it('shows the first-run setup, which cannot be dismissed until it is done', async () => {
    await TestBed.inject(SetupService).check();
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(create).toHaveBeenCalledTimes(1);
    const options = create.mock.calls[0][0];
    expect(options.component).toBe(SetupFormComponent);
    expect(options.backdropDismiss).toBe(false);
    expect(await options.canDismiss()).toBe(false);
    expect(present).toHaveBeenCalled();
    await TestBed.inject(SetupService).complete({ name: 'Acme', country: 'US', currency: 'USD' });
    expect(await options.canDismiss()).toBe(true);
  });
});
