import { Component, ViewChild, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { IonicModule, Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { HttpClient } from '@angular/common/http';
import { Geolocation } from '@capacitor/geolocation';

interface Bus {
  number: string;
  route: string;
}

interface BusStop {
  name: string;
  distance: number;
  status: 'Normal' | 'Lotado' | 'Atrasado';
}

interface SystemAlert {
  type: 'info' | 'warning';
  message: string;
  icon: string;
}

interface BusStopResponse {
  total: number;
  pontos: Array<{
    _id: string;
    id: number;
    name: string;
    latLng: {
      lat: number;
      lng: number;
    };
  }>;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.css'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule
  ],
})
export class HomePage implements AfterViewInit, OnInit {
  @ViewChild('busOccupancyChart') private chartRef!: ElementRef;
  private chart!: Chart;

  recentBuses: Bus[] = [
    { number: '608', route: 'PARQUE RESIDENCIAL / CENTRO' },
    { number: '610', route: 'TERMINAL CENTRAL / SHOPPING' },
    { number: '702', route: 'CIRCULAR CENTRO' }
  ];

  greeting: string = 'Bom dia';
  activeRoutes: number = 42;
  avgTime: number = 12;

  nearbyStops: BusStop[] = [];

  systemAlerts: SystemAlert[] = [
    {
      type: 'warning',
      message: 'Linha 608 com atrasos devido ao tráfego',
      icon: 'warning'
    },
    {
      type: 'info',
      message: 'Novo ponto adicionado na sua rota',
      icon: 'information-circle'
    }
  ];

  busOccupancyData = {
    labels: ['Lotado', 'Normal', 'Vazio'],
    datasets: [{
      data: [30, 50, 20],
      backgroundColor: ['#EF4444', '#3B82F6', '#10B981'],
      borderWidth: 0
    }]
  };

  constructor(
    private platform: Platform,
    private http: HttpClient
  ) {
    this.initializeApp();
    this.updateGreeting();
  }

  async initializeApp() {
    if (this.platform.is('capacitor')) {
      try {
        // Cor de fundo combinando com o header
        await StatusBar.setBackgroundColor({ color: '#1e1e1e' });

        // Estilo claro para ícones visíveis (brancos)
        await StatusBar.setStyle({ style: Style.Light });

        // Desativa o overlay para conteúdo abaixo da status bar
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch (err) {
        console.error('Erro ao configurar a barra de status', err);
      }
    }
  }

  private updateGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Bom dia';
    else if (hour < 18) this.greeting = 'Boa tarde';
    else this.greeting = 'Boa noite';
  }

  ngAfterViewInit() {
    this.initChart();
  }

  ngOnInit() {
    this.loadNearbyStops();
  }

  async loadNearbyStops() {
    try {
      const position = await Geolocation.getCurrentPosition();
      const { latitude, longitude } = position.coords;

      const radius = 300; // meters
      const url = `http://137.131.192.41:3000/api/pontos/byLoc/${latitude}/${longitude}/${radius}/count`;

      this.http.get<BusStopResponse>(url).subscribe(response => {
        this.nearbyStops = response.pontos.map(ponto => ({
          name: ponto.name,
          distance: this.calculateDistance(
            latitude,
            longitude,
            ponto.latLng.lat,
            ponto.latLng.lng
          ),
          status: 'Normal'
        }));
      });
    } catch (error) {
      console.error('Error fetching nearby stops:', error);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c); // Distance in meters
  }

  private initChart() {
    Chart.register(...registerables);

    const ctx = this.chartRef.nativeElement.getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: this.busOccupancyData,
      options: {
        responsive: true,
        cutout: '75%',
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }
}
