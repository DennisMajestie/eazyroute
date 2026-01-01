import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AlongRoute, ApiResponse, BoardingInference } from '../../models/transport.types';
import { EnhancedRoute, EnhancedRouteResponse, TransportMode } from '../../models/enhanced-bus-stop.model';

/**
 * AlongService - Behavioral Layer Routing & Logic
 * Handles the "ALONG" algorithm stack, hybrid searches, and boarding inference.
 */
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
     * Generate Route (Trip Planner)
     * Refactored to use multi-route stack for consistency and to fix 404 on legacy endpoint
     */
    generateRoute(from: any, to: any): Observable<ApiResponse<AlongRoute>> {
        return this.generateMultiRoutes(from, to).pipe(
            map(res => {
                if (res.success && res.data && res.data.length > 0) {
                    return {
                        success: true,
                        data: res.data[0],
                        message: res.message
                    };
                }
                return {
                    success: false,
                    data: null as any,
                    message: res.message || 'No routes found'
                };
            })
        );
    }

    /**
     * Generate Enhanced Route (New multi-modal format)
     * Redirected to generate-multi-routes to prevent 404s
     */
    generateEnhancedRoute(
        from: string | { lat: number; lng: number },
        to: string | { lat: number; lng: number },
        modes?: TransportMode[]
    ): Observable<EnhancedRouteResponse> {
        return this.generateMultiRoutes(from, to, modes).pipe(
            map(res => {
                if (res.success && res.data && res.data.length > 0) {
                    // Map AlongRoute to EnhancedRoute (they share core properties)
                    const route = res.data[0];
                    const enhanced: EnhancedRoute = {
                        from: route.from,
                        to: route.to,
                        segments: (route.segments as any), // Types are largely compatible
                        totalDistance: route.totalDistance,
                        totalTime: route.totalTime,
                        totalCost: route.totalCost,
                        instructions: route.instructions,
                        rationale: route.rationale || ''
                    };
                    return { success: true, data: enhanced, message: res.message };
                }
                return { success: false, data: null as any, message: res.message || 'No routes found' };
            })
        );
    }

    /**
     * Generate Multi Routes (ALONG Algorithm Stack)
     * Returns top 3 classified options (FASTEST, CHEAPEST, BALANCED)
     */
    generateMultiRoutes(from: any, to: any, modes?: TransportMode[]): Observable<ApiResponse<AlongRoute[]>> {
        const payload: any = { from, to };
        if (modes && modes.length > 0) {
            payload.modes = modes;
        }
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

    /**
     * Get Coverage Stats (Progressive UI)
     */
    getStats(): Observable<ApiResponse<{ areasMapped: number; hotspotsActive: number; contributors: number }>> {
        return this.http.get<ApiResponse<any>>(`${this.apiUrl}/stats`);
    }
}
