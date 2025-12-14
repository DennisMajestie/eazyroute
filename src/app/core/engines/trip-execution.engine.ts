/**
 * ═══════════════════════════════════════════════════════════════════
 * TRIP EXECUTION ENGINE - ANGULAR SERVICE
 * ═══════════════════════════════════════════════════════════════════
 * 
 * File: src/app/core/engines/trip-execution.engine.ts
 * 
 * This service manages active trips, tracks user location in real-time,
 * detects when milestones are reached, and triggers notifications.
 * 
 * CORE RESPONSIBILITIES:
 * - Start/stop trips
 * - Track location updates
 * - Detect milestone proximity
 * - Trigger notifications
 * - Maintain trip state
 */

import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, interval } from 'rxjs';
import { BusStop } from '../../models/bus-stop.model';
import { WebSocketService } from '../services/websocket.service';
import {
    Location,
    TripState,
    TripMilestone,
    GeneratedRoute,
    TripStatus,
    TripEvent,
    TripEventType,
    IBusStopRepository,
    ITripRepository,
    ILocationService,
    INotificationService,
    EasyRouteConfig,
    DEFAULT_CONFIG
} from './types/easyroute.types';
import {
    BUS_STOP_REPOSITORY,
    LOCATION_SERVICE,
    NOTIFICATION_SERVICE
} from './adapters/engine-adapters.provider';

@Injectable({
    providedIn: 'root'
})
export class TripExecutionEngine {
    initializeTrip(currentTripState: TripState) {
        throw new Error('Method not implemented.');
    }
    // Configuration
    private config: EasyRouteConfig = DEFAULT_CONFIG;

    // Active trip state
    private activeTripSubject = new BehaviorSubject<TripState | null>(null);
    public activeTrip$ = this.activeTripSubject.asObservable();

    // Trip events stream
    private tripEventsSubject = new BehaviorSubject<TripEvent | null>(null);
    public tripEvents$ = this.tripEventsSubject.asObservable();

    // Location tracking subscription
    private locationSubscription?: Subscription;
    private trackingIntervalSubscription?: Subscription;

    constructor(
        @Inject(BUS_STOP_REPOSITORY) private busStopRepo: IBusStopRepository,
        @Inject(LOCATION_SERVICE) private locationService: ILocationService,
        @Inject(NOTIFICATION_SERVICE) private notificationService: INotificationService,
        private webSocketService: WebSocketService,
    ) { }

