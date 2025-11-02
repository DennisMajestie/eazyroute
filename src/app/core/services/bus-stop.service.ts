
import { BusStop, CreateBusStopRequest } from "../../models/bus-stop.model";
// src/app/core/services/bus-stop.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class BusStopService {
  private apiUrl = `${environment.apiUrl}/bus-stops`;

  constructor(private http: HttpClient) { }

  getAllStops(): Observable<BusStop[]> {
    return this.http.get<BusStop[]>(this.apiUrl);
  }

  getNearbyStops(lat: number, lng: number, radius: number = 1000): Observable<BusStop[]> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lng', lng.toString())
      .set('radius', radius.toString());

    return this.http.get<BusStop[]>(`${this.apiUrl}/nearby`, { params });
  }

  searchStops(query: string): Observable<BusStop[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<BusStop[]>(`${this.apiUrl}/search`, { params });
  }

  addStop(stopData: CreateBusStopRequest): Observable<BusStop> {
    return this.http.post<BusStop>(this.apiUrl, stopData);
  }

  verifyStop(stopId: number): Observable<BusStop> {
    return this.http.patch<BusStop>(`${this.apiUrl}/${stopId}/verify`, {});
  }
}