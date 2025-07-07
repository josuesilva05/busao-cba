import { Component, OnInit, inject } from '@angular/core';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { mail, lockClosed, eye, eyeOff, arrowForward } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { browserLocalPersistence, browserSessionPersistence, setPersistence } from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  showPassword = false;
  isLoading = false;
  rememberMe = false;
  retryCount = 0;
  maxRetries = 3;

  formData = {
    email: '',
    password: ''
  };

  constructor(private router: Router) {
    // Adicionar ícones necessários
    addIcons({
      mail,
      lockClosed,
      eye,
      eyeOff,
      arrowForward
    });
  }

  ngOnInit() {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    // Definir persistência antes do login
    if (!await this.setPersistence()) {
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Entrando...',
      translucent: true
    });

    try {
      await loading.present();
      this.isLoading = true;
      
      await this.authService.login(this.formData.email, this.formData.password);
      
      await loading.dismiss();
      this.showToast('Login realizado com sucesso!', 'success');
      this.clearForm();
      this.router.navigate(['/']);
    } catch (error: any) {
      await loading.dismiss();
      this.handleLoginError(error);
    } finally {
      this.isLoading = false;
    }
  }

  private clearForm(): void {
    this.formData = {
      email: '',
      password: ''
    };
    this.retryCount = 0;
  }

  goToSignup() {
    this.router.navigate(['/criar-conta']);
  }

  forgotPassword() {
    this.router.navigate(['/esqueceu-senha']);
  }

  async resetPassword() {
    if (!this.formData.email) {
      this.showToast('Por favor, insira seu email primeiro', 'warning');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formData.email)) {
      this.showToast('Por favor, insira um email válido', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Enviando email de recuperação...',
      translucent: true
    });

    try {
      await loading.present();
      await this.authService.resetPassword(this.formData.email);
      await loading.dismiss();
      this.showToast('Email de recuperação enviado! Verifique sua caixa de entrada', 'success');
    } catch (error: any) {
      await loading.dismiss();
      this.handleResetPasswordError(error);
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  private validateForm(): boolean {
    if (!this.formData.email || !this.formData.password) {
      this.showToast('Por favor, preencha todos os campos', 'warning');
      return false;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formData.email)) {
      this.showToast('Por favor, insira um email válido', 'warning');
      return false;
    }

    // Validação básica de senha
    if (this.formData.password.length < 6) {
      this.showToast('A senha deve ter pelo menos 6 caracteres', 'warning');
      return false;
    }

    return true;
  }

  private async setPersistence(): Promise<boolean> {
    try {
      const auth = this.authService.getAuthInstance();
      if (this.rememberMe) {
        await setPersistence(auth, browserLocalPersistence);
      } else {
        await setPersistence(auth, browserSessionPersistence);
      }
      return true;
    } catch (e) {
      this.showToast('Erro ao definir persistência de sessão', 'danger');
      return false;
    }
  }

  private handleLoginError(error: any): void {
    let message = 'Ocorreu um erro inesperado';
    let shouldRetry = false;
    
    // Log do erro para debug
    console.error('Login Error:', error);
    
    // Se o erro já foi tratado pelo AuthService, usar a mensagem diretamente
    if (typeof error === 'string') {
      message = error;
    } else if (error?.code) {
      // Tratamento específico para códigos de erro do Firebase
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'Usuário não encontrado. Verifique o email ou crie uma conta';
          break;
        case 'auth/wrong-password':
          message = 'Senha incorreta. Tente novamente';
          break;
        case 'auth/invalid-email':
          message = 'Email inválido. Verifique o formato do email';
          break;
        case 'auth/user-disabled':
          message = 'Esta conta foi desativada. Entre em contato com o suporte';
          break;
        case 'auth/too-many-requests':
          message = 'Muitas tentativas de login. Tente novamente em alguns minutos';
          break;
        case 'auth/network-request-failed':
          message = 'Erro de conexão. Verifique sua internet e tente novamente';
          shouldRetry = true;
          break;
        case 'auth/operation-not-allowed':
          message = 'Método de login não permitido. Entre em contato com o suporte';
          break;
        case 'auth/invalid-credential':
          message = 'Credenciais inválidas. Verifique email e senha';
          break;
        case 'auth/requires-recent-login':
          message = 'Esta operação requer login recente. Faça login novamente';
          break;
        case 'auth/timeout':
          message = 'Tempo limite excedido. Tente novamente';
          shouldRetry = true;
          break;
        default:
          message = 'Erro de autenticação. Tente novamente';
      }
    } else if (error?.message) {
      // Verificar se a mensagem contém um código de erro conhecido
      if (error.message.includes('auth/user-disabled')) {
        message = 'Esta conta foi desativada. Entre em contato com o suporte';
      } else if (error.message.includes('auth/user-not-found')) {
        message = 'Usuário não encontrado. Verifique o email ou crie uma conta';
      } else if (error.message.includes('auth/wrong-password')) {
        message = 'Senha incorreta. Tente novamente';
      } else if (error.message.includes('auth/invalid-email')) {
        message = 'Email inválido. Verifique o formato do email';
      } else if (error.message.includes('auth/too-many-requests')) {
        message = 'Muitas tentativas de login. Tente novamente em alguns minutos';
      } else if (error.message.includes('auth/network-request-failed')) {
        message = 'Erro de conexão. Verifique sua internet e tente novamente';
        shouldRetry = true;
      } else {
        message = 'Erro de autenticação. Tente novamente';
      }
    }

    // Oferecer retry automático para erros de rede
    if (shouldRetry && this.retryCount < this.maxRetries) {
      this.retryCount++;
      message += ` (Tentativa ${this.retryCount}/${this.maxRetries})`;
      this.showToast(message, 'warning');
      
      // Retry após 2 segundos
      setTimeout(() => {
        this.onSubmit();
      }, 2000);
    } else {
      this.retryCount = 0; // Reset retry count
      this.showToast(message, 'danger');
    }
    
    // Log do erro para debug
    console.error('Login Error:', error);
  }

  private handleResetPasswordError(error: any): void {
    let message = 'Erro ao enviar email de recuperação';
    
    // Log do erro para debug
    console.error('Reset Password Error:', error);
    
    if (typeof error === 'string') {
      message = error;
    } else if (error?.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'Nenhuma conta encontrada com este email';
          break;
        case 'auth/invalid-email':
          message = 'Email inválido';
          break;
        case 'auth/too-many-requests':
          message = 'Muitas tentativas. Tente novamente em alguns minutos';
          break;
        case 'auth/network-request-failed':
          message = 'Erro de conexão. Verifique sua internet';
          break;
        default:
          message = 'Erro ao enviar email de recuperação. Tente novamente';
      }
    } else if (error?.message) {
      // Verificar se a mensagem contém um código de erro conhecido
      if (error.message.includes('auth/user-not-found')) {
        message = 'Nenhuma conta encontrada com este email';
      } else if (error.message.includes('auth/invalid-email')) {
        message = 'Email inválido';
      } else if (error.message.includes('auth/too-many-requests')) {
        message = 'Muitas tentativas. Tente novamente em alguns minutos';
      } else if (error.message.includes('auth/network-request-failed')) {
        message = 'Erro de conexão. Verifique sua internet';
      } else {
        message = 'Erro ao enviar email de recuperação. Tente novamente';
      }
    }

    this.showToast(message, 'danger');
  }
}
