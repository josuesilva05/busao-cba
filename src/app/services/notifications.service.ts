import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.api;

  constructor() { }

  /**
   * Obtém todas as notificações
   */
  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.baseUrl}/notifications`);
  }

  /**
   * Marca uma notificação como lida
   */
  markAsRead(notificationId: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/notifications/${notificationId}/read`, {});
  }

  /**
   * Marca todas as notificações como lidas
   */
  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/notifications/mark-all-read`, {});
  }

  /**
   * Exclui uma notificação
   */
  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/notifications/${notificationId}`);
  }

  /**
   * Exclui todas as notificações
   */
  deleteAllNotifications(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/notifications`);
  }
}