    /**
     * ═══════════════════════════════════════════════════════════════
     * START TRIP
     * ═══════════════════════════════════════════════════════════════
     */
    async startTrip(
        userId: string,
        selectedRoute: GeneratedRoute,
        currentLocation?: Location
    ): Promise<TripState> {
        console.log('[TripExecution] Starting trip...', { userId, routeId: selectedRoute.id });

        // Get current location if not provided
        if (!currentLocation) {
            currentLocation = await this.locationService.getCurrentLocation();
        }

        // Find nearest start stop
        const nearestStartStop = await this.findNearestStartStop(currentLocation, selectedRoute);

        // Create milestones from route segments
        const milestones = this.createMilestonesFromRoute(selectedRoute);

        // Initialize trip state
        const tripState: TripState = {
            tripId: `trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId,
            selectedRoute,
            currentSegmentIndex: 0,
            status: 'in_progress',
            milestones,
            startLocation: currentLocation,
            currentLocation,
            destinationLocation: {
                latitude: selectedRoute.segments[selectedRoute.segments.length - 1].toStop.latitude,
                longitude: selectedRoute.segments[selectedRoute.segments.length - 1].toStop.longitude
            },
            startTime: new Date(),
            lastUpdated: new Date(),
            deviationDetected: false,
            rerouteCount: 0
        };

        // Save to active trip
        this.activeTripSubject.next(tripState);

        // Start location tracking
        this.startLocationTracking(tripState.tripId);

        // Emit trip started event
        this.emitTripEvent({
            type: 'TRIP_STARTED',
            tripId: tripState.tripId,
            timestamp: new Date(),
            data: { nearestStartStop }
        });

        // Send initial notification
        await this.notificationService.showInAppAlert(
            'Trip Started',
            `Heading to ${selectedRoute.segments[selectedRoute.segments.length - 1].toStop.name}`
        );

        console.log('[TripExecution] Trip started successfully', tripState);
        return tripState;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * STOP TRIP
     * ═══════════════════════════════════════════════════════════════
     */
    async stopTrip(tripId: string, reason: 'completed' | 'cancelled'): Promise<void> {
        const tripState = this.activeTripSubject.value;

        if (!tripState || tripState.tripId !== tripId) {
            console.warn('[TripExecution] No active trip to stop');
            return;
        }

        // Stop location tracking
        this.stopLocationTracking();

        // Update trip status
        tripState.status = reason === 'completed' ? 'completed' : 'cancelled';
        tripState.endTime = new Date();

        // Emit event
        this.emitTripEvent({
            type: reason === 'completed' ? 'TRIP_COMPLETED' : 'TRIP_CANCELLED',
            tripId: tripState.tripId,
            timestamp: new Date(),
            data: { reason }
        });

        // Clear active trip
        this.activeTripSubject.next(null);

        console.log('[TripExecution] Trip stopped', { tripId, reason });
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * PAUSE/RESUME TRIP
     * ═══════════════════════════════════════════════════════════════
     */
    pauseTrip(): void {
        const tripState = this.activeTripSubject.value;
        if (!tripState) return;

        tripState.status = 'paused';
        this.stopLocationTracking();

        this.emitTripEvent({
            type: 'TRIP_PAUSED',
            tripId: tripState.tripId,
            timestamp: new Date()
        });

        this.activeTripSubject.next(tripState);
    }

    resumeTrip(): void {
        const tripState = this.activeTripSubject.value;
        if (!tripState) return;

        tripState.status = 'in_progress';
        this.startLocationTracking(tripState.tripId);

        this.emitTripEvent({
            type: 'TRIP_RESUMED',
            tripId: tripState.tripId,
            timestamp: new Date()
        });

        this.activeTripSubject.next(tripState);
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * LOCATION TRACKING
     * ═══════════════════════════════════════════════════════════════
     */
    private startLocationTracking(tripId: string): void {
        console.log('[TripExecution] Starting location tracking...');

        // Subscribe to location updates
        this.locationSubscription = this.locationService.watchLocation().subscribe({
            next: async (location) => {
                await this.handleLocationUpdate(tripId, location);
            },
            error: (error) => {
                console.error('[TripExecution] Location tracking error:', error);
            }
        });

        // Fallback: Poll location at intervals if watch doesn't work
        this.trackingIntervalSubscription = interval(this.config.locationUpdateIntervalMs)
            .subscribe(async () => {
                const tripState = this.activeTripSubject.value;
                if (tripState && tripState.status === 'in_progress') {
                    const location = await this.locationService.getCurrentLocation();
                    await this.handleLocationUpdate(tripId, location);
                }
            });
    }

    private stopLocationTracking(): void {
        console.log('[TripExecution] Stopping location tracking...');

        if (this.locationSubscription) {
            this.locationSubscription.unsubscribe();
            this.locationSubscription = undefined;
        }

        if (this.trackingIntervalSubscription) {
            this.trackingIntervalSubscription.unsubscribe();
            this.trackingIntervalSubscription = undefined;
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * HANDLE LOCATION UPDATES
     * ═══════════════════════════════════════════════════════════════
     */
    private async handleLocationUpdate(tripId: string, location: Location): Promise<void> {
        const tripState = this.activeTripSubject.value;

        if (!tripState || tripState.tripId !== tripId) {
            return;
        }

        // Update current location
        tripState.currentLocation = location;
        tripState.lastUpdated = new Date();

        // Check for milestone proximity
        await this.checkMilestoneProgress(tripState, location);

        // Check if destination reached
        await this.checkArrival(tripState, location);

        // Update state
        this.activeTripSubject.next(tripState);

        // Emit to WebSocket for real-time tracking
        this.webSocketService.emit('trip:location_update', {
            tripId,
            userId: tripState.userId,
            location,
            timestamp: new Date()
        });
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * MILESTONE DETECTION
     * ═══════════════════════════════════════════════════════════════
     */
    private async checkMilestoneProgress(
        tripState: TripState,
        currentLocation: Location
    ): Promise<void> {
        const currentSegment = tripState.selectedRoute.segments[tripState.currentSegmentIndex];
        if (!currentSegment) return;

        // Find next unreached milestone
        const nextMilestone = tripState.milestones.find(m => !m.reachedAt && !m.skipped);
        if (!nextMilestone) return;

        const stopLocation: Location = {
            latitude: currentSegment.toStop.latitude,
            longitude: currentSegment.toStop.longitude
        };

        const distanceToStop = this.locationService.calculateDistance(
            currentLocation,
            stopLocation
        );

        // Check if approaching milestone (within 100m)
        if (distanceToStop <= this.config.milestoneProximityMeters * 2 && !nextMilestone.notified) {
            await this.handleMilestoneApproaching(tripState, nextMilestone, distanceToStop);
        }

        // Check if milestone reached (within 50m)
        if (distanceToStop <= this.config.milestoneProximityMeters) {
            await this.handleMilestoneReached(tripState, nextMilestone);
        }
    }

    private async handleMilestoneApproaching(
        tripState: TripState,
        milestone: TripMilestone,
        distance: number
    ): Promise<void> {
        console.log('[TripExecution] Approaching milestone:', milestone.stopName);

        milestone.notified = true;

        this.emitTripEvent({
            type: 'MILESTONE_APPROACHING',
            tripId: tripState.tripId,
            timestamp: new Date(),
            data: {
                milestone,
                distance: Math.round(distance)
            }
        });

        await this.notificationService.showInAppAlert(
            'Approaching Stop',
            `${milestone.stopName} - ${Math.round(distance)}m away`
        );
    }

    private async handleMilestoneReached(
        tripState: TripState,
        milestone: TripMilestone
    ): Promise<void> {
        console.log('[TripExecution] Milestone reached:', milestone.stopName);

        milestone.reachedAt = new Date();
        milestone.actualArrivalTime = new Date();

        // Move to next segment
        tripState.currentSegmentIndex++;

        // Calculate remaining distance and time
        const remainingSegments = tripState.selectedRoute.segments.slice(
            tripState.currentSegmentIndex
        );
        const remainingDistance = remainingSegments.reduce(
            (sum, seg) => sum + seg.distance,
            0
        );
        const remainingTime = remainingSegments.reduce(
            (sum, seg) => sum + seg.estimatedTime,
            0
        );

        this.emitTripEvent({
            type: 'MILESTONE_REACHED',
            tripId: tripState.tripId,
            timestamp: new Date(),
            data: {
                milestone,
                remainingDistance,
                remainingTime
            }
        });

        // Trigger vibration
        await this.notificationService.triggerVibration([200, 100, 200]);

        // Send notification
        await this.notificationService.sendMilestoneNotification(
            tripState.userId,
            milestone
        );
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * ARRIVAL DETECTION
     * ═══════════════════════════════════════════════════════════════
     */
    private async checkArrival(
        tripState: TripState,
        currentLocation: Location
    ): Promise<void> {
        const distanceToDestination = this.locationService.calculateDistance(
            currentLocation,
            tripState.destinationLocation
        );

        // If within 100m of destination
        if (distanceToDestination <= 100) {
            console.log('[TripExecution] Destination reached!');
            await this.stopTrip(tripState.tripId, 'completed');
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * HELPER: Find Nearest Start Stop
     * ═══════════════════════════════════════════════════════════════
     */
    async findNearestStartStop(
        currentLocation: Location,
        route: GeneratedRoute
    ): Promise<BusStop> {
        const firstSegment = route.segments[0];
        const startStop = firstSegment.fromStop;

        // Check if already near the start stop
        const distanceToStart = this.locationService.calculateDistance(
            currentLocation,
            {
                latitude: startStop.latitude,
                longitude: startStop.longitude
            }
        );

        if (distanceToStart <= this.config.nearbyStopRadiusMeters) {
            return startStop;
        }

        // Find nearest stop from all stops in route
        let nearestStop = startStop;
        let minDistance = distanceToStart;

        for (const segment of route.segments) {
            const fromStopDistance = this.locationService.calculateDistance(
                currentLocation,
                {
                    latitude: segment.fromStop.latitude,
                    longitude: segment.fromStop.longitude
                }
            );

            if (fromStopDistance < minDistance) {
                minDistance = fromStopDistance;
                nearestStop = segment.fromStop;
            }
        }

        return nearestStop;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * HELPER: Create Milestones from Route
     * ═══════════════════════════════════════════════════════════════
     */
    private createMilestonesFromRoute(route: GeneratedRoute): TripMilestone[] {
        const milestones: TripMilestone[] = [];
        let cumulativeTime = 0;

        route.segments.forEach((segment, index) => {
            cumulativeTime += segment.estimatedTime;

            milestones.push({
                stopId: typeof segment.toStop.id === 'string' ? parseInt(segment.toStop.id) : segment.toStop.id,
                stopName: segment.toStop.name,
                segmentIndex: index,
                expectedArrivalTime: new Date(Date.now() + cumulativeTime * 60 * 1000),
                notified: false,
                skipped: false
            });
        });

        return milestones;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * EVENT EMISSION
     * ═══════════════════════════════════════════════════════════════
     */
    private emitTripEvent(event: TripEvent): void {
        this.tripEventsSubject.next(event);
        console.log('[TripExecution] Event emitted:', event.type, event.data);
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * PUBLIC GETTERS
     * ═══════════════════════════════════════════════════════════════
     */
    getActiveTrip(): TripState | null {
        return this.activeTripSubject.value;
    }

    getTripProgress(): {
        completedMilestones: number;
        totalMilestones: number;
        percentage: number;
    } | null {
        const trip = this.activeTripSubject.value;
        if (!trip) return null;

        const completed = trip.milestones.filter(m => m.reachedAt).length;
        const total = trip.milestones.length;

        return {
            completedMilestones: completed,
            totalMilestones: total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    getRemainingDistance(): number | null {
        const trip = this.activeTripSubject.value;
        if (!trip || !trip.currentLocation) return null;

        return this.locationService.calculateDistance(
            trip.currentLocation,
            trip.destinationLocation
        );
    }

    getRemainingTime(): number | null {
        const trip = this.activeTripSubject.value;
        if (!trip) return null;

        const remainingSegments = trip.selectedRoute.segments.slice(
            trip.currentSegmentIndex
        );

        return remainingSegments.reduce((sum, seg) => sum + seg.estimatedTime, 0);
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * CLEANUP
     * ═══════════════════════════════════════════════════════════════
     */
    ngOnDestroy(): void {
        this.stopLocationTracking();
    }
}