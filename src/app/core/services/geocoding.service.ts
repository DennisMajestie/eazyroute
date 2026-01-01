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
            map(results => results.map(r => ({
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
        const params = {
            lat: latitude.toString(),
            lon: longitude.toString(),
            format: 'json',
            addressdetails: '1'
        };

        return this.http.get<any>(`https://nominatim.openstreetmap.org/reverse`, { params }).pipe(
            map(r => ({
                name: r.name || r.display_name.split(',')[0],
                displayName: r.display_name,
                latitude: parseFloat(r.lat),
                longitude: parseFloat(r.lon),
                type: r.type,
                area: r.address?.suburb || r.address?.neighbourhood || r.address?.city
            })),
            catchError(error => {
                console.error('[GeocodingService] Reverse geocode error:', error);
                return of(null);
            })
        );
    }
}
