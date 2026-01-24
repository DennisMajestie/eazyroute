/**
 * ═══════════════════════════════════════════════════════════════════
 * EASYROUTE ENGINE - CORE TYPES & INTERFACES (Angular Integration)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * File: src/app/core/engines/types/easyroute.types.ts
 * 
 * This file defines the engine-specific types that EXTEND your existing
 * models to support the EasyRoute functionality.
 */

import { BusStop } from '../../../models/bus-stop.model';
export type { BusStop };
import { TransportRoute } from '../../../models/route.model';
import { Trip } from '../../../models/trip.model';
// import { User } from '../../../models/user.model';
// ═══════════════════════════════════════════════════════════════════
// 1. LOCATION & GEOGRAPHY TYPES
// ═══════════════════════════════════════════════════════════════════

export interface Location {
    latitude: number;
    longitude: number;
    timestamp?: Date;
    confidence?: number; // 0-100%
    isFiltered?: boolean;
}

export interface LocationBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}

// ═══════════════════════════════════════════════════════════════════
// 2. TRANSPORT MODE TYPES
// ═══════════════════════════════════════════════════════════════════

export type TransportModeType = 'bus' | 'walk' | 'bike' | 'taxi' | 'train' | 'keke';

export interface TransportMode {
    type: TransportModeType;
    name: string;
    icon?: string;
    availabilityFactor: number; // 0-1 (how often available)
    baseRate?: number; // Base fare
    perKmRate?: number; // Cost per kilometer
    avgSpeedKmh?: number; // Average speed
}

// Default transport modes for Nigeria/Abuja
export const DEFAULT_TRANSPORT_MODES: TransportMode[] = [
    {
        type: 'walk',
        name: 'Walking',
        icon: 'walk',
        availabilityFactor: 1.0,
        baseRate: 0,
        perKmRate: 0,
        avgSpeedKmh: 5
    },
    {
        type: 'bus',
        name: 'Bus',
        icon: 'directions_bus',
        availabilityFactor: 0.8,
        baseRate: 100, // ₦100 base fare
        perKmRate: 20, // ₦20 per km
        avgSpeedKmh: 25
    },
    {
        type: 'keke',
        name: 'Keke NAPEP',
        icon: 'moped',
        availabilityFactor: 0.9,
        baseRate: 150,
        perKmRate: 30,
        avgSpeedKmh: 20
    },
    {
        type: 'taxi',
        name: 'Taxi',
        icon: 'local_taxi',
        availabilityFactor: 0.7,
        baseRate: 300,
        perKmRate: 50,
        avgSpeedKmh: 35
    },
    {
        type: 'bike',
        name: 'Bicycle',
        icon: 'pedal_bike',
        availabilityFactor: 0.6,
        baseRate: 0,
        perKmRate: 0,
        avgSpeedKmh: 15
    }
];

// ═══════════════════════════════════════════════════════════════════
// 3. ROUTE SEGMENT TYPES (Engine-specific)
// ═══════════════════════════════════════════════════════════════════

export interface RouteSegment {
    id: string;
    fromStop: BusStop;
    toStop: BusStop;
    distance: number; // meters
    estimatedTime: number; // minutes
    mode: TransportMode;
    cost: number; // ₦
    instructions?: string;
    boardingInstructions?: string; // e.g., "Look for green taxis under the bridge"
    waitWeight?: number; // Estimated loading time in minutes
    isPlanB?: boolean; // Flag for alternative routes
    polyline?: string; // Encoded polyline for map display

    // V2 Routing Fields
    intermediateStops?: { id: string; name: string }[];
    bridgeEnabled?: boolean; // If this segment involves a pedestrian bridge
    backbonePriority?: boolean; // If this segment is part of a major highway corridor

    // V4 Aligned Keys
    vehicleType?: TransportModeType; // Normalized mode key
    fromStop: any;                  // Normalized source (string or object)
    toStop: any;                    // Normalized target (string or object)

    // V3 Safety Guardrails
    isBridge?: boolean;       // User must use a pedestrian bridge here
    isBlocked?: boolean;      // Route is flagged as unsafe/blocked
    backboneName?: string;    // Name of expressway (e.g., "Airport Road")
    microInstructions?: string[];
    barriers?: string[];
}

// ═══════════════════════════════════════════════════════════════════
// 4. ENHANCED ROUTE TYPE (Extends TransportRoute)
// ═══════════════════════════════════════════════════════════════════

export interface GeneratedRoute {
    id: string;
    segments: RouteSegment[];
    legs?: RouteSegment[]; // NEW: Optimized segments (merged consecutive same-mode hops)
    totalDistance: number; // meters
    totalTime: number; // minutes
    totalCost: number; // ₦

    // Ranking scores (0-100)
    rankingScore: {
        shortest: number;
        cheapest: number;
        balanced: number;
    };

    // Optional: Link to your existing TransportRoute model
    transportRoute?: TransportRoute;

    // Metadata
    generatedAt: Date;
    suggestion?: string; // Handling 404/Alternative routing suggestions
    strategy: 'shortest' | 'cheapest' | 'balanced' | 'custom';
    classification?: 'FASTEST' | 'CHEAPEST' | 'BALANCED'; // NEW: ALONG Algorithm Stack classification
    comparisonLabel?: string; // NEW: e.g. "₦800 cheaper than fastest"

