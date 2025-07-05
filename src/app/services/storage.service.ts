import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export interface LineRecord {
  id: string;
  name: string;
  prefix: string;
  company?: string;
  accessCount: number;
  lastAccessed: string;
  isFrequent: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_KEY = 'bus_lines_data';
  private isInitialized = false;

  constructor() {
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      if (Capacitor.isNativePlatform()) {
        console.log('Rodando em plataforma nativa');
      } else {
        console.log('Rodando no navegador');
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Erro ao inicializar storage:', error);
      this.isInitialized = true; // Continua mesmo com erro
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initializeStorage();
    }
  }

  async addOrUpdateLine(line: Omit<LineRecord, 'accessCount' | 'lastAccessed' | 'isFrequent'>) {
    try {
      await this.ensureInitialized();
      const existingData = await this.getAllLines();
      const now = new Date().toISOString();
      
      const existingLineIndex = existingData.findIndex(l => l.id === line.id);
      
      if (existingLineIndex !== -1) {
        // Atualizar linha existente
        const existingLine = existingData[existingLineIndex];
        const newCount = existingLine.accessCount + 1;
        const isFrequent = newCount >= 3;
        
        existingData[existingLineIndex] = {
          ...existingLine,
          accessCount: newCount,
          lastAccessed: now,
          isFrequent
        };
      } else {
        // Inserir nova linha
        const newLine: LineRecord = {
          id: line.id,
          name: line.name,
          prefix: line.prefix,
          company: line.company || 'Empresa de Transporte',
          accessCount: 1,
          lastAccessed: now,
          isFrequent: false
        };
        existingData.push(newLine);
      }
      
      await this.saveAllLines(existingData);
      console.log('Linha salva com sucesso:', line.name);
    } catch (error) {
      console.error('Erro ao salvar linha:', error);
    }
  }

  async getFrequentLines(limit: number = 5): Promise<LineRecord[]> {
    try {
      const allLines = await this.getAllLines();
      return allLines
        .filter(line => line.isFrequent)
        .sort((a, b) => {
          // Ordenar por contagem de acesso (desc) e depois por último acesso (desc)
          if (a.accessCount !== b.accessCount) {
            return b.accessCount - a.accessCount;
          }
          return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Erro ao buscar linhas frequentes:', error);
      return [];
    }
  }

  async getRecentLines(limit: number = 10): Promise<LineRecord[]> {
    try {
      const allLines = await this.getAllLines();
      return allLines
        .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Erro ao buscar linhas recentes:', error);
      return [];
    }
  }

  private async getAllLines(): Promise<LineRecord[]> {
    try {
      const { value } = await Preferences.get({ key: this.STORAGE_KEY });
      if (value) {
        return JSON.parse(value);
      }
      return [];
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      return [];
    }
  }

  private async saveAllLines(lines: LineRecord[]): Promise<void> {
    try {
      await Preferences.set({
        key: this.STORAGE_KEY,
        value: JSON.stringify(lines)
      });
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await Preferences.remove({ key: this.STORAGE_KEY });
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
    }
  }

  async closeConnection(): Promise<void> {
    // Não necessário para Preferences
  }
}
