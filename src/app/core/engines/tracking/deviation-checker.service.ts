/**
 * Deviation Checker Service
 * 
 * Extracted from easyroute-orchestrator.engine.ts
 * Handles route deviation detection and monitoring
 */

import { Injectable, OnDestroy, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { TripState, GeneratedRoute } from '../types/easyroute.types';

export interface DeviationAnalysis {
    isDeviated: boolean;
    distanceFromRoute: number;
    deviationType: 'minor' | 'moderate' | 'severe' | 'none';
    suggestReroute: boolean;
    timestamp: Date;
}

export interface DeviationEvent {
    tripId: string;
    analysis: DeviationAnalysis;
    currentLocation: { latitude: number; longitude: number };
}

@Injectable({
    providedIn: 'root'
})
export class DeviationCheckerService implements OnDestroy {

    // ═══════════════════════════════════════════════════════════════
    // STATE - Angular Signals
    // ═══════════════════════════════════════════════════════════════

    /** Whether deviation monitoring is active */
    readonly isMonitoring = signal<boolean>(false);

    /** Current deviation status */
    readonly currentDeviation = signal<DeviationAnalysis | null>(null);

    /** Computed: Is currently deviated */
    readonly isDeviated = computed(() => this.currentDeviation()?.isDeviated ?? false);

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    private deviationSubject = new Subject<DeviationEvent>();
    readonly deviation$ = this.deviationSubject.asObservable();

    private checkInterval: any = null;
    private activeTripGetter: (() => TripState | null) | null = null;
    private deviationChecker: ((trip: TripState) => Promise<DeviationAnalysis>) | null = null;

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    private config = {
        checkIntervalMs: 10000, // Default: check every 10 seconds
        minorThresholdMeters: 50,
        moderateThresholdMeters: 150,
        severeThresholdMeters: 500
    };

    configure(options: Partial<typeof this.config>): void {
        this.config = { ...this.config, ...options };
    }

    // ═══════════════════════════════════════════════════════════════
    // MONITORING CONTROL
    // ═══════════════════════════════════════════════════════════════

    /**
     * Start deviation monitoring
     */
    startMonitoring(
        getTripFn: () => TripState | null,
        checkDeviationFn: (trip: TripState) => Promise<DeviationAnalysis>
    ): void {
        if (this.isMonitoring()) {
            console.warn('[DeviationChecker] Already monitoring');
            return;
        }

        console.log('[DeviationChecker] Starting deviation monitoring...');

        this.activeTripGetter = getTripFn;
        this.deviationChecker = checkDeviationFn;
        this.isMonitoring.set(true);

        this.checkInterval = setInterval(() => {
            this.performCheck();
        }, this.config.checkIntervalMs);
    }

    /**
     * Stop deviation monitoring
     */
    stopMonitoring(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        this.isMonitoring.set(false);
        this.currentDeviation.set(null);
        this.activeTripGetter = null;
        this.deviationChecker = null;

        console.log('[DeviationChecker] Stopped deviation monitoring');
    }

    // ═══════════════════════════════════════════════════════════════
    // DEVIATION CHECKING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Perform a single deviation check
     */
    private async performCheck(): Promise<void> {
        if (!this.activeTripGetter || !this.deviationChecker) {
            return;
        }

        const currentTrip = this.activeTripGetter();

        if (!currentTrip || currentTrip.status !== 'in_progress') {
            this.stopMonitoring();
            return;
        }

        try {
            const analysis = await this.deviationChecker(currentTrip);
            this.currentDeviation.set(analysis);

            if (analysis.isDeviated) {
                console.log('[DeviationChecker] Deviation detected:', analysis);

                this.deviationSubject.next({
                    tripId: currentTrip.tripId,
                    analysis,
                    currentLocation: currentTrip.currentLocation || { latitude: 0, longitude: 0 }
                });
            }
        } catch (error) {
            console.error('[DeviationChecker] Check failed:', error);
        }
    }

    /**
     * Classify deviation severity based on distance
     */
    classifyDeviation(distanceMeters: number): DeviationAnalysis['deviationType'] {
        if (distanceMeters < this.config.minorThresholdMeters) {
            return 'none';
        } else if (distanceMeters < this.config.moderateThresholdMeters) {
            return 'minor';
        } else if (distanceMeters < this.config.severeThresholdMeters) {
            return 'moderate';
        }
        return 'severe';
    }

    /**
     * Calculate distance from route using Haversine formula
     */
    calculateDistanceFromRoute(
        currentLocation: { latitude: number; longitude: number },
        route: GeneratedRoute
    ): number {
        // Find the closest point on the route
        let minDistance = Infinity;

        for (const segment of route.segments) {
            const segmentPoints = [
                { lat: segment.fromStop.latitude, lng: segment.fromStop.longitude },
                { lat: segment.toStop.latitude, lng: segment.toStop.longitude }
            ];

            for (const point of segmentPoints) {
                const distance = this.haversineDistance(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    point.lat,
                    point.lng
                );
                minDistance = Math.min(minDistance, distance);
            }
        }

        return minDistance;
    }

    /**
     * Haversine distance formula
     */
    private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    ngOnDestroy(): void {
        this.stopMonitoring();
    }
}
