/**
 * Trip Lifecycle Service
 * 
 * Manages trip state transitions: start, pause, resume, complete, cancel
 * Extracted from easyroute-orchestrator.engine.ts
 */

import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { TripState, TripStatus, GeneratedRoute, Location } from '../types/easyroute.types';

export interface TripStartRequest {
    userId: string;
    selectedRoute: GeneratedRoute;
    startLocation: Location;
    destinationLocation: Location;
}

export interface TripLifecycleEvent {
    type: 'started' | 'paused' | 'resumed' | 'completed' | 'cancelled';
    tripId: string;
    timestamp: Date;
    data?: any;
}

@Injectable({
    providedIn: 'root'
})
export class TripLifecycleService {

    // ═══════════════════════════════════════════════════════════════
    // STATE - Angular Signals
    // ═══════════════════════════════════════════════════════════════

    /** Current active trip */
    readonly activeTrip = signal<TripState | null>(null);

    /** Trip status shorthand */
    readonly status = computed(() => this.activeTrip()?.status || 'not_started');

    /** Computed: Has active trip */
    readonly hasActiveTrip = computed(() => {
        const trip = this.activeTrip();
        return trip !== null && trip.status === 'in_progress';
    });

    /** Computed: Is trip paused */
    readonly isPaused = computed(() => this.status() === 'paused');

    /** Computed: Is trip in progress */
    readonly isInProgress = computed(() => this.status() === 'in_progress');

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    private lifecycleEventSubject = new Subject<TripLifecycleEvent>();
    readonly lifecycleEvent$ = this.lifecycleEventSubject.asObservable();

    // ═══════════════════════════════════════════════════════════════
    // TRIP LIFECYCLE METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Start a new trip
     */
    startTrip(request: TripStartRequest): TripState {
        const tripId = this.generateTripId();
        const now = new Date();

        const tripState: TripState = {
            tripId,
            userId: request.userId,
            selectedRoute: request.selectedRoute,
            currentSegmentIndex: 0,
            status: 'in_progress',
            milestones: [],
            startLocation: request.startLocation,
            currentLocation: request.startLocation,
            destinationLocation: request.destinationLocation,
            startTime: now,
            lastUpdated: now,
            deviationDetected: false,
            rerouteCount: 0
        };

        this.activeTrip.set(tripState);

        this.emitEvent('started', tripId, {
            route: request.selectedRoute,
            startLocation: request.startLocation
        });

        console.log('[TripLifecycle] Trip started:', tripId);
        return tripState;
    }

    /**
     * Pause the active trip
     */
    pauseTrip(): boolean {
        const trip = this.activeTrip();
        if (!trip || trip.status !== 'in_progress') {
            console.warn('[TripLifecycle] Cannot pause - no active trip');
            return false;
        }

        const updatedTrip: TripState = {
            ...trip,
            status: 'paused',
            lastUpdated: new Date()
        };

        this.activeTrip.set(updatedTrip);
        this.emitEvent('paused', trip.tripId);

        console.log('[TripLifecycle] Trip paused:', trip.tripId);
        return true;
    }

    /**
     * Resume a paused trip
     */
    resumeTrip(): boolean {
        const trip = this.activeTrip();
        if (!trip || trip.status !== 'paused') {
            console.warn('[TripLifecycle] Cannot resume - trip not paused');
            return false;
        }

        const updatedTrip: TripState = {
            ...trip,
            status: 'in_progress',
            lastUpdated: new Date()
        };

        this.activeTrip.set(updatedTrip);
        this.emitEvent('resumed', trip.tripId);

        console.log('[TripLifecycle] Trip resumed:', trip.tripId);
        return true;
    }

    /**
     * Complete the active trip
     */
    completeTrip(): TripState | null {
        const trip = this.activeTrip();
        if (!trip) {
            console.warn('[TripLifecycle] Cannot complete - no active trip');
            return null;
        }

        const completedTrip: TripState = {
            ...trip,
            status: 'completed',
            endTime: new Date(),
            lastUpdated: new Date()
        };

        this.activeTrip.set(null);
        this.emitEvent('completed', trip.tripId, {
            duration: this.calculateDuration(trip),
            segmentsCompleted: trip.currentSegmentIndex + 1
        });

        console.log('[TripLifecycle] Trip completed:', trip.tripId);
        return completedTrip;
    }

    /**
     * Cancel the active trip
     */
    cancelTrip(reason?: string): TripState | null {
        const trip = this.activeTrip();
        if (!trip) {
            console.warn('[TripLifecycle] Cannot cancel - no active trip');
            return null;
        }

        const cancelledTrip: TripState = {
            ...trip,
            status: 'cancelled',
            endTime: new Date(),
            lastUpdated: new Date()
        };

        this.activeTrip.set(null);
        this.emitEvent('cancelled', trip.tripId, { reason });

        console.log('[TripLifecycle] Trip cancelled:', trip.tripId, reason);
        return cancelledTrip;
    }

    // ═══════════════════════════════════════════════════════════════
    // TRIP STATE UPDATES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Update trip location
     */
    updateLocation(location: Location): void {
        const trip = this.activeTrip();
        if (!trip) return;

        this.activeTrip.set({
            ...trip,
            currentLocation: location,
            lastUpdated: new Date()
        });
    }

    /**
     * Update current segment index
     */
    updateSegmentIndex(index: number): void {
        const trip = this.activeTrip();
        if (!trip) return;

        this.activeTrip.set({
            ...trip,
            currentSegmentIndex: index,
            lastUpdated: new Date()
        });
    }

    /**
     * Apply a new route (after reroute)
     */
    applyNewRoute(newRoute: GeneratedRoute): void {
        const trip = this.activeTrip();
        if (!trip) return;

        this.activeTrip.set({
            ...trip,
            selectedRoute: newRoute,
            currentSegmentIndex: 0,
            rerouteCount: trip.rerouteCount + 1,
            lastUpdated: new Date()
        });
    }

    /**
     * Flag deviation detected
     */
    flagDeviation(detected: boolean): void {
        const trip = this.activeTrip();
        if (!trip) return;

        this.activeTrip.set({
            ...trip,
            deviationDetected: detected,
            lastUpdated: new Date()
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    private generateTripId(): string {
        return `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private calculateDuration(trip: TripState): number {
        if (!trip.startTime) return 0;
        const endTime = trip.endTime || new Date();
        return Math.round((endTime.getTime() - trip.startTime.getTime()) / 60000); // minutes
    }

    private emitEvent(
        type: TripLifecycleEvent['type'],
        tripId: string,
        data?: any
    ): void {
        this.lifecycleEventSubject.next({
            type,
            tripId,
            timestamp: new Date(),
            data
        });
    }

    /**
     * Get current trip state
     */
    getCurrentTrip(): TripState | null {
        return this.activeTrip();
    }

    /**
     * Get trip progress percentage
     */
    getProgress(): number {
        const trip = this.activeTrip();
        if (!trip) return 0;

        const total = trip.selectedRoute.segments.length;
        const current = trip.currentSegmentIndex;
        return Math.round((current / total) * 100);
    }
}
