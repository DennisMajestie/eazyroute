import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class GeocodingService {
    private readonly API_URL = environment.apiUrl;

    constructor(private http: HttpClient) { }

    /**
     * Reverse geocode coordinates to address
     * Now proxied through backend to avoid CORS issues
     */
    reverseGeocode(lat: number, lng: number): Observable<any> {
        // Validate coordinates
        if (!lat || !lng || lat === 0 || lng === 0) {
            console.warn('[GeocodingService] Invalid coordinates:', lat, lng);
            return of(this.getFallbackAddress(lat, lng));
        }

        return this.http.get(`${this.API_URL}/api/v1/geocoding/reverse`, {
            params: {
                lat: lat.toString(),
                lon: lng.toString()
            }
        }).pipe(
            timeout(10000),
            retry(2),
            map((response: any) => {
                if (response?.success && response?.data) {
                    return response.data;
                }
                return this.getFallbackAddress(lat, lng);
            }),
            catchError(error => {
                console.error('[GeocodingService] Reverse geocode error:', error);
                return of(this.getFallbackAddress(lat, lng));
            })
        );
    }

    /**
     * Forward geocode (search) address to coordinates
     */
    forwardGeocode(query: string): Observable<any[]> {
        if (!query || query.trim().length === 0) {
            return of([]);
        }

        return this.http.get<any>(`${this.API_URL}/api/v1/geocoding/search`, {
            params: { q: query }
        }).pipe(
            timeout(10000),
            retry(2),
            map((response: any) => {
                if (response?.success && Array.isArray(response?.results)) {
                    return response.results;
                }
                return [];
            }),
            catchError(error => {
                console.error('[GeocodingService] Forward geocode error:', error);
                return of([]);
            })
        );
    }

    /**
     * Get fallback address when geocoding fails
     */
    private getFallbackAddress(lat: number, lng: number): any {
        return {
            display_name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            address: {
                road: 'Unknown Road',
                city: 'Abuja',
                state: 'FCT',
                country: 'Nigeria'
            },
            lat,
            lon: lng
        };
    }
}
