import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class ItinerariosService {
    constructor(private http: HttpClient) { }

    getItnerarios(line_id: string) {
        return this.http.get(`http://137.131.229.1:3000/api/linha/${line_id}/horarios`);
    }
}