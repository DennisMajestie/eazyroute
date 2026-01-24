import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface GeocodingResult {
    name: string;
    displayName: string;
    latitude: number;
    longitude: number;
    type: string;
    area?: string;
}

@Injectable({
    providedIn: 'root'
})
export class GeocodingService {
    private apiUrl = `${environment.apiUrl}/location`;

    constructor(private http: HttpClient) { }

    /**
     * Search for locations using Backend Proxy (which calls Nominatim)
     * Resolve CORS and Rate Limiting issues.
     */
    search(query: string): Observable<GeocodingResult[]> {
        if (!query || query.trim().length < 3) {
            return of([]);
        }

        const url = `${this.apiUrl}/geocode`;
        const payload = { address: query };

        return this.http.post<any>(url, payload).pipe(
            map(res => {
                const results = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
                return results.map((r: any) => ({
                    name: r.name || r.address?.split(',')[0] || 'Result',
                    displayName: r.address || r.name,
                    latitude: r.lat,
                    longitude: r.lng,
                    type: r.type || 'landmark',
                    area: r.area
                }));
            }),
            catchError(error => {
                console.error('[GeocodingService] Proxy Search error:', error);
                return of([]);
            })
        );
    }

    /**
     * Search Place (Alias for consistency)
     */
    searchPlace(query: string): Observable<GeocodingResult[]> {
        return this.search(query);
    }

    /**
     * Reverse geocode - get location name from coordinates via Backend Proxy
     */
    reverseGeocode(latitude: number, longitude: number): Observable<GeocodingResult | null> {
        const url = `${this.apiUrl}/reverse-geocode`;
        const payload = { latitude, longitude };

        return this.http.post<any>(url, payload).pipe(
            map(res => {
                if (!res.success || !res.data) return null;
                const data = res.data;
                return {
                    name: data.address?.split(',')[0] || 'Location',
                    displayName: data.address,
                    latitude: latitude,
                    longitude: longitude,
                    type: data.isLocalAnchor ? 'anchor' : 'landmark',
                    area: ''
                };
            }),
            catchError(error => {
                console.error('[GeocodingService] Proxy Reverse error:', error);
                return of(null);
            })
        );
    }
}
