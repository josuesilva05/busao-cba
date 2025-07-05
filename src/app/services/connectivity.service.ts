import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ConnectivityService {
  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public isOnline$ = this.isOnlineSubject.asObservable();

  constructor() {
    // Monitora mudanças na conectividade
    fromEvent(window, 'online')
      .pipe(map(() => true))
      .subscribe(status => this.isOnlineSubject.next(status));

    fromEvent(window, 'offline')
      .pipe(map(() => false))
      .subscribe(status => this.isOnlineSubject.next(status));
  }

  /**
   * Verifica se está online
   */
  get isOnline(): boolean {
    return this.isOnlineSubject.value;
  }

  /**
   * Testa conectividade real fazendo uma requisição
   */
  async testConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('https://tiles.openfreemap.org/ping', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const online = response.ok;
      this.isOnlineSubject.next(online);
      return online;
    } catch {
      this.isOnlineSubject.next(false);
      return false;
    }
  }
}
