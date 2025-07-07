import { Component, inject, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { NotificationsService, Notification } from '../../services/notifications.service';

@Component({
  selector: 'app-notificacoes',
  templateUrl: './notificacoes.component.html',
  styleUrls: ['./notificacoes.component.scss'],
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    IonicModule,
  ],
})
export class NotificacoesComponent implements OnInit {
  private location = inject(Location);
  private notificationsService = inject(NotificationsService);
  
  notifications: Notification[] = [];
  loading = true;
  error: string | null = null;

  // Filtros
  selectedFilter = 'all';
  
  constructor() { }

  ngOnInit() {
    this.loadNotifications();
  }

  // Carregar notificações
  loadNotifications() {
    this.loading = true;
    this.error = null;
    
    this.notificationsService.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erro ao carregar notificações';
        this.loading = false;
        console.error('Erro ao carregar notificações:', err);
      }
    });
  }

  // Filtrar notificações
  get filteredNotifications(): Notification[] {
    if (this.selectedFilter === 'all') {
      return this.notifications;
    }
    return this.notifications.filter(notification => 
      notification.type === this.selectedFilter
    );
  }

  // Obter contagem de notificações por tipo
  getNotificationCount(type: string): number {
    if (type === 'all') {
      return this.notifications.length;
    }
    return this.notifications.filter(notification => notification.type === type).length;
  }

  // Marcar todas como lidas
  markAllAsRead() {
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        this.loadNotifications();
      },
      error: (err) => {
        console.error('Erro ao marcar todas como lidas:', err);
      }
    });
  }

  // Limpar todas as notificações
  clearAllNotifications() {
    this.notificationsService.deleteAllNotifications().subscribe({
      next: () => {
        this.notifications = [];
      },
      error: (err) => {
        console.error('Erro ao limpar notificações:', err);
      }
    });
  }

  // Filtrar por tipo
  filterNotifications(type: string) {
    this.selectedFilter = type;
  }

  // Obter ícone baseado no tipo
  getTypeIcon(type: string): string {
    switch (type) {
      case 'warning': return 'warning';
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'info':
      default: return 'information-circle';
    }
  }

  // Obter cor baseada no tipo
  getTypeColor(type: string): string {
    switch (type) {
      case 'warning': return 'orange';
      case 'success': return 'green';
      case 'error': return 'red';
      case 'info':
      default: return 'blue';
    }
  }

  // Formatar data
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'agora';
    if (minutes < 60) return `há ${minutes} min`;
    if (hours < 24) return `há ${hours}h`;
    if (days === 1) return 'ontem';
    return `há ${days} dias`;
  }

  // Método para voltar à página anterior
  goBack() {
    this.location.back();
  }
}
