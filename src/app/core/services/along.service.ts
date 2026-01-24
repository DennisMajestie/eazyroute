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
                console.log('[AlongService] Raw API Response:', response);

                // Apply Robust Alignment Extraction
                const routes = this.extractRoutes(response);
                console.log('[AlongService] Extracted Routes:', routes ? routes.length : 'null/undefined');

                if (!Array.isArray(routes)) {
                    console.warn('[AlongService] extractRoutes did not return an array:', routes);
                    return {
                        success: response?.success === true,
                        data: [],
                        message: response?.message || 'No routes available'
                    } as ApiResponse<AlongRoute[]>;
                }

                // CRITICAL FIX: Ensure routes is an array before processing
                if (!Array.isArray(routes) || routes.length === 0) {
                    console.warn('[AlongService] No valid routes array to process:', routes);
                    return {
                        success: response?.success === true,
                        data: [],
                        message: response?.message || 'No routes available'
                    } as ApiResponse<AlongRoute[]>;
                }

                // Post-process to ensure From/To names match search names if they look like IDs
                const processedRoutes = routes.filter(r => !!r).map(route => {
                    const searchFrom = (typeof from === 'string' ? from : from.name);
                    const searchTo = (typeof to === 'string' ? to : to.name);

                    // Normalize Route-level names
                    const normalizedFrom = (route.from && typeof route.from === 'string' && (route.from.includes('landmark') || route.from.includes('node')))
                        ? searchFrom
                        : (route.from || searchFrom);

                    const normalizedTo = (route.to && typeof route.to === 'string' && (route.to.includes('landmark') || route.to.includes('node')))
                        ? searchTo
                        : (route.to || searchTo);

                    // Create normalized route object
                    const newRoute = {
                        ...route,
                        from: normalizedFrom,
                        to: normalizedTo
                    };

                    // Also normalize the very first and very last segment names if they match
                    if (newRoute.segments && Array.isArray(newRoute.segments) && newRoute.segments.length > 0) {
                        const first = newRoute.segments[0];
                        const last = newRoute.segments[newRoute.segments.length - 1];

                        if (first?.fromStop && typeof first.fromStop === 'string' && (first.fromStop.includes('landmark') || first.fromStop.includes('node'))) {
                            first.fromStop = normalizedFrom;
                        }
                        if (last?.toStop && typeof last.toStop === 'string' && (last.toStop.includes('landmark') || last.toStop.includes('node'))) {
                            last.toStop = normalizedTo;
                        }

                        // Re-generate instructions if they were ID-based
                        newRoute.segments.forEach((s: any) => {
                            if (s?.instruction && typeof s.instruction === 'string' && (s.instruction.includes('landmark') || s.instruction.includes('node'))) {
                                // Simple replacement 
                                s.instruction = s.instruction.split('landmark')[0].split('node')[0].trim();
                                if (s === last) s.instruction += ` to ${normalizedTo}`;
                                else if (s === first) s.instruction = `From ${normalizedFrom} take ${s.vehicleType}...`;
                            }
                        });
                    }

                    return newRoute;
                });

                return {
                    success: response.success !== false,
                    data: processedRoutes,
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
            // Check if it's an array of routes or an array of segments
            if (response.data.length > 0 && (response.data[0]?.mode || response.data[0]?.instruction)) {
                // It's an array of segments - wrap it
                routes = [{
                    from: 'Unknown',
                    to: 'Unknown',
                    segments: response.data,
                    totalDistance: 0,
                    totalTime: 0,
                    totalCost: 0,
                    instructions: [],
                    metadata: { strategy: 'standard', alternativeRoutes: false }
                }];
            } else {
                // It's an array of routes
                routes = response.data;
            }
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
            if (response.length > 0 && (response[0]?.mode || response[0]?.instruction)) {
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

        // Normalize all segments in all routes
        return routes.map(r => ({
            ...r,
            segments: this.normalizeSegments(r?.segments || [])
        }));
    }

    /**
     * Normalize segment keys to match AlongSegment interface
     */
    private normalizeSegments(segments: any[]): any[] {
        // CRITICAL FIX: Ensure segments is actually an array
        if (!Array.isArray(segments)) {
            console.warn('[AlongService] normalizeSegments called with non-array:', segments);
            return [];
        }

        return segments.map(s => ({
            ...s,
            // Mode Normalization
            vehicleType: s.vehicleType || s.mode || (s.type === 'ride' ? 'taxi' : s.type),
            type: s.type || (s.mode === 'walking' ? 'walk' : 'ride'),

            // Stop Normalization
            fromStop: s.fromStop || s.fromName || (s.start_address ? s.start_address : ''),
            toStop: s.toStop || s.toName || (s.end_address ? s.end_address : ''),

            // Distance/Time Normalization
            distance: s.distance?.value || s.distance || 0,
            estimatedTime: s.duration?.value ? Math.round(s.duration.value / 60) : (s.estimatedTime || 0),

            // Instruction Fallback
            instruction: s.instruction || s.instructions || `Take ${s.mode || s.vehicleType || 'transport'} to ${s.toName || s.toStop || 'next stop'}`
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
