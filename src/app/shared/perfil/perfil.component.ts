import { Component, OnInit } from '@angular/core';
import { IonicModule, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class PerfilComponent  implements OnInit {

  // Estados dos switches
  notificationsEnabled = true;
  darkModeEnabled = false;
  locationEnabled = true;
  arrivalAlertsEnabled = false;

  constructor(private alertController: AlertController) { }

  ngOnInit() {}

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
  logout() {
    console.log('Usuário deslogado');
    // Aqui você pode implementar a lógica de logout:
    // - Limpar dados do usuário do storage
    // - Redirecionar para tela de login
    // - Limpar tokens de autenticação
    // Exemplo: this.router.navigate(['/login']);
  }

}
