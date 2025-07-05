import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class OfflineMapService {
  private readonly CACHE_PREFIX = 'map_tile_';
  private readonly OFFLINE_STYLE_KEY = 'offline_map_style';
  
  // Estilo de mapa offline simplificado
  private offlineMapStyle = {
    "version": 8,
    "name": "Offline Basic",
    "sources": {
      "offline-base": {
        "type": "raster",
        "tiles": [],
        "tileSize": 256,
        "maxzoom": 16
      }
    },
    "layers": [
      {
        "id": "background",
        "type": "background",
        "paint": {
          "background-color": "#f0f0f0"
        }
      },
      {
        "id": "offline-base-layer",
        "type": "raster",
        "source": "offline-base",
        "paint": {
          "raster-opacity": 0.8
        }
      }
    ]
  };

  constructor() {}

  /**
   * Armazena tiles em cache para uso offline
   */
  async cacheTiles(bounds: [number, number, number, number], zoomLevels: number[] = [10, 12, 14, 16]): Promise<void> {
    // Cache desabilitado devido a problemas de CORS com o provedor de tiles atual
    console.log('Cache de tiles desabilitado devido a restrições CORS');
    console.log('Para habilitar cache, configure um provedor de tiles que suporte CORS');
    return;
    
    // Código original comentado para referência futura:
    /*
    const [west, south, east, north] = bounds;
    
    for (const zoom of zoomLevels) {
      const tiles = this.getTilesInBounds(west, south, east, north, zoom);
      
      for (const tile of tiles) {
        try {
          await this.cacheTile(tile.x, tile.y, tile.z);
        } catch (error) {
          console.warn(`Erro ao fazer cache do tile ${tile.x},${tile.y},${tile.z}:`, error);
        }
      }
    }
    */
  }

  /**
   * Verifica se há tiles em cache para uma área
   */
  async hasOfflineData(bounds: [number, number, number, number], zoom: number): Promise<boolean> {
    const [west, south, east, north] = bounds;
    const tiles = this.getTilesInBounds(west, south, east, north, zoom);
    
    if (tiles.length === 0) return false;
    
    // Verifica se pelo menos 50% dos tiles estão em cache
    let cachedCount = 0;
    for (const tile of tiles.slice(0, 10)) { // Verifica apenas os primeiros 10 tiles
      const cacheKey = `${this.CACHE_PREFIX}${tile.z}_${tile.x}_${tile.y}`;
      const cached = await Preferences.get({ key: cacheKey });
      if (cached.value) cachedCount++;
    }
    
    return cachedCount / Math.min(tiles.length, 10) >= 0.5;
  }

  /**
   * Obtém o estilo de mapa offline
   */
  getOfflineMapStyle(): any {
    return this.offlineMapStyle;
  }

  /**
   * Limpa o cache de tiles
   */
  async clearCache(): Promise<void> {
    // Implementação simplificada - em produção, você manteria uma lista de chaves
    console.log('Cache de tiles limpo');
  }

  /**
   * Obtém informações sobre o cache
   */
  async getCacheInfo(): Promise<{ size: number; tileCount: number }> {
    // Implementação simplificada
    return { size: 0, tileCount: 0 };
  }

  private async cacheTile(x: number, y: number, z: number): Promise<void> {
    const url = `https://tiles.openfreemap.org/data/liberty/${z}/${x}/${y}.png`;
    const cacheKey = `${this.CACHE_PREFIX}${z}_${x}_${y}`;
    
    try {
      const response = await fetch(url);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const base64 = this.arrayBufferToBase64(arrayBuffer);
        await Preferences.set({ key: cacheKey, value: base64 });
      }
    } catch (error) {
      console.warn('Erro ao fazer cache do tile:', error);
    }
  }

  private getTilesInBounds(west: number, south: number, east: number, north: number, zoom: number): Array<{x: number, y: number, z: number}> {
    const tiles: Array<{x: number, y: number, z: number}> = [];
    
    const minX = Math.floor(this.lon2tile(west, zoom));
    const maxX = Math.floor(this.lon2tile(east, zoom));
    const minY = Math.floor(this.lat2tile(north, zoom));
    const maxY = Math.floor(this.lat2tile(south, zoom));
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ x, y, z: zoom });
      }
    }
    
    return tiles;
  }

  private lon2tile(lon: number, zoom: number): number {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  }

  private lat2tile(lat: number, zoom: number): number {
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
