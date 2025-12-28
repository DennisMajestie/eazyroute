/**
 * Reroute Handler Service
 * 
 * Handles reroute decisions, user prompts, and history tracking
 * Extracted from rerouting.engine.ts
 */

import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { GeneratedRoute, Location, TripState } from '../types/easyroute.types';

export interface RerouteDecision {
    tripId: string;
    currentRoute: GeneratedRoute;
    proposedRoute: GeneratedRoute;
    deviationDistance: number;
    severity: 'minor' | 'moderate' | 'severe';
    reason: string;
    timestamp: Date;
}

export interface RerouteHistory {
    timestamp: Date;
    triggerReason: string;
    oldRoute: GeneratedRoute;
    newRoute: GeneratedRoute;
    deviationPoint: Location;
    trigger: 'auto' | 'manual';
}

export interface RerouteEvent {
    type: 'proposed' | 'accepted' | 'declined' | 'applied' | 'failed';
    tripId: string;
    timestamp: Date;
    decision?: RerouteDecision;
    error?: string;
}

@Injectable({
    providedIn: 'root'
})
export class RerouteHandlerService {

    // ═══════════════════════════════════════════════════════════════
    // STATE - Angular Signals
    // ═══════════════════════════════════════════════════════════════

    /** Pending reroute decision waiting for user action */
    readonly pendingDecision = signal<RerouteDecision | null>(null);

    /** History of all reroutes for current trip */
    readonly rerouteHistory = signal<RerouteHistory[]>([]);

    /** Current reroute attempt count */
    readonly rerouteAttempts = signal<number>(0);

    /** Computed: Has pending decision */
    readonly hasPendingDecision = computed(() => this.pendingDecision() !== null);

    /** Computed: Total reroutes applied */
    readonly totalReroutes = computed(() => this.rerouteHistory().length);

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    private rerouteEventSubject = new Subject<RerouteEvent>();
    readonly rerouteEvent$ = this.rerouteEventSubject.asObservable();

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    private config = {
        maxRerouteAttempts: 3,
        autoRerouteEnabled: true,
        decisionTimeoutMs: 30000  // 30 seconds to decide
    };

    configure(options: Partial<typeof this.config>): void {
        this.config = { ...this.config, ...options };
    }

    // ═══════════════════════════════════════════════════════════════
    // REROUTE DECISION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Propose a reroute to the user
     */
    proposeReroute(decision: RerouteDecision): void {
        this.pendingDecision.set(decision);
        this.rerouteAttempts.update(count => count + 1);

        this.rerouteEventSubject.next({
            type: 'proposed',
            tripId: decision.tripId,
            timestamp: new Date(),
            decision
        });

        console.log('[RerouteHandler] Proposed reroute:', decision.reason);
    }

    /**
     * User accepts the pending reroute
     */
    acceptPendingReroute(): RerouteDecision | null {
        const decision = this.pendingDecision();
        if (!decision) {
            console.warn('[RerouteHandler] No pending decision to accept');
            return null;
        }

        this.rerouteEventSubject.next({
            type: 'accepted',
            tripId: decision.tripId,
            timestamp: new Date(),
            decision
        });

        this.pendingDecision.set(null);
        return decision;
    }

    /**
     * User declines the pending reroute
     */
    declinePendingReroute(): void {
        const decision = this.pendingDecision();
        if (!decision) {
            console.warn('[RerouteHandler] No pending decision to decline');
            return;
        }

        this.rerouteEventSubject.next({
            type: 'declined',
            tripId: decision.tripId,
            timestamp: new Date(),
            decision
        });

        this.pendingDecision.set(null);
        console.log('[RerouteHandler] User declined reroute');
    }

    /**
     * Record a successfully applied reroute
     */
    recordAppliedReroute(
        tripId: string,
        oldRoute: GeneratedRoute,
        newRoute: GeneratedRoute,
        deviationPoint: Location,
        trigger: 'auto' | 'manual',
        reason: string
    ): void {
        const historyEntry: RerouteHistory = {
            timestamp: new Date(),
            triggerReason: reason,
            oldRoute,
            newRoute,
            deviationPoint,
            trigger
        };

        this.rerouteHistory.update(history => [...history, historyEntry]);

        this.rerouteEventSubject.next({
            type: 'applied',
            tripId,
            timestamp: new Date()
        });

        console.log('[RerouteHandler] Reroute applied successfully');
    }

    /**
     * Record a failed reroute attempt
     */
    recordFailedReroute(tripId: string, error: string): void {
        this.rerouteEventSubject.next({
            type: 'failed',
            tripId,
            timestamp: new Date(),
            error
        });

        console.error('[RerouteHandler] Reroute failed:', error);
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Check if more reroute attempts are allowed
     */
    canAttemptReroute(): boolean {
        return this.rerouteAttempts() < this.config.maxRerouteAttempts;
    }

    /**
     * Check if auto-reroute is enabled
     */
    isAutoRerouteEnabled(): boolean {
        return this.config.autoRerouteEnabled;
    }

    /**
     * Get pending decision (if any)
     */
    getPendingDecision(): RerouteDecision | null {
        return this.pendingDecision();
    }

    /**
     * Clear pending decision without action
     */
    clearPendingDecision(): void {
        this.pendingDecision.set(null);
    }

    /**
     * Reset for new trip
     */
    resetForNewTrip(): void {
        this.pendingDecision.set(null);
        this.rerouteHistory.set([]);
        this.rerouteAttempts.set(0);
    }

    /**
     * Get reroute statistics
     */
    getStats(): {
        totalReroutes: number;
        autoReroutes: number;
        manualReroutes: number;
        attemptCount: number;
    } {
        const history = this.rerouteHistory();
        return {
            totalReroutes: history.length,
            autoReroutes: history.filter(h => h.trigger === 'auto').length,
            manualReroutes: history.filter(h => h.trigger === 'manual').length,
            attemptCount: this.rerouteAttempts()
        };
    }
}
