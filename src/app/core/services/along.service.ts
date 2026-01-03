import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AlongRoute, ApiResponse, BoardingInference } from '../../models/transport.types';
import { EnhancedRoute, EnhancedRouteResponse, TransportMode } from '../../models/enhanced-bus-stop.model';
import { RouteResponse } from '../../models/route.model';

/**
 * AlongService - Behavioral Layer Routing & Logic
 * Handles the "ALONG" algorithm stack, hybrid searches, and boarding inference.
 * Updated for Synchronized V3/V4 Backend (Direct Array Data Access).
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
        // Prevent calling with invalid (0,0) coordinates
        if (lat === 0 && lng === 0) {
            console.warn('[AlongService] Blocked inferBoarding call with (0,0) coordinates');
            return new Observable(observer => {
                observer.error({ message: 'Invalid Location (0,0)' });
                observer.complete();
            });
        }

        let params = new HttpParams()
            .set('latitude', lat.toString())
            .set('longitude', lng.toString());

        if (destination) {
            params = params.set('destination', destination);
        }

        return this.http.get<ApiResponse<BoardingInference[]>>(`${this.apiUrl}/infer-boarding`, { params }).pipe(
            catchError(err => {
                const errorMsg = err.error?.message || '';
                if (errorMsg.includes('Detected Lagos ISP leak')) {
                    console.error('[AlongService] Lagos ISP Leak detected during Boarding Inference!');
                }
                return throwError(() => err);
            })
        );
    }

    /**
     * Generate Route (Trip Planner) - Synchronized V3/V4 Logic
     * data now returns an array of routes directly.
     */
    generateRoute(from: any, to: any): Observable<ApiResponse<AlongRoute[]>> {
        // Validate From Location Coordinates
        if (this.isInvalidCoordinate(from)) {
            console.warn('[AlongService] Blocked generateRoute call with invalid From details:', from);
            return new Observable(observer => {
                observer.error({ message: 'Invalid "From" Location (0,0)' });
                observer.complete();
            });
        }

        const url = `${this.apiUrl}/generate-route`;

        // Normalize Payload: Ensure latitude/longitude are present if it's an object
        // Maps {lat, lng} -> {latitude, longitude} (Clean Object)
        const normalize = (loc: any) => {
            if (typeof loc === 'object' && loc !== null && 'lat' in loc && 'lng' in loc) {
                // Return ONLY coordinates to force backend to use them
                // This prevents backend from trying to geocode "My Location" string if present
                return {
                    latitude: loc.lat,
                    longitude: loc.lng
                };
            }
            return loc;
        };

        const payload = {
            fromLocation: normalize(from),
            toLocation: normalize(to)
        };

        return this.http.post<any>(url, payload).pipe(
            map(response => {
                // Apply Robust Alignment Extraction
                const routes = this.extractRoutes(response);
                return {
                    success: response.success !== false, // Default to true if missing
                    data: routes,
                    message: response.message || response.error || '',
                    errorType: response.errorType,
                    nearbyHubs: response.nearbyHubs,
                    suggestion: response.suggestion
                } as ApiResponse<AlongRoute[]>;
            }),
            catchError(err => {
                const errorMsg = err.error?.message || '';
                if (errorMsg.includes('Detected Lagos ISP leak')) {
                    console.error('[AlongService] Lagos ISP Leak detected by Backend!');
                }
                return throwError(() => err);
            })
        );
    }

    /**
     * CRITICAL: Extract routes/legs from various possible backend structures
     * Aligned with Frontend-Backend Alignment Doc
     */
    private extractRoutes(response: any): AlongRoute[] {
        if (!response) return [];

        // 1. Check for standard data wrapper
        if (response.data && Array.isArray(response.data)) {
            return response.data;
        }

        // 2. Check for "route" object containing "legs"
        if (response.route && response.route.legs && Array.isArray(response.route.legs)) {
            // Map the single route response to an array containing one AlongRoute
            const route = response.route;
            return [{
                from: route.from || 'Unknown',
                to: route.to || 'Unknown',
                segments: route.legs || route.segments || [],
                totalDistance: route.totalDistance || 0,
                totalTime: route.totalDuration || route.totalTime || 0,
                totalCost: route.totalCost || 0,
                instructions: (route.instructions || []) as string[],
                metadata: { strategy: 'standard', alternativeRoutes: false, ...(route.metadata || {}) }
            } as unknown as AlongRoute];
        }

        // 3. Check for "legs" at top level
        if (response.legs && Array.isArray(response.legs)) {
            return [{
                from: 'Unknown',
                to: 'Unknown',
                segments: response.legs,
                totalDistance: response.totalDistance || 0,
                totalTime: response.totalDuration || response.totalTime || 0,
                totalCost: response.totalCost || 0,
                instructions: (response.instructions || []) as string[],
                metadata: { strategy: 'standard', alternativeRoutes: false, ...(response.metadata || {}) }
            } as unknown as AlongRoute];
        }

        // 4. Check if response IS the array of routes/legs
        if (Array.isArray(response)) {
            // Check if it's an array of routes or an array of legs
            if (response.length > 0 && (response[0].mode || response[0].instruction)) {
                // It's probably an array of legs (one route)
                return [{
                    from: 'Unknown',
                    to: 'Unknown',
                    segments: response,
                    totalDistance: 0,
                    totalTime: 0,
                    totalCost: 0,
                    instructions: [] as string[],
                    metadata: { strategy: 'standard', alternativeRoutes: false }
                } as unknown as AlongRoute];
            }
            return response;
        }

        console.warn('[AlongService] Unrecognized response structure:', response);
        return [];
    }

    /**
     * Generate Enhanced Route (New multi-modal format)
     * Uses generateRoute and maps the first result.
     */
    generateEnhancedRoute(
        from: string | { lat: number; lng: number },
        to: string | { lat: number; lng: number },
        modes?: TransportMode[]
    ): Observable<EnhancedRouteResponse> {
        return this.generateRoute(from, to).pipe(
            map(res => {
                if (res.success && res.data && res.data.length > 0) {
                    const route = res.data[0];
                    const enhanced: EnhancedRoute = {
                        from: route.from,
                        to: route.to,
                        segments: (route.segments as any),
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
     * synchronized to the same logic as generateRoute.
     */
    generateMultiRoutes(from: any, to: any, modes?: TransportMode[]): Observable<ApiResponse<AlongRoute[]>> {
        return this.generateRoute(from, to);
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

    private isInvalidCoordinate(location: any): boolean {
        if (!location) return true;
        // Check if object has lat/lng structure
        if (typeof location === 'object' && 'lat' in location && 'lng' in location) {
            // Falsy check catches 0, null, and undefined
            return !location.lat && !location.lng;
        }
        return false;
    }
}
