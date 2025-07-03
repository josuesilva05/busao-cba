import { Component, OnInit, inject } from '@angular/core';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { person, mail, lockClosed, eye, eyeOff, checkmarkCircle } from 'ionicons/icons';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-criar-conta',
  templateUrl: './criar-conta.component.html',
  styleUrls: ['./criar-conta.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class CriarContaComponent implements OnInit {
  private authService = inject(AuthService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;

  formData = {
    nome: '',
    email: '',
    telefone: '',
    password: '',
    confirmPassword: ''
  };

  constructor(private router: Router) {
    // Adicionar ícones necessários
    addIcons({
      person,
      mail,
      lockClosed,
      eye,
      eyeOff,
      checkmarkCircle
    });
  }

  ngOnInit() {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit() {
    // Validação básica
    if (!this.formData.nome || !this.formData.email || !this.formData.password || !this.formData.confirmPassword) {
      this.showToast('Por favor, preencha todos os campos obrigatórios', 'warning');
      return;
    }

    if (this.formData.password !== this.formData.confirmPassword) {
      this.showToast('As senhas não coincidem', 'warning');
      return;
    }

    if (this.formData.password.length < 6) {
      this.showToast('A senha deve ter pelo menos 6 caracteres', 'warning');
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formData.email)) {
      this.showToast('Por favor, digite um email válido', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Criando conta...',
      translucent: true
    });
    await loading.present();

    try {
      this.isLoading = true;
      await this.authService.register(this.formData.nome, this.formData.email, this.formData.password);
      await loading.dismiss();
      this.showToast('Conta criada com sucesso!', 'success');
      this.router.navigate(['/']);
    } catch (error: any) {
      await loading.dismiss();
      this.showToast(error, 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async loginWithGoogle() {
    const loading = await this.loadingCtrl.create({
      message: 'Conectando com Google...',
      translucent: true
    });
    await loading.present();

    try {
      await this.authService.loginWithGoogle();
      await loading.dismiss();
      this.showToast('Conta criada com sucesso!', 'success');
      this.router.navigate(['/']);
    } catch (error: any) {
      await loading.dismiss();
      this.showToast(error, 'danger');
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
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
