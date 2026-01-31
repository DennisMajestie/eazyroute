import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DataSanitizer } from '../utils/data-sanitizer';
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

        // Normalize Payload: Ensure lat/lng keys are present if it's an object
        const normalize = (loc: any) => {
            if (typeof loc === 'object' && loc !== null && 'lat' in loc && 'lng' in loc) {
                const payload: any = {
                    latitude: loc.lat,
                    longitude: loc.lng,
                    lat: loc.lat,
                    lng: loc.lng
                };
                if (loc.name) payload.name = loc.name;
                return payload;
            }
            return loc;
        };

        const payload = {
            startLocation: normalize(from),
            endLocation: normalize(to),
            fromLocation: normalize(from),
            toLocation: normalize(to),
            preferences: { optimizeFor: 'balanced' }
        };

        return this.http.post<any>(url, payload).pipe(
            map(response => {
                console.log('[AlongService] V4 API Response:', response);

                // Apply Robust Extraction
                const routes = this.extractRoutes(response);

                if (!Array.isArray(routes) || routes.length === 0) {
                    return {
                        success: response?.success !== false,
                        data: [],
                        message: response?.message || 'No routes available',
                        errorType: response?.errorType,
                        nearbyHubs: response?.nearbyHubs,
                        suggestion: response?.suggestion
                    } as ApiResponse<AlongRoute[]>;
                }

                return {
                    success: response.success !== false,
                    data: routes,
                    message: response.message || response.error || '',
                    errorType: response.errorType,
                    nearbyHubs: response.nearbyHubs,
                    suggestion: response.suggestion
                } as ApiResponse<AlongRoute[]>;
            }),
            catchError(err => {
                console.error('[AlongService] generateRoute error:', err);
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

        let routes: any[] = [];

        // 0. V4 K-Best Routing: check for { data: { routes: [] } }
        if (response.data && !Array.isArray(response.data) && response.data.routes && Array.isArray(response.data.routes)) {
            routes = response.data.routes;
        }
        // 1. Check for standard data wrapper
        else if (response.data && Array.isArray(response.data)) {
            routes = response.data;
        }
        // 2. Check for "route" object containing "legs"
        else if (response.route && typeof response.route === 'object') {
            const route = response.route;
            routes = [{
                from: route.from || 'Unknown',
                to: route.to || 'Unknown',
                segments: route.legs || route.segments || [],
                totalDistance: route.totalDistance || 0,
                totalTime: route.totalDuration || route.totalTime || 0,
                totalCost: route.totalCost || 0,
                instructions: (route.instructions || []) as string[],
                metadata: { strategy: 'standard', alternativeRoutes: false, ...(route.metadata || {}) }
            }];
        }
        // 3. Check for "legs" at top level
        else if (response.legs && Array.isArray(response.legs)) {
            routes = [{
                from: 'Unknown',
                to: 'Unknown',
                segments: response.legs,
                totalDistance: response.totalDistance || 0,
                totalTime: response.totalDuration || response.totalTime || 0,
                totalCost: response.totalCost || 0,
                instructions: (response.instructions || []) as string[],
                metadata: { strategy: 'standard', alternativeRoutes: false, ...(response.metadata || {}) }
            }];
        }
        // 4. Check if response IS the array of routes/legs
        else if (Array.isArray(response)) {
            if (response.length > 0 && (response[0].mode || response[0].instruction)) {
                routes = [{
                    from: 'Unknown',
                    to: 'Unknown',
                    segments: response,
                    totalDistance: 0,
                    totalTime: 0,
                    totalCost: 0,
                    instructions: [] as string[],
                    metadata: { strategy: 'standard', alternativeRoutes: false }
                }];
            } else {
                routes = response;
            }
        } else {
            console.warn('[AlongService] Unrecognized response structure:', response);
            return [];
        }

        // CRITICAL FIX: Final safety check before normalizing segments
        if (!Array.isArray(routes)) {
            console.warn('[AlongService] routes is not an array in extractRoutes final step:', routes);
            return [];
        }

        // Normalize all routes using DataSanitizer
        return DataSanitizer.sanitize<AlongRoute[]>(routes, 'route');
    }

    /**
     * Safely extract cost value from various possibilities
     */
    private normalizeCost(cost: any): number {
        if (cost === null || cost === undefined) return 0;
        if (typeof cost === 'number') return cost;
        if (typeof cost === 'string') return parseFloat(cost) || 0;
        if (typeof cost === 'object') {
            return cost.min || cost.value || cost.amount || cost.total || 0;
        }
        return 0;
    }

    /**
     * Normalize segment keys to match AlongSegment interface (Synchronized V4)
     * Relying on backend for human-readable names and clean mode keys.
     */
    private normalizeSegments(segments: any[]): any[] {
        if (!Array.isArray(segments)) return [];

        return segments.filter(s => !!s).map(s => ({
            ...s,
            // V4 Aligned Keys (Backend provides these clean now)
            vehicleType: s.vehicleType || s.mode || 'walk',
            fromStop: s.fromStop || s.fromName || 'Unknown Start',
            toStop: s.toStop || s.toName || 'Unknown End',
            fromStopId: s.fromStopId || s.fromId || s.fromStop?._id || s.fromStop?.id,
            toStopId: s.toStopId || s.toId || s.toStop?._id || s.toStop?.id,

            // Structural Normalization
            distance: s.distance?.value || s.distance || 0,
            estimatedTime: s.duration?.value ? Math.round(s.duration.value / 60) : (s.estimatedTime || 0),
            cost: this.normalizeCost(s.cost),

            // Instruction (Backend provides human-readable instructions)
            instruction: s.instruction || s.instructions || `Take ${s.vehicleType || 'transport'} to ${s.toStop}`,

            // V4 Safety & Zones
            safetyData: s.safetyData || {
                riskAlerts: s.riskAlerts || [],
                isSafeZone: s.isSafeZone || false,
                riskLevel: s.riskLevel || 'safe',
                threats: s.threats || []
            },
            zone: s.zone
        }));
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
