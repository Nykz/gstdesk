import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { IonApp, IonMenu, IonRouterOutlet, IonSplitPane, ModalController } from '@ionic/angular';
import { SetupFormComponent } from './components/setup-form/setup-form.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { SetupService } from './services/setup/setup.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonApp, IonMenu, IonRouterOutlet, IonSplitPane, SidebarComponent],
})
export class AppComponent {
  private readonly setup = inject(SetupService);
  private readonly modalController = inject(ModalController);

  constructor() {
    effect(() => {
      if (this.setup.needed()) untracked(() => void this.presentSetup());
    });
  }

  /** First launch only. It cannot be dismissed until the business is set up (or sample data chosen). */
  private async presentSetup(): Promise<void> {
    const modal = await this.modalController.create({
      component: SetupFormComponent,
      cssClass: 'setup-modal',
      backdropDismiss: false,
      keyboardClose: false,
      canDismiss: async () => !this.setup.needed(),
    });
    await modal.present();
  }
}
