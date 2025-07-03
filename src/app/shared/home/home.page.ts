import { Component, inject, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { StatusBar } from '@capacitor/status-bar';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService, UserProfile } from '../../services/user.service';

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
export class HomePage implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  
  userProfile: UserProfile | null = null;
  userName = 'Usuário'; // valor padrão
  currentTime = new Date();

  constructor() {
    // garante que o conteúdo seja empurrado para baixo da statusbar
    StatusBar.setOverlaysWebView({ overlay: false });
  }

  async ngOnInit() {
    // Observar mudanças no usuário autenticado
    this.authService.currentUser$.subscribe(async (user) => {
      if (user && user.uid) {
        await this.loadUserProfile(user.uid);
      }
    });

    // Observar mudanças no perfil do usuário
    this.userService.userProfile$.subscribe(profile => {
      this.userProfile = profile;
      if (profile) {
        this.userName = profile.name;
      }
    });

    // Atualizar hora atual
    this.updateCurrentTime();
  }

  private async loadUserProfile(firebaseId: string) {
    try {
      await this.userService.getUserProfile(firebaseId);
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
      // Em caso de erro, mantém o nome padrão
    }
  }

  private updateCurrentTime() {
    this.currentTime = new Date();
  }

  get greeting(): string {
    const hour = this.currentTime.getHours();
    if (hour < 12) {
      return 'Bom dia';
    } else if (hour < 18) {
      return 'Boa tarde';
    } else {
      return 'Boa noite';
    }
  }

  get displayName(): string {
    if (!this.userName || this.userName === 'Usuário') {
      return 'Usuário';
    }
    
    // Retorna apenas o primeiro nome para ficar mais limpo na interface
    const firstName = this.userName.split(' ')[0];
    return firstName;
  }
}
