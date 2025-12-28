import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlongRoute, ApiResponse, BoardingInference } from '../../models/transport.types';
import { EnhancedRoute, EnhancedRouteResponse, TransportMode } from '../../models/enhanced-bus-stop.model';

@Injectable({
    providedIn: 'root'
})
export class AlongService {
    private apiUrl = `${environment.apiUrl}/along`;

    constructor(private http: HttpClient) { }

    /**
     * Infer Boarding (Live)
     * Determining the best boarding point based on user location
     */
    inferBoarding(lat: number, lng: number, destination?: string): Observable<ApiResponse<BoardingInference[]>> {
        let params = new HttpParams()
            .set('latitude', lat.toString())
            .set('longitude', lng.toString());

        if (destination) {
            params = params.set('destination', destination);
        }

        return this.http.get<ApiResponse<BoardingInference[]>>(`${this.apiUrl}/infer-boarding`, { params });
    }

    /**
     * Generate Route (Trip Planner) - Legacy method
     * Get multi-modal route suggestions
     * Supports Hybrid Search: 'from' and 'to' can be objects (coords) or strings (place names)
     */
    generateRoute(
        from: { lat?: number; lng?: number; latitude?: number; longitude?: number; name?: string } | string,
        to: { lat?: number; lng?: number; latitude?: number; longitude?: number; name?: string } | string
    ): Observable<ApiResponse<AlongRoute>> {
        const mapLocation = (loc: any) => {
            if (typeof loc === 'string') return { name: loc, lat: 0, lng: 0 }; // Backend should handle pure text? Or geocode it? Spec says lat/lng/name required. 
            // Assuming we prefer lat/lng if available.
            return {
                lat: loc.lat || loc.latitude || 0,
                lng: loc.lng || loc.longitude || 0,
                name: loc.name || 'Unknown Location'
            };
        };

        const payload = {
            fromLocation: mapLocation(from),
            toLocation: mapLocation(to)
        };

        return this.http.post<ApiResponse<AlongRoute>>(`${this.apiUrl}/generate-route`, payload);
    }

    /**
     * Generate Enhanced Route (New multi-modal format)
     * @param from Starting location (name or coordinates)
     * @param to Destination (name or coordinates)
     * @param modes Optional transport mode filters
     */
    generateEnhancedRoute(
        from: string | { lat: number; lng: number },
        to: string | { lat: number; lng: number },
        modes?: TransportMode[]
    ): Observable<EnhancedRouteResponse> {
        const body: any = { from, to };
        if (modes && modes.length > 0) {
            body.modes = modes;
        }
        return this.http.post<EnhancedRouteResponse>(`${this.apiUrl}/generate-route`, body);
    }

    /**
     * Hybrid Search (ALONG + OSM)
     * Search for landmarks, bus stops, and OSM places
     */
    search(query: string): Observable<ApiResponse<any[]>> {
        const params = new HttpParams().set('q', query);
        return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/search`, { params });
    }
}
