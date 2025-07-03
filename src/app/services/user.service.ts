import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserData {
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public userProfile$ = this.userProfileSubject.asObservable();

  constructor() { }

  async getUserProfile(firebaseId: string): Promise<UserProfile> {
    try {
      const response = await this.http.get<UserProfile[] | UserProfile>(`${environment.api}/users/${firebaseId}`).toPromise();
      
      // Se a resposta for um array, pegar o primeiro item
      let profile: UserProfile;
      if (Array.isArray(response)) {
        if (response.length === 0) {
          throw new Error('Usuário não encontrado');
        }
        profile = response[0];
      } else {
        profile = response!;
      }
      
      if (profile) {
        this.userProfileSubject.next(profile);
      }
      return profile;
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      throw error;
    }
  }

  async updateUserProfile(firebaseId: string, userData: UpdateUserData): Promise<UserProfile> {
    try {
      const updatedProfile = await this.http.put<UserProfile>(`${environment.api}/users/${firebaseId}`, userData).toPromise();
      if (updatedProfile) {
        this.userProfileSubject.next(updatedProfile);
      }
      return updatedProfile!;
    } catch (error) {
      console.error('Erro ao atualizar perfil do usuário:', error);
      throw error;
    }
  }

  getCurrentProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  clearProfile(): void {
    this.userProfileSubject.next(null);
  }
}
