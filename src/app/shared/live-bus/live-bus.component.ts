import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { LiveBusService } from 'src/app/services/live-bus.service';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

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

export class LiveBusComponent implements OnInit {

  searchTerm: string = '';
  lineData: any[] = []; // Inicializa como um array
  lineId!: string;
  lineName!: string;
  isLoading: boolean = true;

  private liveBusService = inject(LiveBusService);
  private router = inject(Router); // Injeta o Router

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

  // Método para navegar para outro componente
  navigateToLineDetail(lineId: string, lineName: string) {
    console.log("Navigating with ID:", lineId, "and Name:", lineName); // Debug

    this.router.navigate(['/line-detail', lineId], {
      state: { lineName: lineName }
    });
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

}
