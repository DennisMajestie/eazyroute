/**
 * Milestone Tracker Service
 * 
 * Extracted milestone tracking logic for trip progress monitoring
 */

import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { TripState, RouteSegment } from '../types/easyroute.types';

export interface Milestone {
    id: string;
    segmentIndex: number;
    stopName: string;
    stopId: string;
    type: 'departure' | 'transfer' | 'arrival';
    estimatedTime: Date;
    reached: boolean;
    reachedAt?: Date;
}

export interface MilestoneEvent {
    type: 'approaching' | 'reached' | 'missed';
    milestone: Milestone;
    tripId: string;
    timestamp: Date;
}

@Injectable({
    providedIn: 'root'
})
export class MilestoneTrackerService {

    // ═══════════════════════════════════════════════════════════════
    // STATE - Angular Signals
    // ═══════════════════════════════════════════════════════════════

    /** All milestones for current trip */
    readonly milestones = signal<Milestone[]>([]);

    /** Current milestone index */
    readonly currentMilestoneIndex = signal<number>(0);

    /** Computed: Current milestone */
    readonly currentMilestone = computed(() =>
        this.milestones()[this.currentMilestoneIndex()] || null
    );

    /** Computed: Next milestone */
    readonly nextMilestone = computed(() =>
        this.milestones()[this.currentMilestoneIndex() + 1] || null
    );

    /** Computed: Trip progress percentage */
    readonly progress = computed(() => {
        const total = this.milestones().length;
        if (total === 0) return 0;
        const reached = this.milestones().filter(m => m.reached).length;
        return Math.round((reached / total) * 100);
    });

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    private milestoneEventSubject = new Subject<MilestoneEvent>();
    readonly milestoneEvent$ = this.milestoneEventSubject.asObservable();

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    private config = {
        approachingThresholdMeters: 200,
        reachedThresholdMeters: 50
    };

    configure(options: Partial<typeof this.config>): void {
        this.config = { ...this.config, ...options };
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Initialize milestones from a trip's route segments
     */
    initializeFromTrip(trip: TripState): void {
        const milestones: Milestone[] = [];
        const segments = trip.selectedRoute.segments;

        segments.forEach((segment, index) => {
            // Add departure milestone for first segment
            if (index === 0) {
                milestones.push({
                    id: `milestone-${index}-start`,
                    segmentIndex: index,
                    stopName: segment.fromStop.name,
                    stopId: String((segment.fromStop as any)._id || segment.fromStop.id),
                    type: 'departure',
                    estimatedTime: new Date(),
                    reached: true,  // Already at start
                    reachedAt: new Date()
                });
            }

            // Add transfer/arrival milestone for end of each segment
            const isLast = index === segments.length - 1;
            milestones.push({
                id: `milestone-${index}-end`,
                segmentIndex: index,
                stopName: segment.toStop.name,
                stopId: String((segment.toStop as any)._id || segment.toStop.id),
                type: isLast ? 'arrival' : 'transfer',
                estimatedTime: this.calculateEstimatedTime(trip.startTime || new Date(), segments, index),
                reached: false
            });
        });

        this.milestones.set(milestones);
        this.currentMilestoneIndex.set(0);

        console.log('[MilestoneTracker] Initialized with', milestones.length, 'milestones');
    }

    /**
     * Reset milestone tracking
     */
    reset(): void {
        this.milestones.set([]);
        this.currentMilestoneIndex.set(0);
    }

    // ═══════════════════════════════════════════════════════════════
    // TRACKING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Check and update milestones based on current location
     */
    updateLocation(
        tripId: string,
        currentLocation: { latitude: number; longitude: number },
        milestoneLocations: Map<string, { latitude: number; longitude: number }>
    ): void {
        const current = this.milestones();
        const currentIndex = this.currentMilestoneIndex();

        for (let i = currentIndex; i < current.length; i++) {
            const milestone = current[i];
            if (milestone.reached) continue;

            const location = milestoneLocations.get(milestone.stopId);
            if (!location) continue;

            const distance = this.calculateDistance(currentLocation, location);

            if (distance <= this.config.reachedThresholdMeters) {
                this.markAsReached(tripId, i);
            } else if (distance <= this.config.approachingThresholdMeters) {
                this.emitApproaching(tripId, i);
            }
        }
    }

    /**
     * Mark a milestone as reached
     */
    markAsReached(tripId: string, milestoneIndex: number): void {
        const current = [...this.milestones()];
        if (milestoneIndex < 0 || milestoneIndex >= current.length) return;

        const milestone = current[milestoneIndex];
        if (milestone.reached) return;

        milestone.reached = true;
        milestone.reachedAt = new Date();

        this.milestones.set(current);
        this.currentMilestoneIndex.set(milestoneIndex + 1);

        this.milestoneEventSubject.next({
            type: 'reached',
            milestone,
            tripId,
            timestamp: new Date()
        });

        console.log('[MilestoneTracker] Reached:', milestone.stopName);
    }

    private emitApproaching(tripId: string, milestoneIndex: number): void {
        const milestone = this.milestones()[milestoneIndex];
        if (!milestone) return;

        this.milestoneEventSubject.next({
            type: 'approaching',
            milestone,
            tripId,
            timestamp: new Date()
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    private calculateEstimatedTime(startTime: Date, segments: RouteSegment[], upToIndex: number): Date {
        let totalMinutes = 0;
        for (let i = 0; i <= upToIndex; i++) {
            totalMinutes += segments[i].estimatedTime || 0;
        }
        return new Date(startTime.getTime() + totalMinutes * 60 * 1000);
    }

    private calculateDistance(
        loc1: { latitude: number; longitude: number },
        loc2: { latitude: number; longitude: number }
    ): number {
        const R = 6371e3;
        const φ1 = (loc1.latitude * Math.PI) / 180;
        const φ2 = (loc2.latitude * Math.PI) / 180;
        const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
        const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
}
