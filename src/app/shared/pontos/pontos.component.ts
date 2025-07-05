import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { LoadingController, ToastController, AlertController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { GeolocationService, LocationData } from '../../services/geolocation.service';
import { PontosService, Ponto, PontoResponse } from '../../services/pontos.service';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
});

@Component({
  selector: 'app-pontos',
  templateUrl: './pontos.component.html',
  styleUrls: ['./pontos.component.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    RouterModule,
    HttpClientModule
  ]
})
export class PontosComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  private map: L.Map | undefined;
  private userLocationMarker: L.Marker | undefined;
  private pontosMarkers: L.Marker[] = [];
  private locationSubscription?: Subscription;
  private radiusCircle: L.Circle | undefined;
  private currentTileLayer: L.TileLayer | undefined;

  currentLocation: LocationData | null = null;
  pontos: Ponto[] = [];
  isLoading = false;
  searchRadius = 500;
  totalPontos = 0;
  mapInitialized = false;
  locationInitialized = false;

  constructor(
    private geolocationService: GeolocationService,
    private pontosService: PontosService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.subscribeToLocation();
    this.subscribeToThemeChanges();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeMap();
    }, 500);
  }

  ngOnDestroy() {
    if (this.locationSubscription) {
      this.locationSubscription.unsubscribe();
    }
    this.geolocationService.stopWatching();
    
    if (this.map) {
      // Clean up all layers
      if (this.currentTileLayer) {
        this.map.removeLayer(this.currentTileLayer);
      }
      if (this.userLocationMarker) {
        this.map.removeLayer(this.userLocationMarker);
      }
      if (this.radiusCircle) {
        this.map.removeLayer(this.radiusCircle);
      }
      this.pontosMarkers.forEach(marker => {
        this.map?.removeLayer(marker);
      });
      this.map.remove();
    }
  }

  private subscribeToLocation() {
    this.locationSubscription = this.geolocationService.currentLocation$.subscribe(
      (location) => {
        if (location) {
          this.currentLocation = location;
          this.updateUserLocationOnMap(location);
          this.loadNearbyPontos(location.latitude, location.longitude);
        }
      }
    );
  }

  private subscribeToThemeChanges() {
    // Listen for theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      this.updateMapTheme();
    });
    
    // Listen for manual theme changes (if your app has a theme toggle)
    const observer = new MutationObserver(() => {
      this.updateMapTheme();
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  private async initializeMap() {
    if (this.mapInitialized || !this.mapContainer) {
      return;
    }

    try {
      // Cuiabá center as default
      const defaultLat = -15.601;
      const defaultLng = -56.097;

      this.map = L.map(this.mapContainer.nativeElement, {
        center: [defaultLat, defaultLng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      // Add tile layer with dark mode support
      const isDarkMode = document.body.classList.contains('dark') || 
                        window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      const tileLayerUrl = isDarkMode 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      
      this.currentTileLayer = L.tileLayer(tileLayerUrl, {
        maxZoom: 19,
        attribution: ''
      }).addTo(this.map);

      // Add zoom control with custom position
      L.control.zoom({
        position: 'bottomright'
      }).addTo(this.map);

      this.mapInitialized = true;

      // Try to get current location only if not initialized before
      if (!this.locationInitialized) {
        await this.getCurrentLocation();
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  async getCurrentLocation() {
    const loading = await this.loadingController.create({
      message: 'Obtendo sua localização...',
      spinner: 'circular'
    });

    try {
      await loading.present();

      // Request permissions first
      const hasPermission = await this.geolocationService.requestPermissions();
      
      if (!hasPermission) {
        await this.showLocationPermissionAlert();
        return;
      }

      // Get current position
      const location = await this.geolocationService.getCurrentPosition();
      
      if (location && this.map) {
        this.map.setView([location.latitude, location.longitude], 16);
      }

      // Start watching location
      await this.geolocationService.startWatching();

      // Mark location as initialized
      this.locationInitialized = true;

    } catch (error) {
      console.error('Error getting location:', error);
      await this.showToast('Erro ao obter localização. Usando localização padrão.', 'warning');
    } finally {
      await loading.dismiss();
    }
  }

  private updateUserLocationOnMap(location: LocationData) {
    if (!this.map) return;

    const isDarkMode = document.body.classList.contains('dark') || 
                      window.matchMedia('(prefers-color-scheme: dark)').matches;

    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div class="user-marker ${isDarkMode ? 'dark-mode' : ''}">
          <div class="user-marker-inner"></div>
          <div class="user-marker-pulse"></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    if (this.userLocationMarker) {
      this.userLocationMarker.setLatLng([location.latitude, location.longitude]);
    } else {
      this.userLocationMarker = L.marker([location.latitude, location.longitude], { 
        icon: userIcon,
        zIndexOffset: 1000
      }).addTo(this.map);

      this.userLocationMarker.bindPopup(`
        <div class="text-center">
          <strong>Sua localização</strong><br>
          <small>Precisão: ${location.accuracy?.toFixed(0)}m</small>
        </div>
      `);
    }

    // Update or create radius circle
    this.updateRadiusCircle(location);
  }

  private updateRadiusCircle(location: LocationData) {
    if (!this.map) return;

    const isDarkMode = document.body.classList.contains('dark') || 
                      window.matchMedia('(prefers-color-scheme: dark)').matches;

    const circleOptions = {
      color: isDarkMode ? '#60a5fa' : '#3b82f6',
      fillColor: isDarkMode ? '#60a5fa' : '#3b82f6',
      fillOpacity: 0.1,
      weight: 2,
      opacity: 0.6
    };

    if (this.radiusCircle) {
      this.radiusCircle.setLatLng([location.latitude, location.longitude]);
      this.radiusCircle.setRadius(this.searchRadius);
      this.radiusCircle.setStyle(circleOptions);
    } else {
      this.radiusCircle = L.circle([location.latitude, location.longitude], {
        radius: this.searchRadius,
        ...circleOptions
      }).addTo(this.map);
    }
  }

  private async loadNearbyPontos(lat: number, lng: number) {
    try {
      this.isLoading = true;
      
      const response = await this.pontosService.getPontosByLocation(lat, lng, this.searchRadius).toPromise();
      
      if (response) {
        this.pontos = response.pontos;
        this.totalPontos = response.total;
        this.updatePontosOnMap();
      }
    } catch (error) {
      console.error('Error loading pontos:', error);
      await this.showToast('Erro ao carregar pontos próximos', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  private updatePontosOnMap() {
    if (!this.map) return;

    // Clear existing markers
    this.pontosMarkers.forEach(marker => {
      this.map?.removeLayer(marker);
    });
    this.pontosMarkers = [];

    const isDarkMode = document.body.classList.contains('dark') || 
                      window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Add new markers
    this.pontos.forEach(ponto => {
      const pontoIcon = L.divIcon({
        className: 'ponto-marker',
        html: `
          <div class="ponto-marker-container ${isDarkMode ? 'dark-mode' : ''}">
            <div class="ponto-marker-icon">
              <ion-icon name="bus"></ion-icon>
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([ponto.latLng.lat, ponto.latLng.lng], { 
        icon: pontoIcon 
      }).addTo(this.map!);

      marker.bindPopup(`
        <div class="ponto-popup">
          <strong>${ponto.name}</strong><br>
          <small>ID: ${ponto.id}</small>
        </div>
      `);

      this.pontosMarkers.push(marker);
    });
  }

  private updateMapTheme() {
    if (!this.map) return;
    
    const isDarkMode = document.body.classList.contains('dark') || 
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Update tile layer
    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }
    
    const tileLayerUrl = isDarkMode 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    
    this.currentTileLayer = L.tileLayer(tileLayerUrl, {
      maxZoom: 19,
      attribution: ''
    }).addTo(this.map);
    
    // Update markers
    if (this.currentLocation) {
      this.updateUserLocationOnMap(this.currentLocation);
    }
    this.updatePontosOnMap();
  }

  async changeRadius(newRadius: number) {
    this.searchRadius = newRadius;
    
    // Update radius circle
    if (this.currentLocation) {
      this.updateRadiusCircle(this.currentLocation);
      await this.loadNearbyPontos(this.currentLocation.latitude, this.currentLocation.longitude);
    }
  }

  async refreshLocation() {
    await this.getCurrentLocation();
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    toast.present();
  }

  private async showLocationPermissionAlert() {
    const alert = await this.alertController.create({
      header: 'Permissão de Localização',
      message: 'Para mostrar pontos próximos, precisamos acessar sua localização. Por favor, ative a permissão nas configurações do app.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Configurações',
          handler: () => {
            // Open app settings (platform specific)
          }
        }
      ]
    });

    await alert.present();
  }
}
