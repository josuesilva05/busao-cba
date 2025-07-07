import { Component, Input, ViewEncapsulation, OnDestroy, OnInit } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { SocketService } from 'src/app/services/socket.service';
import { Subscription, Subject } from 'rxjs';
import { ActivatedRoute, Router, NavigationStart } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { IonicModule } from '@ionic/angular';
import { HomePageService } from 'src/app/services/home-page.service';
import { OfflineMapService } from 'src/app/services/offline-map.service';
import { ConnectivityService } from 'src/app/services/connectivity.service';

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
  isLoading: boolean = true;

  private map: maplibregl.Map | null = null;
  private busMarkers = new Map<string, maplibregl.Marker>();
  private dataSubscription: Subscription | null = null;
  private routeSubscription: Subscription | null = null;
  private navigationSubscription: Subscription;
  private connectivitySubscription: Subscription | null = null;
  socketDisconnected: boolean = false;
  isOffline: boolean = false;
  private destroyed$ = new Subject<void>();
  private polylinesSources: string[] = [];
  private cachedBounds: [number, number, number, number] | null = null;
  private mapLoaded = false;
  private pendingUpdates = new Map<string, any>();
  private updateQueue: any[] = [];
  private isProcessingQueue = false;
  hasReceivedData = false;
  polylinesLoaded = false;

  constructor(
    private socketService: SocketService,
    private route: ActivatedRoute,
    private router: Router,
    private homePageService: HomePageService,
    private offlineMapService: OfflineMapService,
    private connectivityService: ConnectivityService
  ) {
    console.log('MapVectorComponent construído - versão otimizada');
    console.log('Cache automático de tiles: DESABILITADO (devido a CORS)');
    console.log('Eventos moveend: DESABILITADOS (otimização de performance)');
    
    this.navigationSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {
      // Limpa recursos quando navegar para fora do componente de mapa
      if (!event.url.includes('line-detail') && !event.url.includes('livebus')) {
        console.log('Navegando para fora do mapa, limpando recursos...');
        this.cleanupResources();
      }
    });
  }

  ngOnInit(): void {
    console.log('MapVectorComponent ngOnInit iniciado');
    
    // Monitora conectividade
    this.connectivitySubscription = this.connectivityService.isOnline$.subscribe(
      isOnline => {
        this.isOffline = !isOnline;
        this.socketDisconnected = !isOnline;
        
        if (!isOnline) {
          console.log('Modo offline ativado');
        } else {
          console.log('Conectividade restaurada');
          this.processUpdateQueue();
        }
      }
    );

    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const paramLineId = params.get('lineId');
      if (paramLineId) {
        this.lineId = paramLineId;
        console.log('LineId recebido:', this.lineId);
        
        // Inicializa imediatamente - o container já está no DOM
        this.initializeMapAndSocket();
      }
    });
  }

  private initializeMapAndSocket(): void {
    // Limpa recursos existentes
    this.cleanupResources();

    // Aguarda um tempo mínimo e inicializa o mapa
    setTimeout(() => {
      this.initMap();
      this.setupSocket();
      // Remover loadPolylines() daqui - será chamado quando o mapa carregar
    }, 50); // Reduzido para 50ms
  }

  private async initMap(): Promise<void> {
    console.log('Iniciando mapa...');
    
    // Aguarda o elemento do mapa estar disponível no DOM
    const mapContainer = await this.waitForMapContainer();
    if (!mapContainer) {
      console.error('Container do mapa não encontrado após timeout');
      // Não tenta novamente aqui para evitar loops infinitos
      return;
    }
    
    try {
      // Simplificado: usa sempre o estilo online para evitar verificações desnecessárias
      const mapStyle = 'https://tiles.openfreemap.org/styles/bright';
      console.log('Usando estilo online (cache desabilitado)');

      this.map = new maplibregl.Map({
        container: 'map',
        style: mapStyle,
        center: [-56.0979, -15.6014],
        zoom: 15,
        maxZoom: 18,
        minZoom: 10,
        hash: false,
        attributionControl: false,
        logoPosition: 'bottom-right'
      });

      console.log('Mapa criado, aguardando carregamento...');

      // Adiciona controles de navegação
      this.map.addControl(new maplibregl.NavigationControl({
        showCompass: false,
        visualizePitch: false
      }), 'bottom-right');
      
      // Adiciona controle de escala
      this.map.addControl(new maplibregl.ScaleControl({
        maxWidth: 80,
        unit: 'metric'
      }), 'bottom-left');

      // Aguarda o mapa carregar completamente
      this.map.on('load', () => {
        console.log('Evento load do mapa disparado');
        this.mapLoaded = true;
        this.onMapLoad();
        this.processUpdateQueue();
      });

      // Evento de erro do mapa
      this.map.on('error', (e) => {
        console.error('Erro no mapa:', e);
      });

      // Evento moveend desabilitado - cache automático não é necessário
      // this.map.on('moveend', () => {
      //   this.cacheBoundsIfNeeded();
      // });

      console.log('Mapa configurado, aguardando evento load...');
    } catch (error) {
      console.error('Erro ao criar mapa:', error);
      // Remove o estado de loading em caso de erro
      this.isLoading = false;
    }
  }

  private onMapLoad(): void {
    // Método chamado quando o mapa é carregado
    console.log('Mapa carregado, carregando polylines...');
    this.mapLoaded = true;
    this.loadPolylines();
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
    // Marca que recebeu dados do socket
    if (!this.hasReceivedData) {
      this.hasReceivedData = true;
      this.checkLoadingComplete();
    }

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
      // Se o mapa não está carregado, adiciona à fila
      if (!this.mapLoaded) {
        this.updateQueue.push(busData);
        return;
      }
      
      // Otimização: agrupa atualizações por ID para evitar updates desnecessários
      const busId = busData.id;
      if (this.pendingUpdates.has(busId)) {
        // Substitui a atualização pendente pela mais recente
        this.pendingUpdates.set(busId, busData);
      } else {
        this.pendingUpdates.set(busId, busData);
        // Processa a atualização com debounce
        setTimeout(() => {
          const latestData = this.pendingUpdates.get(busId);
          if (latestData) {
            this.addOrUpdateMarker(latestData);
            this.pendingUpdates.delete(busId);
          }
        }, 100);
      }
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

    const direction = (bus.sinotico?.sentidoTrajeto || '').toLowerCase();
    const directionClass = direction === 'ida' ? 'direction-ida' : 'direction-volta';

    // Criar elemento HTML do marcador
    const markerElement = document.createElement('div');
    markerElement.className = 'custom-bus-marker';
    markerElement.innerHTML = `
      <div class="marker-container ${bus.ignicao === 0 ? 'off' : 'on'} ${directionClass}">
        <span class="bus-id">${bus.prefixoVeiculo || bus.idVeiculo}</span>
        <div class="marker-arrow"></div>
      </div>
    `;

    // Criar marcador MapLibre GL JS
    const marker = new maplibregl.Marker({
      element: markerElement,
      rotation: bus.orientacaoInt || 0
    })
      .setLngLat([lng, lat])
      .addTo(this.map);

    // Criar popup
    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      closeOnMove: false,
      maxWidth: '300px',
      className: 'bus-popup-container'
    }).setHTML(this.createPopupContent(bus));

    marker.setPopup(popup);

    this.busMarkers.set(id, marker);
  }

  private updateMarker(marker: maplibregl.Marker, lat: number, lng: number, bus: any): void {
    const newPosition: [number, number] = [lng, lat];
    const oldPosition = marker.getLngLat();

    // Animação suave da movimentação
    this.animateMarkerMovement(marker, oldPosition, newPosition, 500);
    marker.setRotation(bus.orientacaoInt || 0);
    marker.getPopup()?.setHTML(this.createPopupContent(bus));
  }

  private animateMarkerMovement(marker: maplibregl.Marker, start: maplibregl.LngLat, end: [number, number], duration: number): void {
    const frames = 60;
    const timeStep = duration / frames;
    let step = 0;

    const animate = () => {
      step++;

      const p = step / frames;
      const lng = start.lng + (end[0] - start.lng) * p;
      const lat = start.lat + (end[1] - start.lat) * p;

      marker.setLngLat([lng, lat]);

      if (step < frames) {
        setTimeout(animate, timeStep);
      }
    };

    animate();
  }

  private createPopupContent(bus: any): string {
    const status = this.getStatusText(bus);
    const statusIcon = bus.panico ? '🚨' : (bus.ignicao === 0 ? '🔴' : '🟢');
    const direction = bus.sinotico?.sentidoTrajeto || 'N/A';
    const directionIcon = direction.toLowerCase() === 'ida' ? '➡️' : '⬅️';
    
    return `
      <div class="bus-popup">
        <div class="popup-header">
          <h3><ion-icon name="bus-outline"></ion-icon> <strong>Carro ${bus.prefixoVeiculo || 'N/A'}</strong></h3>
        </div>
        <div class="popup-content">
          <div class="info-row">
            <span class="label">${directionIcon} <strong>Sentido:</strong></span>
            <span class="value">${bus.sinotico?.nomeTrajeto || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="label">⚡ <strong>Velocidade:</strong></span>
            <span class="value">${bus.velocidadeAtual ?? 0} km/h</span>
          </div>
          <div class="info-row">
            <span class="label">📍 <strong>Próximo à:</strong></span>
            <span class="value">${bus.pontoMaisProximo || 'N/A'}</span>
          </div>
          <div class="info-row status-row">
            <span class="label"><strong>Status:</strong></span>
            <span class="value status-badge ${bus.panico ? 'panic' : (bus.ignicao === 0 ? 'off' : 'on')}">${statusIcon} ${status}</span>
          </div>
        </div>
      </div>
    `;
  }

  private getStatusText(bus: any): string {
    if (bus.panico) return 'EM PÂNICO';
    if (bus.ignicao === 0) return 'DESLIGADO';
    return 'EM OPERAÇÃO';
  }

  private clearMarkers(): void {
    try {
      this.busMarkers.forEach((marker, id) => {
        try {
          // Remove popup se existir
          const popup = marker.getPopup();
          if (popup) {
            popup.remove();
          }
          
          // Remove o marcador
          marker.remove();
        } catch (error) {
          console.warn(`Erro ao remover marcador ${id}:`, error);
        }
      });
      
      // Limpa o mapa de marcadores
      this.busMarkers.clear();
    } catch (error) {
      console.warn('Erro ao limpar marcadores:', error);
    }
  }

  private loadPolylines(): void {
    if (!this.lineId || !this.map) {
      console.warn('Não é possível carregar polylines - lineId ou map não disponível:', { lineId: this.lineId, map: !!this.map });
      return;
    }

    const lineIds = this.lineId.split(',');
    console.log('Carregando polylines para linhas:', lineIds);

    this.homePageService.getPolylinesForMultipleLines(lineIds).subscribe({
      next: (polylines) => {
        console.log('Polylines recebidas:', polylines?.length || 0);
        this.clearPolylines();

        if (!polylines || polylines.length === 0) {
          console.warn('Nenhuma polyline encontrada para as linhas:', lineIds);
          this.polylinesLoaded = true;
          this.checkLoadingComplete();
          return;
        }

        polylines.forEach((polyline: any, index: number) => {
          console.log(`Processando polyline ${index + 1}:`, polyline);
          
          if (polyline.way && polyline.way.type === 'LineString') {
            const wayCoordinates = polyline.way.coordinates;
            const sourceId = `route-${polyline.id || Math.random()}`;
            const layerId = `route-layer-${polyline.id || Math.random()}`;

            console.log(`Adicionando source ${sourceId} com ${wayCoordinates.length} coordenadas`);

            try {
              // Adicionar source
              this.map!.addSource(sourceId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: wayCoordinates
                  }
                }
              });

              // Adicionar layer
              this.map!.addLayer({
                id: layerId,
                type: 'line',
                source: sourceId,
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round'
                },
                paint: {
                  'line-color': polyline.sentido === 'ida' ? '#ff0000' : '#0000ff',
                  'line-width': 3,
                  'line-opacity': 0.7
                }
              });

              this.polylinesSources.push(sourceId);
              this.polylinesSources.push(layerId);
              console.log(`Layer ${layerId} adicionado com sucesso`);
            } catch (error) {
              console.error(`Erro ao adicionar polyline ${sourceId}:`, error);
            }
          } else {
            console.warn('Polyline inválida (não é LineString):', polyline);
          }
        });

        console.log('Total de sources/layers adicionados:', this.polylinesSources.length);
        this.polylinesLoaded = true;
        this.checkLoadingComplete();
        this.animateCameraTo3DBounds();
      },
      error: (err) => {
        console.error('Error loading polylines:', err);
        this.polylinesLoaded = true;
        this.checkLoadingComplete();
      }
    });
  }

  private fitMapToBounds(): void {
    if (!this.map || this.polylinesSources.length === 0) {
      console.warn('Não é possível ajustar bounds - map ou polylines não disponíveis:', { 
        map: !!this.map, 
        polylinesSources: this.polylinesSources.length 
      });
      return;
    }

    console.log('Ajustando bounds do mapa para polylines...');
    
    // Cria um bounds que inclui todas as polylines
    const bounds = new maplibregl.LngLatBounds();
    let coordCount = 0;
    
    // Para cada source, obter os dados e expandir os bounds
    this.polylinesSources.forEach(sourceId => {
      if (sourceId.startsWith('route-') && !sourceId.includes('layer')) {
        try {
          const source = this.map!.getSource(sourceId) as maplibregl.GeoJSONSource;
          if (source && source._data) {
            const data = source._data as any;
            if (data.geometry && data.geometry.coordinates) {
              data.geometry.coordinates.forEach((coord: [number, number]) => {
                bounds.extend(coord);
                coordCount++;
              });
            }
          }
        } catch (error) {
          console.warn(`Erro ao processar source ${sourceId}:`, error);
        }
      }
    });

    console.log(`Processadas ${coordCount} coordenadas para bounds`);

    // Ajusta o mapa para mostrar todas as polylines com um pequeno padding
    if (!bounds.isEmpty()) {
      try {
        this.map.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15
        });
        console.log('Bounds ajustados com sucesso');
      } catch (error) {
        console.error('Erro ao ajustar bounds:', error);
      }
    } else {
      console.warn('Bounds está vazio, não foi possível ajustar o mapa');
    }
  }

  private clearPolylines(): void {
    if (!this.map) {
      console.log('Não é possível limpar polylines - mapa não disponível');
      return;
    }

    console.log('Limpando polylines existentes:', this.polylinesSources.length);

    try {
      this.polylinesSources.forEach(id => {
        try {
          if (id.includes('layer')) {
            // Remove layer
            if (this.map!.getLayer(id)) {
              this.map!.removeLayer(id);
              console.log(`Layer ${id} removido`);
            }
          } else {
            // Remove source
            if (this.map!.getSource(id)) {
              this.map!.removeSource(id);
              console.log(`Source ${id} removido`);
            }
          }
        } catch (error) {
          console.warn(`Erro ao remover polyline ${id}:`, error);
        }
      });

      this.polylinesSources = [];
      console.log('Polylines limpas com sucesso');
    } catch (error) {
      console.warn('Erro ao limpar polylines:', error);
    }
  }

  private cleanupResources(): void {
    // Reset do estado de loading
    this.isLoading = true;
    this.hasReceivedData = false;
    this.polylinesLoaded = false;
    this.mapLoaded = false;
    
    // Limpa polylines primeiro
    this.clearPolylines();
    
    // Limpa marcadores
    this.clearMarkers();

    // Remove o mapa completamente
    if (this.map) {
      try {
        // Remove o mapa e libera todos os recursos
        this.map.remove();
      } catch (error) {
        console.warn('Erro ao remover mapa:', error);
      }
      this.map = null;
    }

    // Cancela subscriptions
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
      this.dataSubscription = null;
    }

    // Limpa o container do mapa
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      mapContainer.innerHTML = '';
      mapContainer.className = 'w-full h-full z-10 opacity-0'; // Mantém classes básicas
    }

    console.log('Recursos limpos, pronto para nova inicialização');
  }

  onBack(): void {
    try {
      // Desconecta o socket primeiro
      this.socketService.disconnect();
      
      // Limpa todos os recursos do mapa
      this.cleanupResources();
      
      // Navega de volta para livebus
      this.router.navigate(['livebus']);
    } catch (error) {
      console.error('Erro ao voltar para livebus:', error);
      // Mesmo com erro, tenta navegar
      this.router.navigate(['livebus']);
    }
  }

  ngOnDestroy(): void {
    try {
      // Desconecta o socket
      this.socketService.disconnect();
      
      // Limpa todos os recursos do mapa
      this.cleanupResources();
      
      // Cancela subscriptions específicas
      if (this.navigationSubscription) {
        this.navigationSubscription.unsubscribe();
      }
      
      if (this.routeSubscription) {
        this.routeSubscription.unsubscribe();
      }

      if (this.connectivitySubscription) {
        this.connectivitySubscription.unsubscribe();
      }
      
      // Limpa filas e cache
      this.updateQueue = [];
      this.pendingUpdates.clear();
      this.cachedBounds = null;
      
      // Emite sinal de destruição
      this.destroyed$.next();
      this.destroyed$.complete();
    } catch (error) {
      console.error('Erro no ngOnDestroy:', error);
    }
  }

  /**
   * Processa a fila de atualizações pendentes
   */
  private processUpdateQueue(): void {
    if (this.isProcessingQueue || this.updateQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    // Processa em batches para não sobrecarregar o UI
    const batchSize = 10;
    const processBatch = () => {
      const batch = this.updateQueue.splice(0, batchSize);
      
      batch.forEach(busData => {
        this.addOrUpdateMarker(busData);
      });
      
      if (this.updateQueue.length > 0) {
        setTimeout(processBatch, 50);
      } else {
        this.isProcessingQueue = false;
      }
    };
    
    processBatch();
  }

  /**
   * Cache de bounds desabilitado - função removida devido a problemas de CORS
   */
  private cacheBoundsIfNeeded(): void {
    // Função desabilitada para evitar tentativas de cache que geram erros CORS
    return;
  }

  /**
   * Verifica se os bounds mudaram significativamente
   * Mantida para compatibilidade futura
   */
  private boundsChanged(oldBounds: [number, number, number, number], newBounds: [number, number, number, number]): boolean {
    const threshold = 0.01; // ~1km
    return Math.abs(oldBounds[0] - newBounds[0]) > threshold ||
           Math.abs(oldBounds[1] - newBounds[1]) > threshold ||
           Math.abs(oldBounds[2] - newBounds[2]) > threshold ||
           Math.abs(oldBounds[3] - newBounds[3]) > threshold;
  }

  /**
   * Método otimizado para criar marcadores com pool de objetos
   */
  private createOptimizedMarker(id: string, lat: number, lng: number, bus: any): void {
    if (!this.map) return;

    const direction = (bus.sinotico?.sentidoTrajeto || '').toLowerCase();
    const directionClass = direction === 'ida' ? 'direction-ida' : 'direction-volta';
    const isOff = bus.ignicao === 0;

    // Usar template mais simples para melhor performance
    const markerElement = document.createElement('div');
    markerElement.className = `custom-bus-marker ${isOff ? 'off' : 'on'} ${directionClass}`;
    markerElement.innerHTML = `<span>${bus.prefixoVeiculo || bus.idVeiculo}</span>`;

    const marker = new maplibregl.Marker({
      element: markerElement,
      rotation: bus.orientacaoInt || 0
    })
      .setLngLat([lng, lat])
      .addTo(this.map);

    // Só adiciona popup se necessário (otimização)
    if (!this.isOffline) {
      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        closeOnMove: false,
        maxWidth: '300px',
        className: 'bus-popup-container'
      }).setHTML(this.createPopupContent(bus));

      marker.setPopup(popup);
    }

    this.busMarkers.set(id, marker);
  }

  /**
   * Verifica se o carregamento está completo e remove o loading
   */
  private checkLoadingComplete(): void {
    if (this.hasReceivedData && this.polylinesLoaded && this.mapLoaded) {
      console.log('Carregamento completo, removendo loading...');
      this.isLoading = false;
    }
  }

  /**
   * Anima a câmera para mostrar todas as polylines com efeito 3D
   */
  private animateCameraTo3DBounds(): void {
    if (!this.map || this.polylinesSources.length === 0) {
      console.warn('Não é possível animar câmera - map ou polylines não disponíveis');
      return;
    }

    console.log('Animando câmera para bounds 3D...');
    
    // Cria bounds que inclui todas as polylines
    const bounds = new maplibregl.LngLatBounds();
    let coordCount = 0;
    
    // Para cada source, obter os dados e expandir os bounds
    this.polylinesSources.forEach(sourceId => {
      if (sourceId.startsWith('route-') && !sourceId.includes('layer')) {
        try {
          const source = this.map!.getSource(sourceId) as maplibregl.GeoJSONSource;
          if (source && source._data) {
            const data = source._data as any;
            if (data.geometry && data.geometry.coordinates) {
              data.geometry.coordinates.forEach((coord: [number, number]) => {
                bounds.extend(coord);
                coordCount++;
              });
            }
          }
        } catch (error) {
          console.warn(`Erro ao processar source ${sourceId}:`, error);
        }
      }
    });

    console.log(`Processadas ${coordCount} coordenadas para animação 3D`);

    if (!bounds.isEmpty()) {
      try {
        // Animação direta para a posição final com efeito 3D
        this.map.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          maxZoom: 15,
          pitch: 50, // Inclinação 3D
          bearing: 0, // Sem rotação
          duration: 2500, // Animação mais longa para efeito suave
          essential: true,
          // Curva de easing mais suave
          easing: (t) => t * (2 - t) // ease-out quad
        });

        console.log('Animação 3D da câmera iniciada diretamente para o destino');
      } catch (error) {
        console.error('Erro ao animar câmera 3D:', error);
        // Fallback para animação simples
        this.fitMapToBounds();
      }
    } else {
      console.warn('Bounds está vazio, usando animação padrão');
      // Animação padrão para Cuiabá com efeito 3D
      this.map.easeTo({
        center: [-56.0979, -15.6014],
        zoom: 12,
        pitch: 45,
        bearing: 0,
        duration: 2000,
        easing: (t) => t * (2 - t)
      });
    }
  }

  /**
   * Aguarda o container do mapa estar disponível no DOM
   */
  private waitForMapContainer(): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
      // Verifica imediatamente se já está disponível
      const container = document.getElementById('map');
      if (container) {
        console.log('Container do mapa encontrado imediatamente');
        resolve(container);
        return;
      }
      
      // Se não estiver disponível, aguarda um pouco e tenta novamente
      let attempts = 0;
      const maxAttempts = 10; // Reduzido para 1 segundo no máximo
      
      const checkContainer = () => {
        const container = document.getElementById('map');
        if (container) {
          console.log('Container do mapa encontrado após', attempts, 'tentativas');
          resolve(container);
          return;
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          console.error('Timeout aguardando container do mapa após', attempts, 'tentativas');
          resolve(null);
          return;
        }
        
        setTimeout(checkContainer, 100);
      };
      
      // Inicia a verificação após um pequeno delay
      setTimeout(checkContainer, 100);
    });
  }
}
