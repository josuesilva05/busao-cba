import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { IonicModule, Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

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
export class HomePage implements AfterViewInit {
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

  nearbyStops: BusStop[] = [
    { name: 'Terminal Central', distance: 150, status: 'Normal' },
    { name: 'Praça Principal', distance: 300, status: 'Lotado' },
    { name: 'Shopping', distance: 450, status: 'Normal' }
  ];

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

  constructor(private platform: Platform) {
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