    // NEW: Backend optimization metadata
    metadata?: {
        optimizationApplied?: boolean;      // True if consecutive hops were merged
        corridorBonus?: number;             // Score bonus for validated corridor (negative = better)
        autoGeneratedLegs?: number;
        candidatesEvaluated?: number;
        isSurgeApplied?: boolean;           // True if Friday prayer or traffic surge is active
        backbonePriority?: boolean;         // True if route heavily utilizes highway backbones
        transferCount?: number;             // Number of vehicle changes
        ribExitApplied?: boolean;           // True if Rib Exit fee is included
        arrivalWindow?: { minMinutes: number; maxMinutes: number; confidence: number }; // Probabilistic Arrival Window (PAW)
    };
}

// ═══════════════════════════════════════════════════════════════════
// 5. TRIP STATE MACHINE (Extends Trip model)
// ═══════════════════════════════════════════════════════════════════

export type TripStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled' | 'paused';

// export interface TripState {
//     tripId: string;
//     userId: string;

//     // Link to your existing Trip model
//     trip?: Trip;

//     // Route information
//     selectedRoute: GeneratedRoute;
//     currentSegmentIndex: number;

//     // State tracking
//     status: TripStatus;
//     milestones: TripMilestone[];

//     // Location tracking
//     startLocation: Location;
//     currentLocation?: Location;
//     destinationLocation: Location;

//     // Timestamps
//     startTime?: Date;
//     endTime?: Date;
//     lastUpdated: Date;

//     // Deviation tracking
//     deviationDetected: boolean;
//     rerouteCount: number;
// }
export interface TripState {
    tripId: string;
    userId: string;
    trip?: Trip;
    selectedRoute: GeneratedRoute;
    currentSegmentIndex: number;
    status: TripStatus; // 'not_started' | 'in_progress' | 'completed' | 'cancelled' | 'paused'
    milestones: TripMilestone[];
    startLocation: Location; // ✅ Not originLocation
    currentLocation?: Location;
    destinationLocation: Location;
    startTime?: Date;
    endTime?: Date;
    lastUpdated: Date; // ✅ REQUIRED, not optional
    deviationDetected: boolean;
    rerouteCount: number;
}

export interface TripMilestone {
    stopId: number;
    stopName: string;
    segmentIndex: number;
    expectedArrivalTime: Date;
    actualArrivalTime?: Date;
    reachedAt?: Date;
    notified: boolean;
    skipped: boolean;
}

export interface TripSummary {
    tripId: string;
    userId: string;
    route: GeneratedRoute;

    // Actual vs Expected
    plannedDuration: number; // minutes
    actualDuration: number; // minutes
    plannedCost: number;
    actualCost: number;

    // Progress tracking
    milestonesReached: number;
    totalMilestones: number;
    completionPercentage: number;

    // Metadata
    startedAt: Date;
    completedAt: Date;
    deviations: number;
    reroutes: number;
}

// ═══════════════════════════════════════════════════════════════════
// 6. CROWDSOURCING TYPES
// ═══════════════════════════════════════════════════════════════════

export interface UnverifiedBusStop extends Omit<BusStop, 'id'> {
    tempId: string;
    firstSubmittedAt: Date;
    lastSubmittedAt: Date;
    status: 'pending' | 'verified' | 'rejected';
}

export interface StopVerificationSubmission {
    userId: string;
    location: Location;
    stopName: string;
    area: string;
    timestamp: Date;
    deviceInfo?: string;
}

// ═══════════════════════════════════════════════════════════════════
// 7. ENGINE EVENT TYPES
// ═══════════════════════════════════════════════════════════════════

export type TripEventType =
    | 'TRIP_STARTED'
    | 'MILESTONE_REACHED'
    | 'MILESTONE_APPROACHING'
    | 'DEVIATION_DETECTED'
    | 'REROUTE_INITIATED'
    | 'REROUTE_COMPLETED'
    | 'TRIP_COMPLETED'
    | 'TRIP_CANCELLED'
    | 'TRIP_PAUSED'
    | 'TRIP_RESUMED'
    | 'UNKNOWN_STOP_DETECTED';

export interface TripEvent {
    type: TripEventType;
    tripId: string;
    timestamp: Date;
    data?: any;
}

// Specific event payloads
export interface MilestoneReachedEvent extends TripEvent {
    type: 'MILESTONE_REACHED';
    data: {
        milestone: TripMilestone;
        remainingDistance: number;
        remainingTime: number;
    };
}

export interface DeviationDetectedEvent extends TripEvent {
    type: 'DEVIATION_DETECTED';
    data: {
        currentLocation: Location;
        expectedLocation: Location;
        deviationDistance: number;
    };
}

export interface RerouteCompletedEvent extends TripEvent {
    type: 'REROUTE_COMPLETED';
    data: {
        oldRoute: GeneratedRoute;
        newRoute: GeneratedRoute;
        reason: string;
    };
}

