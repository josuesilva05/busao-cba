import { Component, OnInit, inject } from '@angular/core';
import { IonicModule, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserService, UserProfile } from '../../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class PerfilComponent  implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private alertController = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private location = inject(Location);
  
  currentUser$ = this.authService.currentUser$;
  userProfile$ = this.userService.userProfile$;
  
  userProfile: UserProfile | null = null;
  editMode = false;
  
  // Dados para edição
  editData = {
    name: '',
    email: ''
  };

  // Estados dos switches
  notificationsEnabled = true;
  darkModeEnabled = false;
  locationEnabled = true;
  arrivalAlertsEnabled = false;

  constructor() { }

  async ngOnInit() {
    // Carregar dados do usuário quando o componente inicializar
    this.currentUser$.subscribe(async (user) => {
      if (user && user.uid) {
        await this.loadUserProfile(user.uid);
      }
    });
    
    // Também observar mudanças no perfil
    this.userProfile$.subscribe(profile => {
      this.userProfile = profile;
      if (profile) {
        this.editData = {
          name: profile.name,
          email: profile.email
        };
      }
    });
  }

  async loadUserProfile(firebaseId: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Carregando perfil...',
      translucent: true
    });
    await loading.present();

    try {
      await this.userService.getUserProfile(firebaseId);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      this.showToast('Erro ao carregar dados do perfil', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Métodos para lidar com mudanças nos switches
  onNotificationToggle(event: any) {
    this.notificationsEnabled = event.detail.checked;
    console.log('Notificações:', this.notificationsEnabled);
  }

  onDarkModeToggle(event: any) {
    this.darkModeEnabled = event.detail.checked;
    console.log('Modo escuro:', this.darkModeEnabled);
    // Aqui você pode implementar a lógica para alterar o tema
  }

  onLocationToggle(event: any) {
    this.locationEnabled = event.detail.checked;
    console.log('Localização:', this.locationEnabled);
  }

  onArrivalAlertsToggle(event: any) {
    this.arrivalAlertsEnabled = event.detail.checked;
    console.log('Alertas de chegada:', this.arrivalAlertsEnabled);
  }

  // Métodos para edição de perfil
  enableEditMode() {
    this.editMode = true;
  }

  cancelEdit() {
    this.editMode = false;
    // Restaurar dados originais
    if (this.userProfile) {
      this.editData = {
        name: this.userProfile.name,
        email: this.userProfile.email
      };
    }
  }

  async saveProfile() {
    if (!this.editData.name.trim() || !this.editData.email.trim()) {
      this.showToast('Por favor, preencha todos os campos', 'warning');
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.showToast('Usuário não encontrado', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Salvando alterações...',
      translucent: true
    });
    await loading.present();

    try {
      await this.userService.updateUserProfile(user.uid, {
        name: this.editData.name.trim(),
        email: this.editData.email.trim()
      });
      
      this.editMode = false;
      this.showToast('Perfil atualizado com sucesso!', 'success');
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      this.showToast('Erro ao salvar alterações', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Método para confirmar logout
  async confirmLogout() {
    const alert = await this.alertController.create({
      header: '🚪 Sair da conta',
      message: 'Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar o app.',
      cssClass: 'logout-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Logout cancelado');
          }
        },
        {
          text: 'Sim, sair',
          cssClass: 'danger',
          handler: () => {
            this.logout();
          }
        }
      ]
    });

    await alert.present();
  }

  // Método para realizar o logout
  async logout() {
    const loading = await this.loadingCtrl.create({
      message: 'Saindo...',
      translucent: true
    });
    await loading.present();

    try {
      await this.authService.logout();
      await loading.dismiss();
      // O redirecionamento já é feito pelo AuthService
    } catch (error) {
      await loading.dismiss();
      console.error('Erro ao fazer logout:', error);
      this.showToast('Erro ao sair da conta', 'danger');
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  // Método para voltar à página anterior
  goBack() {
    this.location.back();
  }

  // Método para obter URL do avatar usando UI Avatars
  getAvatarUrl(): string {
    if (!this.userProfile?.name) {
      return 'https://ui-avatars.com/api/?name=User&background=random&color=fff&size=128&rounded=true';
    }
    
    const name = encodeURIComponent(this.userProfile.name);
    return `https://ui-avatars.com/api/?name=${name}&background=random&color=fff&size=128&rounded=true&bold=true`;
  }

  // Método para obter URL do mini avatar
  getMiniAvatarUrl(): string {
    if (!this.userProfile?.name) {
      return 'https://ui-avatars.com/api/?name=User&background=random&color=fff&size=128&rounded=true';
    }
    
    const name = encodeURIComponent(this.userProfile.name);
    return `https://ui-avatars.com/api/?name=${name}&background=random&color=fff&size=128&rounded=true&bold=true`;
  }

  // Método para quando o avatar for clicado
  async onAvatarClick() {
    const toast = await this.toastCtrl.create({
      message: 'Avatar gerado automaticamente com base no seu nome',
      duration: 2000,
      position: 'bottom',
      color: 'primary'
    });
    await toast.present();
  }

  // Método para lidar com erro de carregamento de imagem
  onImageError(event: any) {
    console.log('Erro ao carregar imagem do avatar, usando fallback');
    // Usar um fallback local ou uma imagem padrão
    event.target.src = 'https://ui-avatars.com/api/?name=User&background=random&color=fff&size=128&rounded=true';
  }
}
