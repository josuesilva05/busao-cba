import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: 'root'
})
export class ItinerariosService {
    constructor(private http: HttpClient) { }

    getItnerarios(line_id: string) {
        return this.http.get(`${environment.api}/itnerarios/${line_id}`);
    }
}