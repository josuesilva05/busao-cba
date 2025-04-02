import { Component, Input, ViewEncapsulation, OnDestroy, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.awesome-markers';
import 'leaflet-rotatedmarker';
import { SocketService } from 'src/app/services/socket.service';
import { Subscription, Subject } from 'rxjs';
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
  imports: [
    IonicModule,
    CommonModule
  ]
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
  private destroyed$ = new Subject<void>();

  constructor(
    private socketService: SocketService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.navigationSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {
      if (!event.url.includes('livebus')) {
        this.cleanupResources();
      }
    });
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const paramLineId = params.get('lineId');
      if (paramLineId) {
        this.lineId = paramLineId;
        this.initializeMapAndSocket();
      }
    });
  }

  private initializeMapAndSocket(): void {
    // Limpa recursos existentes
    this.cleanupResources();

    // Inicializa o mapa
    setTimeout(() => {
      this.initMap();
      this.setupSocket();
    }, 100);
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [-15.6014, -56.0979],
      zoom: 15,
      preferCanvas: true
    });

// Usando um tile provider mais confiável (você pode precisar de uma API key)
   // Adiciona controles de zoom em uma posição melhor
   L.control.zoom({
    position: 'bottomright'
  }).addTo(this.map);

  // Usando um tile provider mais confiável (você pode precisar de uma API key)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    minZoom: 3,
    attribution: '',
    subdomains: 'abcd'
  }).addTo(this.map);

  // Adiciona escala
  L.control.scale({
    metric: true,
    imperial: false,
    position: 'bottomleft'
  }).addTo(this.map);

  }

  private setupSocket(): void {
    if (!this.lineId) return;

    // Conecta o socket
    this.socketService.connect();

    // Configura a subscription
    this.dataSubscription = this.socketService.onData()
      .subscribe({
        next: ({ type, data }) => this.handleSocketData(type, data),
        error: (err) => console.error('Socket error:', err)
      });

    // Solicita dados da linha
    this.socketService.getBusLine(this.lineId);
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

    const busIcon = L.divIcon({
      className: 'custom-bus-marker',
      html: `
        <div class="marker-container ${bus.panico ? 'panic' : ''} ${bus.ignicao === 0 ? 'off' : 'on'}">
          <span class="bus-id">${bus.prefixoVeiculo || bus.idVeiculo}</span>
          <div class="marker-arrow"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const marker = L.marker([lat, lng], {
      icon: busIcon,
      rotationAngle: bus.orientacaoInt || 0,
      rotationOrigin: 'center'
    })
    .bindPopup(this.createPopupContent(bus), {
      className: 'custom-popup',
      maxWidth: 300,
      autoPan: true
    })
    .addTo(this.map);

    this.busMarkers.set(id, marker);
  }

  private updateMarker(marker: L.Marker, lat: number, lng: number, bus: any): void {
    const newPosition = new L.LatLng(lat, lng);
    const oldPosition = marker.getLatLng();

    // Animação suave da movimentação
    this.animateMarkerMovement(marker, oldPosition, newPosition, 500);
    marker.setRotationAngle(bus.orientacaoInt || 0);
    marker.setPopupContent(this.createPopupContent(bus));
  }

  private animateMarkerMovement(marker: L.Marker, start: L.LatLng, end: L.LatLng, duration: number): void {
    const frames = 60;
    const timeStep = duration / frames;
    let step = 0;

    const animate = () => {
      step++;

      const p = step / frames;
      const lat = start.lat + (end.lat - start.lat) * p;
      const lng = start.lng + (end.lng - start.lng) * p;

      marker.setLatLng([lat, lng]);

      if (step < frames) {
        setTimeout(animate, timeStep);
      }
    };

    animate();
  }

  private createPopupContent(bus: any): string {
    return `
      <div class="bus-popup">
        <h3><strong>Carro:</strong> ${bus.prefixoVeiculo || 'N/A'}</h3>
        <p><strong>Sentido:</strong> ${bus.sinotico.nomeTrajeto}</p>
        <p><strong>Velocidade:</strong> ${bus.velocidadeAtual ?? 0} km/h</p>
        <p><strong>Próximo à:</strong> ${bus.pontoMaisProximo || 'N/A'}</p>
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

  private cleanupResources(): void {
    // Limpa markers
    this.clearMarkers();

    // Remove mapa
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // Cancela subscriptions
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
      this.dataSubscription = null;
    }
  }

  onBack(): void {
    this.socketService.disconnect();
    this.cleanupResources();
    this.router.navigate(['livebus']);
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
    this.cleanupResources();
    this.navigationSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }
}
