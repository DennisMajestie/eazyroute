/**
 * ═══════════════════════════════════════════════════════════════════
 * ROUTE GENERATION ENGINE - ANGULAR SERVICE
 * ═══════════════════════════════════════════════════════════════════
 * 
 * File: src/app/core/engines/route-generation.engine.ts
 * 
 * This service generates multiple route candidates, breaks them into
 * segments, calculates metrics, and ranks them by different criteria.
 */


import { Injectable, Inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BusStop } from '../../models/bus-stop.model';
import {
    Location,
    RouteSegment,
    GeneratedRoute,
    TransportMode,
    TransportModeType,
    DEFAULT_TRANSPORT_MODES,
    IBusStopRepository,
    ILocationService,
    IRoutingService,
    IFareCalculator,
    EasyRouteConfig,
    DEFAULT_CONFIG
} from './types/easyroute.types';

// ✨ Import injection tokens
import {
    BUS_STOP_REPOSITORY,
    LOCATION_SERVICE,
    ROUTING_SERVICE,
    FARE_CALCULATOR
} from './adapters/engine-adapters.provider';
import { StorageService } from '../services/storage.service';

@Injectable({
    providedIn: 'root'
})
export class RouteGenerationEngine {
    private config: EasyRouteConfig = DEFAULT_CONFIG;
    private readonly WALKING_SPEED_MPS = 1.4;

    constructor(
        @Inject(BUS_STOP_REPOSITORY) private busStopRepo: IBusStopRepository,
        @Inject(ROUTING_SERVICE) private routingService: IRoutingService,
        @Inject(FARE_CALCULATOR) private fareCalculator: IFareCalculator,
        @Inject(LOCATION_SERVICE) private locationService: ILocationService,
        private storageService: StorageService
    ) { }


