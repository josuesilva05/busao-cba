import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';

export interface NearbyPointsResponse {
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

@Injectable({
  providedIn: 'root'
})
export class NearbyPointsService {
  private readonly BASE_URL = 'http://140.238.187.108:3000/api/pontos/byLoc';

  constructor(private http: HttpClient) {}

  async getNearbyPointsCount(radius: number = 500): Promise<number> {
    try {
      // Obter localização atual
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000
      });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Fazer request para API
      const url = `${this.BASE_URL}/${lat}/${lng}/${radius}/count`;
      const response = await this.http.get<NearbyPointsResponse>(url).toPromise();
      
      return response?.total || 0;
    } catch (error) {
      console.error('Erro ao buscar pontos próximos:', error);
      // Retornar um valor padrão em caso de erro
      return 0;
    }
  }

  getNearbyPoints(lat: number, lng: number, radius: number = 500): Observable<NearbyPointsResponse> {
    const url = `${this.BASE_URL}/${lat}/${lng}/${radius}/count`;
    return this.http.get<NearbyPointsResponse>(url);
  }
}
