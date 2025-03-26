import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: Socket;
  private readonly url = 'http://144.22.240.151:3000';

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    console.log('[SocketService] Initializing socket connection...');
    this.socket = io(this.url, {
      transports: ['websocket'],
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      autoConnect: false  // Começaremos a conexão manualmente
    });

    // Liga os ouvintes de eventos
    this.socket.on('connect', () => {
      console.log('[SocketService] Connected to server ✅');
    });

    this.socket.on('disconnect', (reason) => {
      console.warn(`[SocketService] Disconnected: ${reason}`);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketService] Connection error:', error.message);
    });

    // Conecta automaticamente quando inicializado
    this.socket.connect();
  }

  // Método para conectar manualmente
  connect(): void {
    if (!this.socket.connected) {
      console.log('[SocketService] Connecting socket...');
      this.socket.connect();
    }
  }

  // Método para desconectar manualmente
  disconnect(): void {
    console.log('[SocketService] Disconnecting socket...');
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
  }

  // Antes de emitir, garante que o socket esteja conectado
  getBusLine(lineId: string): void {
    if (!this.socket.connected) {
      console.log('[SocketService] Socket not connected. Reconnecting...');
      this.connect();
    }
    console.log(`[SocketService] Emitting 'bus_lines' for line ID: ${lineId}`);
    this.socket.emit('bus_lines', lineId);
  }

  onData(): Observable<{ type: string, data: any }> {
    console.log('[SocketService] Listening to data events...');
    return new Observable(observer => {
      const handler = (rawData: [string, any]) => {
        console.debug('[SocketService] Raw data received:', rawData);
        try {
          const [type, payload] = rawData;
          const processedData = {
            type,
            data: type === 'sync' ? payload.data : payload
          };
          observer.next(processedData);
        } catch (error) {
          console.error('[SocketService] Data processing error:', error);
          observer.error(error);
        }
      };

      this.socket.on('data', handler);

      // Limpeza do listener ao completar a observação
      return () => {
        this.socket.off('data', handler);
      };
    });
  }
}