    /**
     * Update engine configuration
     */
    setConfig(config: Partial<EasyRouteConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
    * ═══════════════════════════════════════════════════════════════
    * MAIN ENTRY POINT: Generate Multiple Route Candidates
    * ═══════════════════════════════════════════════════════════════
    */
    async generateRoutes(
        startLocation: Location,
        endLocation: Location,
        maxAlternatives: number = 5
    ): Promise<GeneratedRoute[]> {
        console.log('[RouteGen] Starting route generation...', { startLocation, endLocation });

        // Node Snapping: improve origin/destination alignment to nearest known node
        try {
            const locSvc: any = this.locationService as any;
            if (typeof locSvc.snapToNearestNode === 'function') {
                const snappedStart = await locSvc.snapToNearestNode(startLocation);
                const snappedEnd = await locSvc.snapToNearestNode(endLocation);
                startLocation = snappedStart || startLocation;
                endLocation = snappedEnd || endLocation;
            }
        } catch (e) { }

        // Step 1: Find nearby stops at start and end
        const startStops = await this.busStopRepo.findNearby(
            startLocation,
            this.config.nearbyStopRadiusMeters
        );

        const endStops = await this.busStopRepo.findNearby(
            endLocation,
            this.config.nearbyStopRadiusMeters
        );

        console.log(`[RouteGen] Found ${startStops.length} start stops, ${endStops.length} end stops`);

        if (startStops.length === 0 || endStops.length === 0) {
            console.warn('[RouteGen] No stops found near start or end location');
            return await this.generateDirectRoute(startLocation, endLocation);
        }

        // Step 2: Generate path combinations in PARALLEL
        const routePromises: Promise<GeneratedRoute>[] = [];

        // Limit combinations to avoid performance issues
        const maxStartStops = Math.min(3, startStops.length);
        const maxEndStops = Math.min(3, endStops.length);

        for (let i = 0; i < maxStartStops; i++) {
            for (let j = 0; j < maxEndStops; j++) {
                // Queue all calculations
                routePromises.push(
                    this.generateShortestRoute(startLocation, endLocation, startStops[i], endStops[j])
                        .catch(err => {
                            console.error('[RouteGen] Error generating shortest variant:', err);
                            return null as any;
                        }),
                    this.generateCheapestRoute(startLocation, endLocation, startStops[i], endStops[j])
                        .catch(err => {
                            console.error('[RouteGen] Error generating cheapest variant:', err);
                            return null as any;
                        }),
                    this.generateBalancedRoute(startLocation, endLocation, startStops[i], endStops[j])
                        .catch(err => {
                            console.error('[RouteGen] Error generating balanced variant:', err);
                            return null as any;
                        })
                );
            }
        }

        // Wait for all to finish
        const results = await Promise.all(routePromises);

        // Filter out failures (nulls)
        const routeCandidates = results.filter(r => r !== null);

        // Step 3: Remove duplicates and rank
        const uniqueRoutes = this.deduplicateRoutes(routeCandidates);
        const rankedRoutes = this.rankRoutes(uniqueRoutes);

        console.log(`[RouteGen] Generated ${rankedRoutes.length} unique routes`);

        // Return top candidates (use maxAlternatives parameter)
        const top = rankedRoutes.slice(0, Math.min(maxAlternatives, this.config.maxRouteCandidates));

        // Cache top routes for offline (IndexedDB)
        try {
            const user = this.storageService.getUser();
            const userId = user?.id || 'guest';
            await this.storageService.cacheTopRoutesForUser(userId, top);
        } catch { }

        return top;
    }
    /**
     * ═══════════════════════════════════════════════════════════════
     * STRATEGY 1: Generate Shortest Route (minimize distance/time)
     * ═══════════════════════════════════════════════════════════════
     */
    private async generateShortestRoute(
        startLocation: Location,
        endLocation: Location,
        startStop: BusStop,
        endStop: BusStop
    ): Promise<GeneratedRoute> {
        const segments: RouteSegment[] = [];

        // Segment 1: Walk to start stop
        const walkToStart = await this.createWalkingSegment(
            startLocation,
            this.busStopToLocation(startStop),
            'walk-to-start'
        );
        segments.push(walkToStart);

        // Segment 2: Main transit (use fastest mode - bus)
        const transitSegment = await this.createTransitSegment(
            startStop,
            endStop,
            'bus',
            'main-transit'
        );
        segments.push(transitSegment);

        // Segment 3: Walk to destination
        const walkToEnd = await this.createWalkingSegment(
            this.busStopToLocation(endStop),
            endLocation,
            'walk-to-end'
        );
        segments.push(walkToEnd);

        return this.buildRoute(segments, 'shortest');
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * STRATEGY 2: Generate Cheapest Route (minimize cost)
     * ═══════════════════════════════════════════════════════════════
     */
    private async generateCheapestRoute(
        startLocation: Location,
        endLocation: Location,
        startStop: BusStop,
        endStop: BusStop
    ): Promise<GeneratedRoute> {
        const segments: RouteSegment[] = [];

        // Check if walking entire distance is feasible (<2km)
        const totalDistance = this.locationService.calculateDistance(
            startLocation,
            endLocation
        );

        if (totalDistance < 2000) {
            // Just walk the entire route (cheapest)
            const walkSegment = await this.createWalkingSegment(
                startLocation,
                endLocation,
                'walk-entire'
            );
            segments.push(walkSegment);
        } else {
            // Use cheapest transit option
            segments.push(
                await this.createWalkingSegment(
                    startLocation,
                    this.busStopToLocation(startStop),
                    'walk-to-start'
                )
            );

            segments.push(
                await this.createTransitSegment(startStop, endStop, 'bus', 'main-transit')
            );

            segments.push(
                await this.createWalkingSegment(
                    this.busStopToLocation(endStop),
                    endLocation,
                    'walk-to-end'
                )
            );
        }

        return this.buildRoute(segments, 'cheapest');
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * STRATEGY 3: Generate Balanced Route (optimize time + cost)
     * ═══════════════════════════════════════════════════════════════
     */
    private async generateBalancedRoute(
        startLocation: Location,
        endLocation: Location,
        startStop: BusStop,
        endStop: BusStop
    ): Promise<GeneratedRoute> {
        const segments: RouteSegment[] = [];

        // Balance between walking and transit
        const distanceToStartStop = this.locationService.calculateDistance(
            startLocation,
            this.busStopToLocation(startStop)
        );

        // If start stop is far, consider keke (tricycle)
        if (distanceToStartStop > 800) {
            segments.push(
                await this.createTransitSegment(
                    this.createDummyStop(startLocation, 'start-point'),
                    startStop,
                    'keke',
                    'keke-to-start'
                )
            );
        } else {
            segments.push(
                await this.createWalkingSegment(
                    startLocation,
                    this.busStopToLocation(startStop),
                    'walk-to-start'
                )
            );
        }

        // Main transit
        segments.push(
            await this.createTransitSegment(startStop, endStop, 'bus', 'main-transit')
        );

        // End segment
        segments.push(
            await this.createWalkingSegment(
                this.busStopToLocation(endStop),
                endLocation,
                'walk-to-end'
            )
        );

        return this.buildRoute(segments, 'balanced');
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * HELPER: Create Walking Segment
     * ═══════════════════════════════════════════════════════════════
     */
    private async createWalkingSegment(
        from: Location,
        to: Location,
        segmentId: string
    ): Promise<RouteSegment> {
        const distance = this.locationService.calculateDistance(from, to);
        const time = distance / this.WALKING_SPEED_MPS / 60; // Convert to minutes

        const walkMode = DEFAULT_TRANSPORT_MODES.find(m => m.type === 'walk')!;

        const segment: RouteSegment = {
            id: `seg-${segmentId}-${Date.now()}`,
            fromStop: this.createDummyStop(from, 'walk-start'),
            toStop: this.createDummyStop(to, 'walk-end'),
            distance,
            estimatedTime: time,
            mode: walkMode,
            cost: 0, // Walking is free
            instructions: `Walk ${Math.round(distance)}m (${Math.round(time)} min)`
        };

        return segment;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * HELPER: Create Transit Segment (Bus, Keke, Taxi, etc.)
     * ═══════════════════════════════════════════════════════════════
     */
    private async createTransitSegment(
        fromStop: BusStop,
        toStop: BusStop,
        modeType: TransportModeType,
        segmentId: string
    ): Promise<RouteSegment> {
        const mode = DEFAULT_TRANSPORT_MODES.find(m => m.type === modeType) || {
            type: modeType,
            name: modeType.charAt(0).toUpperCase() + modeType.slice(1),
            availabilityFactor: 0.8,
            avgSpeedKmh: 25
        };

        const routeData = await this.routingService.calculateRoute(
            this.busStopToLocation(fromStop),
            this.busStopToLocation(toStop),
            mode
        );

        const segment: RouteSegment = {
            id: `seg-${segmentId}-${Date.now()}`,
            fromStop,
            toStop,
            distance: routeData.distance,
            estimatedTime: routeData.duration,
            mode,
            cost: 0, // Will be calculated below
            instructions: `Take ${mode.name} from ${fromStop.name} to ${toStop.name}`
        };

        // Calculate fare
        segment.cost = this.fareCalculator.calculateSegmentFare(segment);

        return segment;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * HELPER: Build Route from Segments
     * ═══════════════════════════════════════════════════════════════
     */
    private buildRoute(segments: RouteSegment[], strategy: string): GeneratedRoute {
        const totalDistance = segments.reduce((sum, seg) => sum + seg.distance, 0);
        const totalTime = segments.reduce((sum, seg) => sum + seg.estimatedTime, 0);
        const totalCost = segments.reduce((sum, seg) => sum + seg.cost, 0);

        // Probabilistic Arrival Window (PAW): 85% confidence window
        const sigma = totalTime * 0.10; // assume 10% variability
        const z85 = 1.44;
        const minWindow = Math.max(1, Math.round(totalTime - z85 * sigma));
        const maxWindow = Math.max(minWindow + 1, Math.round(totalTime + z85 * sigma));

        return {
            id: `route-${strategy}-${Date.now()}`,
            segments,
            totalDistance,
            totalTime,
            totalCost,
            rankingScore: {
                shortest: 0,
                cheapest: 0,
                balanced: 0
            },
            generatedAt: new Date(),
            strategy: strategy as any,
            metadata: {
                arrivalWindow: { minMinutes: minWindow, maxMinutes: maxWindow, confidence: 0.85 }
            }
        };
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * FALLBACK: Generate Direct Route (no stops available)
     * ═══════════════════════════════════════════════════════════════
     */
    private async generateDirectRoute(
        startLocation: Location,
        endLocation: Location
    ): Promise<GeneratedRoute[]> {
        console.log('[RouteGen] Generating direct route (no stops found)');

        const walkSegment = await this.createWalkingSegment(
            startLocation,
            endLocation,
            'direct-walk'
        );

        const route = this.buildRoute([walkSegment], 'custom');
        return [route];
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * RANKING SYSTEM: Score and Sort Routes
     * ═══════════════════════════════════════════════════════════════
     */
    private rankRoutes(routes: GeneratedRoute[]): GeneratedRoute[] {
        if (routes.length === 0) return routes;

        // Find min/max for normalization
        const safeRoutes = Array.isArray(routes) ? routes.filter(r => !!r) : [];
        if (safeRoutes.length === 0) return [];

        const distances = safeRoutes.map(r => r.totalDistance || 0);
        const costs = safeRoutes.map(r => r.totalCost || 0);
        const times = safeRoutes.map(r => r.totalTime || 0);

        const minDistance = Math.min(...distances);
        const maxDistance = Math.max(...distances);
        const minCost = Math.min(...costs);
        const maxCost = Math.max(...costs);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        // Calculate scores (inverse normalization - lower is better)
        routes.forEach(route => {
            // Shortest score (based on time)
            route.rankingScore.shortest = this.inverseNormalize(
                route.totalTime,
                minTime,
                maxTime
            );

            // Cheapest score
            route.rankingScore.cheapest = this.inverseNormalize(
                route.totalCost,
                minCost,
                maxCost
            );

            // Balanced score (weighted average: 60% time, 40% cost)
            // Matches RouteBuilderService logic
            route.rankingScore.balanced =
                (route.rankingScore.shortest * 0.6) +
                (route.rankingScore.cheapest * 0.4);
        });

        // Sort by balanced score (highest first)
        return routes.sort((a, b) =>
            b.rankingScore.balanced - a.rankingScore.balanced
        );
    }

    /**
     * Inverse normalization: lower values = higher scores
     */
    private inverseNormalize(value: number, min: number, max: number): number {
        if (max === min) return 100;
        return 100 - ((value - min) / (max - min)) * 100;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * DEDUPLICATION: Remove Similar Routes
     * ═══════════════════════════════════════════════════════════════
     */
    private deduplicateRoutes(routes: GeneratedRoute[]): GeneratedRoute[] {
        const uniqueRoutes: GeneratedRoute[] = [];
        const seenSignatures = new Set<string>();

        for (const route of routes) {
            // CRITICAL FIX: Ensure segments exist and is an array
            if (!route.segments || !Array.isArray(route.segments)) {
                console.warn('[RouteGen] Skipping malformed route without segments:', route);
                continue;
            }

            // Create signature based on stops and modes
            const signature = (route.segments || [])
                .filter(seg => !!seg && !!seg.fromStop && !!seg.toStop && !!seg.mode)
                .map(seg => `${seg.fromStop.id}-${seg.toStop.id}-${seg.mode.type}`)
                .join('|');

            if (!seenSignatures.has(signature)) {
                seenSignatures.add(signature);
                uniqueRoutes.push(route);
            }
        }

        return uniqueRoutes;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * SEGMENT MAPPING: Break Route into Detailed Segments
     * ═══════════════════════════════════════════════════════════════
     */
    async breakIntoDetailedSegments(route: GeneratedRoute): Promise<RouteSegment[]> {
        const detailedSegments: RouteSegment[] = [];

        for (const segment of route.segments) {
            // If segment is too long (>5km), find intermediate stops
            if (segment.distance > 5000 && segment.mode.type === 'bus') {
                const intermediateStops = await this.findIntermediateStops(
                    segment.fromStop as BusStop,
                    segment.toStop as BusStop
                );

                // Break into smaller segments
                if (intermediateStops.length > 0) {
                    const stops = [segment.fromStop, ...intermediateStops, segment.toStop];

                    for (let i = 0; i < stops.length - 1; i++) {
                        const subSegment = await this.createTransitSegment(
                            stops[i] as BusStop,
                            stops[i + 1] as BusStop,
                            segment.mode.type as TransportModeType,
                            `sub-${i}`
                        );
                        detailedSegments.push(subSegment);
                    }
                } else {
                    detailedSegments.push(segment);
                }
            } else {
                detailedSegments.push(segment);
            }
        }

        return detailedSegments;
    }

    /**
     * Find intermediate stops along a path
     */
    private async findIntermediateStops(
        fromStop: BusStop,
        toStop: BusStop
    ): Promise<BusStop[]> {
        const allStops = await this.busStopRepo.findAll();
        const intermediates: BusStop[] = [];

        const fromLoc = this.busStopToLocation(fromStop);
        const toLoc = this.busStopToLocation(toStop);

        for (const stop of allStops) {
            if (stop.id === fromStop.id || stop.id === toStop.id) continue;

            const stopLoc = this.busStopToLocation(stop);
            if (this.isStopOnPath(fromLoc, toLoc, stopLoc)) {
                intermediates.push(stop);
            }
        }

        // Sort by distance from start
        return intermediates.sort((a, b) => {
            const distA = this.locationService.calculateDistance(fromLoc, this.busStopToLocation(a));
            const distB = this.locationService.calculateDistance(fromLoc, this.busStopToLocation(b));
            return distA - distB;
        });
    }

    /**
     * Check if a point is roughly on the path between two points
     */
    private isStopOnPath(
        start: Location,
        end: Location,
        point: Location
    ): boolean {
        const totalDist = this.locationService.calculateDistance(start, end);
        const distToPoint =
            this.locationService.calculateDistance(start, point) +
            this.locationService.calculateDistance(point, end);

        // Allow 10% deviation
        return distToPoint <= totalDist * 1.1;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * UTILITY HELPERS
     * ═══════════════════════════════════════════════════════════════
     */

    private busStopToLocation(stop: BusStop): Location {
        return {
            latitude: stop.latitude,
            longitude: stop.longitude
        };
    }

    private createDummyStop(location: Location, id: string): BusStop {
        return {
            id: Math.random(), // Temporary ID
            name: 'Point',
            type: 'landmark',
            localNames: [],
            latitude: location.latitude,
            longitude: location.longitude,
            address: '',
            city: '',
            area: '',
            verificationStatus: 'verified',
            upvotes: 0,
            downvotes: 0,
            transportModes: ['walking'],
            photos: [],
            usageCount: 0,
            isActive: true,
            verified: true,
            createdAt: new Date()
        };
    }
}
