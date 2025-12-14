/**
 * ═══════════════════════════════════════════════════════════════════
 * UPDATED BUS STOP HTTP SERVICE (Using Your Environment)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * File: src/app/core/services/bus-stop-http.service.ts
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

export interface BusStopResponse {
    _id: string;
    name: string;
    location: {
        type: string;
        coordinates: [number, number]; // [longitude, latitude]
    };
    routes: string[];
    verified: boolean;
    activeBuses?: number;
    area?: string;
    landmarks?: string[];
    createdAt?: string;
    updatedAt?: string;
}

@Injectable({
    providedIn: 'root'
})
export class BusStopHttpService {
    // ✅ Using your environment.apiUrl
    private readonly API_URL = `${environment.apiUrl}/bus-stops`;

    constructor(private http: HttpClient) { }

    /**
     * Get nearby bus stops
     */
    getNearbyStops(
        latitude: number,
        longitude: number,
        radius: number = 1000
    ): Observable<ApiResponse<BusStopResponse[]>> {
        const params = new HttpParams()
            .set('latitude', latitude.toString())
            .set('longitude', longitude.toString())
            .set('radius', radius.toString());

        return this.http.get<ApiResponse<BusStopResponse[]>>(
            `${this.API_URL}/nearby`,
            { params }
        );
    }

    /**
     * Get bus stop by ID
     */
    getBusStopById(id: string): Observable<ApiResponse<BusStopResponse>> {
        return this.http.get<ApiResponse<BusStopResponse>>(
            `${this.API_URL}/${id}`
        );
    }

    /**
     * Get all bus stops
     */
    getAllBusStops(): Observable<ApiResponse<BusStopResponse[]>> {
        return this.http.get<ApiResponse<BusStopResponse[]>>(this.API_URL);
    }

    /**
     * Search bus stops
     */
    searchBusStops(query: string): Observable<ApiResponse<BusStopResponse[]>> {
        const params = new HttpParams().set('search', query);
        return this.http.get<ApiResponse<BusStopResponse[]>>(
            `${this.API_URL}/search`,
            { params }
        );
    }

    /**
     * Get bus stops by area
     */
    getBusStopsByArea(area: string): Observable<ApiResponse<BusStopResponse[]>> {
        const params = new HttpParams().set('area', area);
        return this.http.get<ApiResponse<BusStopResponse[]>>(
            `${this.API_URL}/by-area`,
            { params }
        );
    }

    /**
     * Create new bus stop (for crowdsourcing)
     */
    createBusStop(data: {
        name: string;
        latitude: number;
        longitude: number;
        area?: string;
        landmarks?: string[];
    }): Observable<ApiResponse<BusStopResponse>> {
        return this.http.post<ApiResponse<BusStopResponse>>(
            this.API_URL,
            data
        );
    }

    /**
     * Verify bus stop (crowdsourcing)
     */
    verifyBusStop(id: string): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(
            `${this.API_URL}/${id}/verify`,
            {}
        );
    }
}
