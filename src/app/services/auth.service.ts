import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, user, authState, GoogleAuthProvider, signInWithPopup, browserLocalPersistence, browserSessionPersistence, setPersistence } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private http = inject(HttpClient);
  private router = inject(Router);
  private userService = inject(UserService);

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  user$ = user(this.auth);

  constructor() {
    // Monitor authentication state
    authState(this.auth).subscribe(user => {
      this.isAuthenticatedSubject.next(!!user);
      this.currentUserSubject.next(user);
    });
  }

  async login(email: string, password: string): Promise<any> {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      return credential;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async register(name: string, email: string, password: string): Promise<any> {
    try {
      // Criar usuário apenas através da API
      // A API cuidará da criação no Firebase Auth usando Firebase Admin
      const response = await firstValueFrom(
        this.http.post(`${environment.api}/users`, {
          name,
          email,
          password
        })
      );

      // Após criar na API, fazer login com as credenciais
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      return credential;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async loginWithGoogle(): Promise<any> {
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(this.auth, provider);
      
      // Verificar se usuário existe na API e criar se necessário
      if (credential.user) {
        try {
          // Tentar buscar o usuário primeiro
          const userResponse = await firstValueFrom(
            this.http.get(`${environment.api}/users/${credential.user.uid}`)
          );
          
          // Se retornou um array vazio, o usuário não existe
          if (Array.isArray(userResponse) && userResponse.length === 0) {
            throw { status: 404 };
          }
        } catch (getUserError: any) {
          // Se usuário não existe (404), criar na API
          if (getUserError.status === 404) {
            try {
              await firstValueFrom(
                this.http.post(`${environment.api}/users`, {
                  name: credential.user.displayName || 'Usuário Google',
                  email: credential.user.email,
                  password: 'google-auth' // Senha placeholder para login social
                })
              );
            } catch (createError) {
              console.error('Erro ao criar usuário na API:', createError);
              // Para login social, podemos continuar mesmo se falhar na API
            }
          }
        }
      }
      
      return credential;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.userService.clearProfile(); // Limpar dados do perfil
      
      // Garantir que o redirecionamento aconteça
      setTimeout(() => {
        this.router.navigate(['/login'], { replaceUrl: true });
      }, 100);
    } catch (error: any) {
      console.error('Erro no logout:', error);
      // Mesmo com erro, redirecionar para login
      this.router.navigate(['/login'], { replaceUrl: true });
      throw this.handleAuthError(error);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const { sendPasswordResetEmail } = await import('@angular/fire/auth');
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  isLoggedIn(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  public getAuthInstance() {
    return this.auth;
  }

  private handleAuthError(error: any): string {
    let message = 'Ocorreu um erro inesperado';
    
    // Log do erro para debug
    console.error('Auth Error:', error);
    
    // Verificar se é um erro HTTP da API primeiro
    if (error.status) {
      switch (error.status) {
        case 400:
          if (error.error && error.error.message === 'EMAIL_EXISTS') {
            message = 'Este email já possui uma conta. Tente fazer login';
          } else {
            message = 'Dados inválidos. Verifique as informações';
          }
          break;
        case 401:
          message = 'Email ou senha incorretos';
          break;
        case 404:
          message = 'Usuário não encontrado';
          break;
        case 500:
          message = 'Erro interno do servidor. Tente novamente mais tarde';
          break;
        default:
          message = 'Erro de conexão com o servidor';
      }
      return message;
    }
    
    // Erros do Firebase Auth - verificar tanto code quanto message
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'Usuário não encontrado';
          break;
        case 'auth/wrong-password':
          message = 'Senha incorreta';
          break;
        case 'auth/email-already-in-use':
          message = 'Este email já possui uma conta. Tente fazer login';
          break;
        case 'auth/weak-password':
          message = 'A senha deve ter pelo menos 6 caracteres';
          break;
        case 'auth/invalid-email':
          message = 'Email inválido';
          break;
        case 'auth/user-disabled':
          message = 'Esta conta foi desativada. Entre em contato com o suporte';
          break;
        case 'auth/too-many-requests':
          message = 'Muitas tentativas. Tente novamente mais tarde';
          break;
        case 'auth/network-request-failed':
          message = 'Erro de conexão. Verifique sua internet';
          break;
        case 'auth/popup-closed-by-user':
          message = 'Login cancelado pelo usuário';
          break;
        case 'auth/popup-blocked':
          message = 'Pop-up bloqueado. Permita pop-ups para este site';
          break;
        case 'auth/invalid-credential':
          message = 'Credenciais inválidas';
          break;
        case 'auth/operation-not-allowed':
          message = 'Método de login não permitido';
          break;
        case 'auth/account-exists-with-different-credential':
          message = 'Já existe uma conta com este email usando outro método de login';
          break;
        case 'auth/requires-recent-login':
          message = 'Esta operação requer login recente. Faça login novamente';
          break;
        case 'auth/credential-already-in-use':
          message = 'Esta credencial já está em uso por outra conta';
          break;
        case 'auth/timeout':
          message = 'Tempo limite excedido. Tente novamente';
          break;
        default:
          message = 'Erro de autenticação';
      }
    } else if (error.message) {
      // Verificar se a mensagem contém um código de erro conhecido
      if (error.message.includes('auth/user-disabled')) {
        message = 'Esta conta foi desativada. Entre em contato com o suporte';
      } else if (error.message.includes('auth/user-not-found')) {
        message = 'Usuário não encontrado';
      } else if (error.message.includes('auth/wrong-password')) {
        message = 'Senha incorreta';
      } else if (error.message.includes('auth/invalid-email')) {
        message = 'Email inválido';
      } else if (error.message.includes('auth/too-many-requests')) {
        message = 'Muitas tentativas. Tente novamente mais tarde';
      } else if (error.message.includes('auth/network-request-failed')) {
        message = 'Erro de conexão. Verifique sua internet';
      } else {
        message = 'Erro de autenticação';
      }
    }
    
    return message;
  }
}
