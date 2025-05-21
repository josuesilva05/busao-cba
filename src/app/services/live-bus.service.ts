import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Lines } from '../models/lines.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root' // Isso faz com que o Angular forneça esse serviço globalmente
})
export class LiveBusService {
  constructor(private http: HttpClient) {}

  getLinesMenu(): Observable<Lines[]> {
    return this.http.get<Lines[]>(`http://137.131.229.1:3000/api/linha/listAll`);
  }
}
