import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule, Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.css'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule
  ],
})
export class HomePage {

  constructor(private platform: Platform) {
    this.initializeApp();
  }

  async initializeApp() {
    if (this.platform.is('capacitor')) {
      try {
        // Cor de fundo combinando com o header
        await StatusBar.setBackgroundColor({ color: '#1e1e1e' });
        
        // Estilo claro para ícones visíveis (brancos)
        await StatusBar.setStyle({ style: Style.Light });
        
        // Desativa o overlay para conteúdo abaixo da status bar
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch (err) {
        console.error('Erro ao configurar a barra de status', err);
      }
    }
  }
}