// ═══════════════════════════════════════════════════════════════════
// 8. REPOSITORY INTERFACES (for Dependency Injection)
// ═══════════════════════════════════════════════════════════════════

export interface IBusStopRepository {
    findById(id: number): Promise<BusStop | null>;
    findNearby(location: Location, radiusMeters: number): Promise<BusStop[]>;
    findAll(): Promise<BusStop[]>;
    findByArea(area: string): Promise<BusStop[]>;
    save(stop: Omit<BusStop, 'id' | 'createdAt'>): Promise<BusStop>;
    update(id: number, updates: Partial<BusStop>): Promise<BusStop>;
}

export interface IUnverifiedStopRepository {
    save(stop: UnverifiedBusStop): Promise<UnverifiedBusStop>;
    findByLocation(location: Location, radiusMeters: number): Promise<UnverifiedBusStop[]>;
    incrementVerification(tempId: string, userId: string): Promise<UnverifiedBusStop>;
    getVerificationCount(tempId: string): Promise<number>;
    promoteToVerified(tempId: string): Promise<BusStop>;
    findPendingStops(): Promise<UnverifiedBusStop[]>;
}

export interface ITripRepository {
    save(trip: TripState): Promise<TripState>;
    findById(tripId: string): Promise<TripState | null>;
    update(tripId: string, updates: Partial<TripState>): Promise<TripState>;
    findActiveTripsForUser(userId: string): Promise<TripState[]>;
    findCompletedTripsForUser(userId: string, limit?: number): Promise<TripState[]>;
}

// ═══════════════════════════════════════════════════════════════════
// 9. SERVICE INTERFACES (Abstract external dependencies)
// ═══════════════════════════════════════════════════════════════════

export interface ILocationService {
    getCurrentLocation(): Promise<Location>;
    watchLocation(): Observable<Location>;
    calculateDistance(from: Location, to: Location): number; // meters
    calculateBearing(from: Location, to: Location): number; // degrees
    isWithinRadius(point: Location, center: Location, radiusMeters: number): boolean;
    isOnRoute(currentLocation: Location, routePath: Location[], toleranceMeters: number): boolean;
}

export interface IRoutingService {
    calculateRoute(
        from: Location,
        to: Location,
        mode: TransportMode
    ): Promise<{
        distance: number; // meters
        duration: number; // minutes
        path: Location[];
        polyline?: string;
    }>;

    calculateMultiStopRoute(
        stops: Location[],
        mode: TransportMode
    ): Promise<{
        distance: number;
        duration: number;
        path: Location[];
        polyline?: string;
    }>;
}

export interface IFareCalculator {
    calculateFare(distance: number, mode: TransportMode): number;
    calculateSegmentFare(segment: RouteSegment): number;
    estimateTotalFare(route: GeneratedRoute): number;
}

export interface INotificationService {
    sendMilestoneNotification(userId: string, milestone: TripMilestone): Promise<void>;
    sendRerouteNotification(userId: string, reason: string): Promise<void>;
    sendTripCompletedNotification(userId: string, summary: TripSummary): Promise<void>;
    triggerVibration(pattern?: number[]): Promise<void>;
    showInAppAlert(title: string, message: string): Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════
// 10. CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

export interface EasyRouteConfig {
    // Route generation
    maxStopsPerRoute: number;
    nearbyStopRadiusMeters: number;
    maxRouteCandidates: number;

    // Trip tracking
    locationUpdateIntervalMs: number;
    milestoneProximityMeters: number;
    deviationToleranceMeters: number;

    // Crowdsourcing
    minVerificationsRequired: number;
    unknownStopDetectionRadiusMeters: number;

    // Performance
    enableCaching: boolean;
    cacheExpiryMinutes: number;

    // Rerouting config
    deviationThresholdMeters?: number;
    autoRerouteEnabled?: boolean;
    maxRerouteAttempts?: number;
}

export const DEFAULT_CONFIG: EasyRouteConfig = {
    maxStopsPerRoute: 10,
    nearbyStopRadiusMeters: 500,
    maxRouteCandidates: 5,
    locationUpdateIntervalMs: 5000,
    milestoneProximityMeters: 50,
    deviationToleranceMeters: 100,
    minVerificationsRequired: 3,
    unknownStopDetectionRadiusMeters: 100,
    enableCaching: true,
    cacheExpiryMinutes: 30
};

// ═══════════════════════════════════════════════════════════════════
// 11. UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════

export type Observable<T> = import('rxjs').Observable<T>;

export interface CacheEntry<T> {
    data: T;
    timestamp: Date;
    expiresAt: Date;
}

export interface EngineResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: Date;
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * END OF CORE TYPES
 * ═══════════════════════════════════════════════════════════════════
 * 
 * NEXT FILES TO CREATE:
 * 1. route-generation.engine.ts
 * 2. transport-mode-selector.engine.ts
 * 3. budget-computation.engine.ts
 * 4. trip-execution.engine.ts
 * 5. rerouting.engine.ts
 * 6. arrival.engine.ts
 * 7. crowdsourcing.engine.ts
 * 8. easyroute.engine.ts (orchestrator)
 */
