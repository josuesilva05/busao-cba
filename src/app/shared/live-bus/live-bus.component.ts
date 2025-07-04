import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { LiveBusService } from 'src/app/services/live-bus.service';
import { Router, ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { StatusBar } from '@capacitor/status-bar';
import { Location } from '@angular/common';

@Component({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule
  ],
  standalone: true,
  selector: 'app-live-bus',
  templateUrl: './live-bus.component.html',
  styleUrls: ['./live-bus.component.scss'],
})

export class LiveBusComponent implements OnInit, AfterViewInit {

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private route = inject(ActivatedRoute);
  private liveBusService = inject(LiveBusService);
  private router = inject(Router); // Injeta o Router
  private location = inject(Location);

  searchTerm: string = '';
  lineData: any[] = []; // Inicializa como um array
  lineId!: string;
  lineName!: string;
  isLoading: boolean = true;
  selectedLines: string[] = [];
  showCheckboxes: boolean = false;
  private longPressTimeout: any;
  private isScrolling: boolean = false;
  private scrollTimeout: any;
  private touchStartY: number = 0;
  private readonly SCROLL_THRESHOLD = 10; // pixels de movimento para considerar como scroll

    constructor() {
    // garante que o conteúdo seja empurrado para baixo da statusbar
    StatusBar.setOverlaysWebView({ overlay: false });
  }

  ngOnInit() {
    this.isLoading = true;
    this.liveBusService.getLinesMenu().subscribe({
      next: (data) => {
        this.lineData = data.map((line: any) => {
          const parts = line.nome_linha.split(' - ');
          return {
            id: line.id,
            name: parts.slice(1).join(' - ').trim(),
            prefix: parts[0],
          };
        });
      },
      error: (error) => {
        console.error('Error fetching lines:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe(params => {
      if (params['focus'] === 'search' && this.searchInput) {
        setTimeout(() => this.searchInput.nativeElement.focus());
      }
    });
  }

  // Método para navegar para outro componente
  navigateToLineDetail(lineId: string, lineName: string) {
    // Só navega se não estiver em modo de seleção
    if (!this.showCheckboxes) {
      this.router.navigate(['/line-detail', lineId], {
        state: { lineName: lineName }
      });
    } else {
      // Se estiver em modo de seleção, seleciona o item
      this.toggleLineSelection(null, lineId, lineName);
    }
  }

  toggleLineSelection(event: Event | null, lineId: string, lineName: string) {
    if (event) {
      event.stopPropagation();
    }

    const index = this.selectedLines.indexOf(lineId);
    if (index === -1) {
      this.selectedLines.push(lineId);
    } else {
      this.selectedLines.splice(index, 1);
    }

    // Remove o modo de seleção se não houver mais itens selecionados
    if (this.selectedLines.length === 0) {
      this.showCheckboxes = false;
    }
  }

  isSelected(lineId: string): boolean {
    return this.selectedLines.includes(lineId);
  }

  navigateWithSelectedLines() {
    if (this.selectedLines.length === 0) return;

    const lineIds = this.selectedLines.join(',');
    const selectedLineNames = this.lineData
      .filter(line => this.selectedLines.includes(line.id))
      .map(line => line.name)
      .join(' | ');

    this.router.navigate(['/line-detail', lineIds], {
      state: { lineName: selectedLineNames }
    });
  }

  clearSelection() {
    this.selectedLines = [];
    this.showCheckboxes = false;
  }

  filteredLines() {
    if (!this.searchTerm) {
      return this.lineData;
    }
    return this.lineData.filter(line =>
      line.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      line.prefix.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  onScroll(event: any) {
    clearTimeout(this.longPressTimeout);
    this.isScrolling = true;

    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
    }, 150); // Aguarda 150ms após o último evento de scroll
  }

  onTouchStart(event: TouchEvent, lineId: string, lineName: string) {
    this.touchStartY = event.touches[0].clientY;

    this.longPressTimeout = setTimeout(() => {
      // Só ativa se não estiver scrollando e o toque não se moveu significativamente
      if (!this.isScrolling) {
        this.showCheckboxes = true;
        this.toggleLineSelection(null, lineId, lineName);
      }
    }, 200); // 800ms para long press
  }

  onTouchMove(event: TouchEvent) {
    const touchY = event.touches[0].clientY;
    const deltaY = Math.abs(touchY - this.touchStartY);

    if (deltaY > this.SCROLL_THRESHOLD) {
      clearTimeout(this.longPressTimeout);
    }
  }

  onTouchEnd() {
    clearTimeout(this.longPressTimeout);
  }

  onMouseDown(event: MouseEvent, lineId: string, lineName: string) {
    if (this.isScrolling) return;

    this.longPressTimeout = setTimeout(() => {
      this.showCheckboxes = true;
      this.toggleLineSelection(null, lineId, lineName);
    }, 800);
  }

  onMouseUp() {
    clearTimeout(this.longPressTimeout);
  }

  // Método para voltar à página anterior
  goBack() {
    this.location.back();
  }
}
