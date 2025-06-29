import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface PontoResponse {
  total: number;
  pontos: Ponto[];
}

export interface Ponto {
  _id: string;
  id: number;
  name: string;
  latLng: {
    lat: number;
    lng: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PontosService {
  private baseUrl = environment.api;

  constructor(private http: HttpClient) {}

  getPontosByLocation(lat: number, lng: number, radius: number = 500): Observable<PontoResponse> {
    const url = `${this.baseUrl}/pontos/byLoc/${lat}/${lng}/${radius}/count`;
    return this.http.get<PontoResponse>(url);
  }
}
