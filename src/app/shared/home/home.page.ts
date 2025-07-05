import { Component, inject, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { StatusBar } from '@capacitor/status-bar';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService, UserProfile } from '../../services/user.service';
import { StorageService, LineRecord } from '../../services/storage.service';
import { NearbyPointsService } from '../../services/nearby-points.service';

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
  private storageService = inject(StorageService);
  private nearbyPointsService = inject(NearbyPointsService);
  private router = inject(Router);
  
  userProfile: UserProfile | null = null;
  userName = 'Usuário'; // valor padrão
  currentTime = new Date();
  recentLines: LineRecord[] = [];
  nearbyPointsCount = 0;
  nearbyPointsError = false;

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

    // Carregar dados das linhas
    await this.loadLinesData();
    
    // Atualizar hora atual
    this.updateCurrentTime();
  }

  async loadLinesData() {
    try {
      this.recentLines = await this.storageService.getRecentLines(3);
      
      // Buscar pontos próximos com fallback
      try {
        this.nearbyPointsError = false;
        this.nearbyPointsCount = await this.nearbyPointsService.getNearbyPointsCount();
      } catch (locationError) {
        console.log('Não foi possível obter localização, usando valor padrão');
        this.nearbyPointsError = true;
        this.nearbyPointsCount = 0;
      }
    } catch (error) {
      console.error('Erro ao carregar dados das linhas:', error);
    }
  }

  async ionViewWillEnter() {
    // Recarregar dados quando a página for exibida
    await this.loadLinesData();
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

  navigateToLineDetail(lineId: string, lineName: string) {
    this.router.navigate(['/line-detail', lineId], {
      state: { lineName: lineName }
    });
  }

  async retryNearbyPoints() {
    try {
      this.nearbyPointsError = false;
      this.nearbyPointsCount = await this.nearbyPointsService.getNearbyPointsCount();
    } catch (error) {
      console.error('Erro ao buscar pontos próximos:', error);
      this.nearbyPointsError = true;
      this.nearbyPointsCount = 0;
    }
  }

  // Método para testar o armazenamento (pode ser removido depois)
  async testStorage() {
    try {
      console.log('Testando armazenamento e pontos próximos...');
      
      // Adicionar algumas linhas de teste
      await this.storageService.addOrUpdateLine({
        id: '1',
        name: 'Centro - Jardim das Flores',
        prefix: '101',
        company: 'Viação Teste'
      });

      await this.storageService.addOrUpdateLine({
        id: '2',
        name: 'Aeroporto - Shopping',
        prefix: '205',
        company: 'Transporte Rápido'
      });

      // Recarregar dados (incluindo pontos próximos)
      await this.loadLinesData();
      
      console.log('Dados de teste adicionados com sucesso!');
      console.log('Pontos próximos encontrados:', this.nearbyPointsCount);
    } catch (error) {
      console.error('Erro ao testar armazenamento:', error);
    }
  }
}
