import { TestBed } from '@angular/core/testing';
import { AlertController, ToastController } from '@ionic/angular';
import { NotifyService } from './notify.service';

describe('NotifyService', () => {
  const present = vi.fn();
  const toastCreate = vi.fn();
  const alertCreate = vi.fn();
  let dismissRole = 'cancel';

  beforeEach(() => {
    present.mockClear();
    toastCreate.mockReset().mockResolvedValue({ present });
    alertCreate.mockReset().mockImplementation(async () => ({
      present,
      onDidDismiss: async () => ({ role: dismissRole }),
    }));
    TestBed.configureTestingModule({
      providers: [
        { provide: ToastController, useValue: { create: toastCreate } },
        { provide: AlertController, useValue: { create: alertCreate } },
      ],
    });
  });

  it('shows a coloured toast', async () => {
    await TestBed.inject(NotifyService).toast('Saved', 'success');
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: 'Saved', color: 'success' }));
    expect(present).toHaveBeenCalled();
  });

  it('confirm resolves true only on the confirm role', async () => {
    const service = TestBed.inject(NotifyService);
    dismissRole = 'confirm';
    expect(await service.confirm('Delete?', 'Sure?')).toBe(true);
    dismissRole = 'cancel';
    expect(await service.confirm('Delete?', 'Sure?')).toBe(false);
    dismissRole = 'backdrop';
    expect(await service.confirm('Delete?', 'Sure?')).toBe(false);
  });
});
