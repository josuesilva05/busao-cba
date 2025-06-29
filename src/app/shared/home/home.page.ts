import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { StatusBar } from '@capacitor/status-bar';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.css'],
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    IonicModule,
  ],
})
export class HomePage {
  constructor() {
    // garante que o conteúdo seja empurrado para baixo da statusbar
    StatusBar.setOverlaysWebView({ overlay: false });
  }
}
