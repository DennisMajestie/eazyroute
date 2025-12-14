// src/app/core/services/tag-along.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RideSearchParams, TagAlongRide, CreateRideRequest } from '../../models/tag-along.model';

@Injectable({
    providedIn: 'root'
})
export class TagAlongService {
    private apiUrl = `${environment.apiUrl}/tag-along`;

    constructor(private http: HttpClient) { }

    getAvailableRides(params?: RideSearchParams): Observable<{ success: boolean; data: TagAlongRide[]; pagination: any }> {
        let httpParams = new HttpParams();
        if (params?.origin) httpParams = httpParams.set('origin', params.origin);
        if (params?.destination) httpParams = httpParams.set('destination', params.destination);
        if (params?.departureDate) httpParams = httpParams.set('departureDate', params.departureDate);
        if (params?.maxPrice) httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
        if (params?.minSeats) httpParams = httpParams.set('minSeats', params.minSeats.toString());
        if (params?.page) httpParams = httpParams.set('page', params.page.toString());

        return this.http.get<{ success: boolean; data: TagAlongRide[]; pagination: any }>(`${this.apiUrl}`, { params: httpParams });
    }

    createRide(rideData: CreateRideRequest): Observable<{ success: boolean; data: TagAlongRide }> {
        return this.http.post<{ success: boolean; data: TagAlongRide }>(this.apiUrl, rideData);
    }

    getRideById(id: string): Observable<{ success: boolean; data: TagAlongRide }> {
        return this.http.get<{ success: boolean; data: TagAlongRide }>(`${this.apiUrl}/${id}`);
    }

    joinRide(rideId: string, seats: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${rideId}/join`, { seats });
    }

    leaveRide(rideId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${rideId}/leave`, {});
    }
}