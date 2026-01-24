import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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
    private nominatimUrl = 'https://nominatim.openstreetmap.org/search';

    constructor(private http: HttpClient) { }

    /**
     * Search for locations using OpenStreetMap Nominatim
     * Focuses search on Abuja, Nigeria area
     */
    search(query: string): Observable<GeocodingResult[]> {
        if (!query || query.trim().length < 3) {
            return of([]);
        }

        // Focus search on Abuja, Nigeria
        // Viewbox (min lon, min lat, max lon, max lat) for Abuja FCT
        const viewbox = '7.15,8.85,7.65,9.25';

        const params = {
            q: query, // Removed suffix to allow more flexible searches within the box
            viewbox: viewbox,
            bounded: '1', // Constrain results to the viewbox
            format: 'json',
            limit: '5',
            addressdetails: '1'
        };

        return this.http.get<any[]>(this.nominatimUrl, { params }).pipe(
            map(results => (results || []).map(r => ({
                name: r.name || r.display_name.split(',')[0],
                displayName: r.display_name,
                latitude: parseFloat(r.lat),
                longitude: parseFloat(r.lon),
                type: r.type,
                area: r.address?.suburb || r.address?.neighbourhood || r.address?.city
            }))),
            catchError(error => {
                console.error('[GeocodingService] Search error:', error);
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
     * Reverse geocode - get location name from coordinates
     */
    reverseGeocode(latitude: number, longitude: number): Observable<GeocodingResult | null> {
        // Fallback result in case of failure or timeout
        const fallback: GeocodingResult = {
            name: `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            displayName: `Point near ${latitude}, ${longitude}`,
            latitude,
            longitude,
            type: 'coordinate'
        };

        const params = {
            lat: latitude.toString(),
            lon: longitude.toString(),
            format: 'json',
            addressdetails: '1'
        };

        // Note: Nominatim requires a User-Agent, but browsers won't let us set it for CORS.
        // We handle errors gracefully and provide a reliable fallback for production.
        return this.http.get<any>(`https://nominatim.openstreetmap.org/reverse`, {
            params,
            headers: { 'Accept': 'application/json' }
        }).pipe(
            map(r => ({
                name: r.name || r.display_name?.split(',')[0] || fallback.name,
                displayName: r.display_name || fallback.displayName,
                latitude: parseFloat(r.lat) || latitude,
                longitude: parseFloat(r.lon) || longitude,
                type: r.type || 'place',
                area: r.address?.suburb || r.address?.neighbourhood || r.address?.city
            })),
            catchError(error => {
                // Silently log and return fallback for "Status 0" (CORS/Rate limit)
                if (error.status === 0 || error.status === 403) {
                    console.warn('[GeocodingService] Nominatim unreachable/blocked (Status 0/403). Using coordinate fallback.');
                    // In a real prod app, we'd proxy this through our own backend
                } else {
                    console.error('[GeocodingService] Reverse geocode error:', error);
                }
                return of(fallback);
            })
        );
    }
}
