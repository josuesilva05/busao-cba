import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { environment } from 'src/environments/environment';

interface Linha {
  nome_linha: string;
  id: string;
}

interface Horario {
  linha: string;
  id_base: string;
  ida: string[];
  volta: string[];
}

@Component({
  selector: 'app-horarios',
  templateUrl: './horarios.component.html',
  styleUrls: ['./horarios.component.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule
  ]
})
export class HorariosComponent implements OnInit {
  linhas: Linha[] = [];
  linhaSelecionada: Linha | null = null;
  horarios: Horario | null = null;
  isLoading = false;
  searchTerm = '';
  selectedDirection: 'ida' | 'volta' = 'ida';

  constructor(private http: HttpClient, private location: Location) { }

  ngOnInit() {
    this.carregarLinhas();
  }

  carregarLinhas() {
    this.isLoading = true;
    this.http.get<Linha[]>(`${environment.api}/linha/listAll`).subscribe({
      next: (data) => {
        this.linhas = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar linhas:', error);
        this.isLoading = false;
      }
    });
  }

  selecionarLinha(linha: Linha) {
    this.linhaSelecionada = linha;
    this.carregarHorarios(linha.id);
  }

  carregarHorarios(id: string) {
    this.isLoading = true;
    this.http.get<Horario>(`${environment.api}/itinerarios/${id}`).subscribe({
      next: (data) => {
        this.horarios = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar horários:', error);
        this.isLoading = false;
      }
    });
  }

  voltarParaLinhas() {
    this.linhaSelecionada = null;
    this.horarios = null;
  }

  get linhasFiltradas() {
    if (!this.searchTerm) return this.linhas;
    return this.linhas.filter(linha => 
      linha.nome_linha.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  getNextDeparture(horarios: string[]): string | null {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    for (const horario of horarios) {
      if (horario > currentTime) {
        return horario;
      }
    }
    
    return null;
  }

  isNextDeparture(horario: string, horarios: string[]): boolean {
    return horario === this.getNextDeparture(horarios);
  }

  calculateInterval(): number {
    if (!this.horarios) return 0;
    
    const horarios = this.selectedDirection === 'ida' ? this.horarios.ida : this.horarios.volta;
    if (horarios.length < 2) return 0;
    
    let totalMinutes = 0;
    let intervals = 0;
    
    for (let i = 1; i < horarios.length; i++) {
      const prev = this.timeToMinutes(horarios[i - 1]);
      const current = this.timeToMinutes(horarios[i]);
      
      if (current > prev) {
        totalMinutes += current - prev;
        intervals++;
      }
    }
    
    return intervals > 0 ? Math.round(totalMinutes / intervals) : 0;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  trackByLinha(index: number, linha: Linha): string {
    return linha.id;
  }

  trackByHorario(index: number, horario: string): string {
    return horario;
  }

  // Método para voltar à página anterior
  goBack() {
    this.location.back();
  }
}
