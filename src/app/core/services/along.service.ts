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
    generateRoute(from: any, to: any): Observable<ApiResponse<AlongRoute>> {
        const payload = { from, to };
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
     * Generate Multi Routes (ALONG Algorithm Stack)
     * Returns top 3 classified options (FASTEST, CHEAPEST, BALANCED)
     */
    generateMultiRoutes(from: any, to: any): Observable<ApiResponse<AlongRoute[]>> {
        const payload = { from, to };
        return this.http.post<ApiResponse<AlongRoute[]>>(`${this.apiUrl}/generate-multi-routes`, payload);
    }

    /**
     * Report Traffic/Police (Crowdsourcing)
     */
    reportCondition(report: {
        type: 'traffic' | 'police' | 'vio' | 'accident',
        location: { lat: number; lng: number },
        description?: string
    }): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.apiUrl}/report`, report);
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
