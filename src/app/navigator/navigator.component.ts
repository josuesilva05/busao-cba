import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MapStateService } from 'src/app/services/map-state.service';
import { IonTabs, IonTabButton } from "@ionic/angular/standalone";
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-navigator',
  templateUrl: './navigator.component.html',
  styleUrls: ['./navigator.component.scss'],
  imports: [
    IonicModule,
    RouterModule
  ],
})
export class NavigatorComponent {

  constructor(
    private router: Router,
    private mapStateService: MapStateService
  ) { }

  /**
   * Ao clicar em "Live Bus", se houver um mapa ativo (rota registrada), navega para ele;
   * caso contrário, navega para a seleção de linhas (/livebus).
   */
  goToLiveBus() {
      this.router.navigate(['/livebus']);

  }
}
