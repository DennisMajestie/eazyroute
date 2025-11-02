// src/app/core/services/tag-along.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RideSearchParams, TagAlongRide, CreateRideRequest, RideRequest } from '../../models/tag-along.model';

@Injectable({
    providedIn: 'root'
})
export class TagAlongService {
    private apiUrl = `${environment.apiUrl}/tag-along`;
    constructor(private http: HttpClient) { }
    getAvailableRides(params?: RideSearchParams): Observable<TagAlongRide[]> {
        let httpParams = new HttpParams();
        if (params?.startLocation) httpParams = httpParams.set('start', params.startLocation);
        if (params?.endLocation) httpParams = httpParams.set('end', params.endLocation);
        if (params?.date) httpParams = httpParams.set('date', params.date);
        if (params?.maxPrice) httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
        return this.http.get<TagAlongRide[]>(`${this.apiUrl}/available`, { params: httpParams });
    }
    createRide(rideData: CreateRideRequest): Observable<TagAlongRide> {
        return this.http.post<TagAlongRide>(this.apiUrl, rideData);
    }
    getMyRides(type: 'driver' | 'rider'): Observable<TagAlongRide[]> {
        return this.http.get<TagAlongRide[]>(`${this.apiUrl}/my-rides`, { params: { type } as any });
    }
    requestRide(rideId: number, seats: number): Observable<RideRequest> {
        return this.http.post<RideRequest>(`${this.apiUrl}/${rideId}/request`, { seats });
    }
}