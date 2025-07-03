import { Component, OnInit, inject } from '@angular/core';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-esqueceu-senha',
  templateUrl: './esqueceu-senha.component.html',
  styleUrls: ['./esqueceu-senha.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class EsqueceuSenhaComponent implements OnInit {
  private authService = inject(AuthService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  email = '';
  emailSent = false;
  isLoading = false;

  constructor(private router: Router) { }

  ngOnInit() {}

  async onSubmit() {
    if (!this.email) {
      this.showToast('Email é obrigatório', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Enviando email...',
      translucent: true
    });
    await loading.present();

    try {
      this.isLoading = true;
      await this.authService.resetPassword(this.email);
      await loading.dismiss();
      this.emailSent = true;
      this.showToast('Email de recuperação enviado!', 'success');
    } catch (error: any) {
      await loading.dismiss();
      this.showToast(error, 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  async resendEmail() {
    this.emailSent = false;
    await this.onSubmit();
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
}
