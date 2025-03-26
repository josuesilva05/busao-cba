import { Component, Input, ViewEncapsulation, OnDestroy, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-rotatedmarker';
import { SocketService } from 'src/app/services/socket.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router, NavigationStart } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-map-vector',
  templateUrl: './map-vector.component.html',
  styleUrls: ['./map-vector.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class MapVectorComponent implements OnInit, OnDestroy {
  @Input() lineId!: string;
  showMap: boolean = true;

  private map: L.Map | null = null;
  private busMarkers = new Map<string, L.Marker>();
  private dataSubscription: Subscription | null = null;
  private routeSubscription: Subscription | null = null;
  private navigationSubscription: Subscription;
  socketDisconnected: boolean = false;

  constructor(
    private socketService: SocketService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.navigationSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {
      if (!event.url.includes('livebus')) {
        this.cleanupMap();
      }
    });
  }

  ngOnInit(): void {
    this.initMapWrapper();
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const paramLineId = params.get('lineId');
      if (paramLineId) {
        this.lineId = paramLineId;
        this.setupSocket();
      }
    });
  }

  private initMapWrapper(): void {
    if (!this.map && this.showMap) {
      setTimeout(() => {
        if (!this.map) {
          this.initMap();
        }
      }, 50);
    }
  }

  private initMap(): void {
    if (this.map) return;

    this.map = L.map('map', {
      center: [-15.6014, -56.0979],
      zoom: 15,
      preferCanvas: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  private setupSocket(): void {
    if (!this.lineId) return;

    this.socketService.connect()
    this.socketService.getBusLine(this.lineId);

    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }

    this.dataSubscription = this.socketService.onData().subscribe({
      next: ({ type, data }) => this.handleSocketData(type, data),
      error: err => console.error('Socket error:', err)
    });
  }

  private handleSocketData(type: string, data: any): void {
    switch (type) {
      case 'sync':
        this.handleSync(data);
        break;
      case 'update':
      case 'insert':
        this.handleUpdate(data);
        break;
      default:
        console.warn('Unknown event type:', type);
    }
  }

  private handleSync(data: any[]): void {
    this.clearMarkers();
    if (Array.isArray(data)) {
      data.forEach(bus => this.addOrUpdateMarker(bus));
    }
  }

  private handleUpdate(busData: any): void {
    if (busData && typeof busData === 'object') {
      this.addOrUpdateMarker(busData);
    }
  }

  private addOrUpdateMarker(bus: any): void {
    if (!bus?.gps?.coordinates) return;

    const [lng, lat] = bus.gps.coordinates;
    const markerId = bus.id;
    const existingMarker = this.busMarkers.get(markerId);

    if (existingMarker) {
      this.updateMarker(existingMarker, lat, lng, bus);
    } else {
      this.createMarker(markerId, lat, lng, bus);
    }
  }

  private createMarker(id: string, lat: number, lng: number, bus: any): void {
    if (!this.map) return;

    const marker = L.marker([lat, lng], {
      icon: this.createBusIcon(bus),
      rotationAngle: bus.orientacaoInt || 0,
      rotationOrigin: 'center'
    })
      .bindPopup(this.createPopupContent(bus))
      .addTo(this.map);

    this.busMarkers.set(id, marker);
  }

  private updateMarker(marker: L.Marker, lat: number, lng: number, bus: any): void {
    marker.setLatLng([lat, lng]);
    marker.setRotationAngle(bus.orientacaoInt || 0);
    marker.setPopupContent(this.createPopupContent(bus));
    marker.setIcon(this.createBusIcon(bus));
  }

  private createBusIcon(bus: any): L.DivIcon {
    const color = bus.panico ? 'red' : (bus.ignicao === 0 ? 'gray' : 'blue');
    return L.divIcon({
      html: `<div class="bus-icon" style="background: ${color}">${bus.prefixoVeiculo || bus.idVeiculo}</div>`,
      className: 'bus-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }

  private createPopupContent(bus: any): string {
    return `
      <div class="bus-popup">
        <h3>Ônibus ${bus.prefixoVeiculo || 'N/A'}</h3>
        <p><strong>Linha:</strong> ${bus.sinotico?.nomeLinha || 'N/A'}</p>
        <p><strong>Velocidade:</strong> ${bus.velocidadeAtual ?? 0} km/h</p>
        <p><strong>Última atualização:</strong> ${bus.dataTransmissaoS || 'N/A'}</p>
        <p><strong>Status:</strong> ${this.getStatusText(bus)}</p>
      </div>
    `;
  }

  private getStatusText(bus: any): string {
    return bus.panico ? '🚨 EM PÂNICO' : (bus.ignicao === 0 ? '🔴 DESLIGADO' : '🟢 EM OPERAÇÃO');
  }

  private clearMarkers(): void {
    this.busMarkers.forEach(marker => marker.remove());
    this.busMarkers.clear();
  }

  private cleanupMap(): void {
    this.clearMarkers();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.socketService.disconnect();
  }

  ngOnDestroy(): void {
    this.cleanupMap();
    this.navigationSubscription.unsubscribe();
    this.routeSubscription?.unsubscribe();
    this.dataSubscription?.unsubscribe();
  }

  onBack(): void {
    this.router.navigate(['livebus']);
  }
}
