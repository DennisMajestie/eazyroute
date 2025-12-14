/**
 * ═══════════════════════════════════════════════════════════════════
 * REROUTING ENGINE - ANGULAR SERVICE
 * ═══════════════════════════════════════════════════════════════════
 * 
 * File: src/app/core/engines/rerouting.engine.ts
 * 
 * This service monitors trip progress and automatically generates new
 * routes when users deviate from their planned path. It intelligently
 * determines when a deviation is significant enough to require rerouting.
 * 
 * CORE RESPONSIBILITIES:
 * - Detect route deviations
 * - Calculate deviation severity
 * - Trigger automatic rerouting
 * - Generate alternative routes
 * - Handle user reroute confirmations
 * - Maintain deviation history
 */

import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  Location,
  TripState,
  GeneratedRoute,
  RouteSegment,
  ILocationService,
  INotificationService,
  EasyRouteConfig,
  DEFAULT_CONFIG
} from './types/easyroute.types';
import {
  LOCATION_SERVICE,
  NOTIFICATION_SERVICE
} from './adapters/engine-adapters.provider';
import { RouteGenerationEngine } from './route-generation.engine';

// ═══════════════════════════════════════════════════════════════
// LOCAL TYPES (specific to rerouting)
// ═══════════════════════════════════════════════════════════════

interface DeviationAnalysis {
  isDeviated: boolean;
  deviationDistance: number;
  deviationDuration: number;
  severity: 'minor' | 'moderate' | 'severe';
  shouldReroute: boolean;
  reason: string;
}

interface DeviationEvent {
  type: 'DEVIATION_DETECTED' | 'REROUTE_APPLIED' | 'REROUTE_DECLINED' | 'REROUTE_FAILED';
  tripId: string;
  timestamp: Date;
  deviationDistance?: number;
  severity?: 'minor' | 'moderate' | 'severe';
  currentLocation?: Location;
  newRoute?: GeneratedRoute;
  trigger?: 'auto' | 'manual';
}

interface RerouteDecision {
  tripId: string;
  currentRoute: GeneratedRoute;
  proposedRoute: GeneratedRoute;
  deviationDistance: number;
  severity: 'minor' | 'moderate' | 'severe';
  reason: string;
  timestamp: Date;
}

interface RerouteHistory {
  timestamp: Date;
  triggerReason: string;
  oldRoute: GeneratedRoute;
  newRoute: GeneratedRoute;
  deviationPoint: Location;
}

@Injectable({
  providedIn: 'root'
})
export class ReroutingEngine {
  // Configuration
  private config: EasyRouteConfig = {
    ...DEFAULT_CONFIG,
    deviationThresholdMeters: 100,
    autoRerouteEnabled: true,
    maxRerouteAttempts: 3
  };

  // Reroute events stream
  private rerouteEventsSubject = new BehaviorSubject<DeviationEvent | null>(null);
  public rerouteEvents$ = this.rerouteEventsSubject.asObservable();

  // Pending reroute decision
  private pendingRerouteSubject = new BehaviorSubject<RerouteDecision | null>(null);
  public pendingReroute$ = this.pendingRerouteSubject.asObservable();

  // Deviation tracking
  private deviationStartTime: Date | null = null;
  private lastDeviationCheck: Date | null = null;
  private consecutiveDeviations = 0;
  private rerouteHistory: RerouteHistory[] = [];

  constructor(
    @Inject(LOCATION_SERVICE) private locationService: ILocationService,
    @Inject(NOTIFICATION_SERVICE) private notificationService: INotificationService,
    private routeGenerationEngine: RouteGenerationEngine
  ) { }

  /**
   * ═══════════════════════════════════════════════════════════════
   * DEVIATION DETECTION - Main Entry Point
   * ═══════════════════════════════════════════════════════════════
   */
  async checkForDeviation(tripState: TripState): Promise<DeviationAnalysis> {
    const currentLocation = tripState.currentLocation;
    const currentSegment = tripState.selectedRoute.segments[tripState.currentSegmentIndex];

    if (!currentLocation || !currentSegment) {
      return this.createNormalAnalysis();
    }

    // Calculate distance from expected path
    const deviationDistance = this.calculateDeviationDistance(
      currentLocation,
      currentSegment
    );

    // Check if user is deviated
    const isDeviated = deviationDistance > (this.config.deviationThresholdMeters || 100);

    if (isDeviated) {
      return await this.analyzeDeviation(tripState, deviationDistance);
    } else {
      // Reset deviation tracking if back on track
      this.resetDeviationTracking();
      return this.createNormalAnalysis();
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * DEVIATION ANALYSIS
   * ═══════════════════════════════════════════════════════════════
   */
  private async analyzeDeviation(
    tripState: TripState,
    deviationDistance: number
  ): Promise<DeviationAnalysis> {
    // Track deviation start time
    if (!this.deviationStartTime) {
      this.deviationStartTime = new Date();
      console.log('[Rerouting] Deviation detected, starting timer');
    }

    const deviationDuration = this.getDeviationDuration();
    this.consecutiveDeviations++;

    // Determine severity
    const severity = this.calculateDeviationSeverity(
      deviationDistance,
      deviationDuration,
      this.consecutiveDeviations
    );

    // Decide if rerouting is needed
    const shouldReroute = this.shouldTriggerReroute(
      severity,
      deviationDistance,
      deviationDuration,
      tripState
    );

    // Build reason message
    const reason = this.buildDeviationReason(
      severity,
      deviationDistance,
      deviationDuration
    );

    const analysis: DeviationAnalysis = {
      isDeviated: true,
      deviationDistance,
      deviationDuration,
      severity,
      shouldReroute,
      reason
    };

    // If rerouting is needed, initiate the process
    if (shouldReroute && !tripState.deviationDetected) {
      await this.initiateReroute(tripState, analysis);
    }

    return analysis;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * INITIATE REROUTING PROCESS
   * ═══════════════════════════════════════════════════════════════
   */
  private async initiateReroute(
    tripState: TripState,
    analysis: DeviationAnalysis
  ): Promise<void> {
    console.log('[Rerouting] Initiating reroute process', analysis);

    // Mark deviation detected
    tripState.deviationDetected = true;

    // Emit deviation event
    this.emitDeviationEvent({
      type: 'DEVIATION_DETECTED',
      tripId: tripState.tripId,
      timestamp: new Date(),
      deviationDistance: analysis.deviationDistance,
      severity: analysis.severity,
      currentLocation: tripState.currentLocation
    });

    // Check auto-reroute setting
    if (this.config.autoRerouteEnabled) {
      await this.executeAutoReroute(tripState, analysis);
    } else {
      await this.promptUserForReroute(tripState, analysis);
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * AUTO REROUTE (Automatic)
   * ═══════════════════════════════════════════════════════════════
   */
  private async executeAutoReroute(
    tripState: TripState,
    analysis: DeviationAnalysis
  ): Promise<void> {
    console.log('[Rerouting] Executing automatic reroute');

    // Show notification
    await this.notificationService.showInAppAlert(
      'Route Deviation Detected',
      `Recalculating route... (${Math.round(analysis.deviationDistance)}m off course)`
    );

    // Generate new route
    const newRoute = await this.generateAlternativeRoute(tripState);

    if (newRoute) {
      // Apply new route
      await this.applyNewRoute(tripState, newRoute, 'auto');
    } else {
      // Failed to generate route
      await this.handleReroutingFailure(tripState);
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * PROMPT USER FOR REROUTE (Manual)
   * ═══════════════════════════════════════════════════════════════
   */
  private async promptUserForReroute(
    tripState: TripState,
    analysis: DeviationAnalysis
  ): Promise<void> {
    console.log('[Rerouting] Prompting user for reroute decision');

    // Generate alternative route first
    const newRoute = await this.generateAlternativeRoute(tripState);

    if (!newRoute) {
      await this.handleReroutingFailure(tripState);
      return;
    }

    // Create reroute decision object
    const decision: RerouteDecision = {
      tripId: tripState.tripId,
      currentRoute: tripState.selectedRoute,
      proposedRoute: newRoute,
      deviationDistance: analysis.deviationDistance,
      severity: analysis.severity,
      reason: analysis.reason,
      timestamp: new Date()
    };

    // Emit pending reroute for UI to handle
    this.pendingRerouteSubject.next(decision);

    // Show notification
    await this.notificationService.showInAppAlert(
      'Route Deviation',
      `You're ${Math.round(analysis.deviationDistance)}m off course. Accept new route?`
    );
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * GENERATE ALTERNATIVE ROUTE
   * ═══════════════════════════════════════════════════════════════
   */
  private async generateAlternativeRoute(
    tripState: TripState
  ): Promise<GeneratedRoute | null> {
    try {
      const currentLocation = tripState.currentLocation;
      if (!currentLocation) {
        console.error('[Rerouting] No current location available');
        return null;
      }

      const destination = tripState.destinationLocation;

      console.log('[Rerouting] Generating alternative route from current location');

      // Use RouteGenerationEngine to generate new routes
      const alternatives = await this.routeGenerationEngine.generateRoutes(
        currentLocation,
        destination,
        3 // maxAlternatives
      );

      if (alternatives.length === 0) {
        console.error('[Rerouting] No alternative routes found');
        return null;
      }

      // Select best alternative (first one is usually optimal)
      const newRoute = alternatives[0];

      console.log('[Rerouting] Alternative route generated', {
        segments: newRoute.segments.length,
        totalTime: newRoute.totalTime,
        totalCost: newRoute.totalCost
      });

      return newRoute;
    } catch (error) {
      console.error('[Rerouting] Failed to generate alternative route:', error);
      return null;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * APPLY NEW ROUTE
   * ═══════════════════════════════════════════════════════════════
   */
  async applyNewRoute(
    tripState: TripState,
    newRoute: GeneratedRoute,
    trigger: 'auto' | 'manual'
  ): Promise<void> {
    console.log('[Rerouting] Applying new route', { trigger });

    if (!tripState.currentLocation) return;

    // Store old route in history
    const rerouteRecord: RerouteHistory = {
      timestamp: new Date(),
      triggerReason: trigger === 'auto' ? 'Automatic reroute' : 'User accepted reroute',
      oldRoute: tripState.selectedRoute,
      newRoute: newRoute,
      deviationPoint: tripState.currentLocation
    };
    this.rerouteHistory.push(rerouteRecord);

    // Update trip state
    tripState.selectedRoute = newRoute;
    tripState.currentSegmentIndex = 0;
    tripState.milestones = this.createMilestonesFromRoute(newRoute);
    tripState.deviationDetected = false;
    tripState.rerouteCount++;

    // Reset deviation tracking
    this.resetDeviationTracking();

    // Clear pending reroute
    this.pendingRerouteSubject.next(null);

    // Emit reroute event
    this.emitDeviationEvent({
      type: 'REROUTE_APPLIED',
      tripId: tripState.tripId,
      timestamp: new Date(),
      newRoute: newRoute,
      trigger: trigger
    });

    // Show success notification
    await this.notificationService.showInAppAlert(
      'Route Updated',
      `New route: ${newRoute.totalTime} min, ${this.formatCost(newRoute.totalCost)}`
    );

    // Trigger vibration feedback
    await this.notificationService.triggerVibration([100, 50, 100]);
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * USER ACTIONS
   * ═══════════════════════════════════════════════════════════════
   */
  async acceptReroute(tripState: TripState): Promise<void> {
    const decision = this.pendingRerouteSubject.value;
    if (!decision || decision.tripId !== tripState.tripId) {
      console.warn('[Rerouting] No pending reroute to accept');
      return;
    }

    await this.applyNewRoute(tripState, decision.proposedRoute, 'manual');
  }

  async declineReroute(tripState: TripState): Promise<void> {
    const decision = this.pendingRerouteSubject.value;
    if (!decision || decision.tripId !== tripState.tripId) {
      console.warn('[Rerouting] No pending reroute to decline');
      return;
    }

    console.log('[Rerouting] User declined reroute');

    // Clear pending reroute
    this.pendingRerouteSubject.next(null);

    // Reset deviation flag (but keep tracking)
    tripState.deviationDetected = false;

    // Emit event
    this.emitDeviationEvent({
      type: 'REROUTE_DECLINED',
      tripId: tripState.tripId,
      timestamp: new Date()
    });

    // Show notification
    await this.notificationService.showInAppAlert(
      'Continuing on Original Route',
      'Trying to guide you back on track'
    );
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * DEVIATION CALCULATIONS
   * ═══════════════════════════════════════════════════════════════
   */
  private calculateDeviationDistance(
    currentLocation: Location,
    currentSegment: RouteSegment
  ): number {
    // Calculate distance to the expected path (line between from and to stops)
    const fromStop: Location = {
      latitude: currentSegment.fromStop.latitude,
      longitude: currentSegment.fromStop.longitude
    };
    const toStop: Location = {
      latitude: currentSegment.toStop.latitude,
      longitude: currentSegment.toStop.longitude
    };

    // Simple implementation: distance to nearest endpoint
    // (In production, use proper perpendicular distance to line segment)
    const distToFrom = this.locationService.calculateDistance(currentLocation, fromStop);
    const distToTo = this.locationService.calculateDistance(currentLocation, toStop);

    return Math.min(distToFrom, distToTo);
  }

  private calculateDeviationSeverity(
    distance: number,
    duration: number,
    consecutiveCount: number
  ): 'minor' | 'moderate' | 'severe' {
    // Severe: Very far off or deviated for long time
    if (distance > 500 || duration > 300 || consecutiveCount > 10) {
      return 'severe';
    }

    // Moderate: Moderately off course
    if (distance > 200 || duration > 120 || consecutiveCount > 5) {
      return 'moderate';
    }

    // Minor: Just slightly off
    return 'minor';
  }

  private shouldTriggerReroute(
    severity: 'minor' | 'moderate' | 'severe',
    distance: number,
    duration: number,
    tripState: TripState
  ): boolean {
    // Don't reroute too frequently
    const maxAttempts = this.config.maxRerouteAttempts || 3;
    if (tripState.rerouteCount >= maxAttempts) {
      console.log('[Rerouting] Max reroute attempts reached');
      return false;
    }

    // Severe deviations always trigger
    if (severity === 'severe') {
      return true;
    }

    // Moderate deviations trigger after sustained period
    if (severity === 'moderate' && duration > 60) {
      return true;
    }

    // Minor deviations only after extended time
    if (severity === 'minor' && duration > 180) {
      return true;
    }

    return false;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * HELPER FUNCTIONS
   * ═══════════════════════════════════════════════════════════════
   */
  private getDeviationDuration(): number {
    if (!this.deviationStartTime) return 0;
    return Math.floor((Date.now() - this.deviationStartTime.getTime()) / 1000);
  }

  private resetDeviationTracking(): void {
    this.deviationStartTime = null;
    this.consecutiveDeviations = 0;
  }

  private createNormalAnalysis(): DeviationAnalysis {
    return {
      isDeviated: false,
      deviationDistance: 0,
      deviationDuration: 0,
      severity: 'minor',
      shouldReroute: false,
      reason: 'On track'
    };
  }

  private buildDeviationReason(
    severity: 'minor' | 'moderate' | 'severe',
    distance: number,
    duration: number
  ): string {
    if (severity === 'severe') {
      return `Significantly off course (${Math.round(distance)}m, ${duration}s)`;
    }
    if (severity === 'moderate') {
      return `Moderately off course (${Math.round(distance)}m)`;
    }
    return `Slightly off course (${Math.round(distance)}m)`;
  }

  private async handleReroutingFailure(tripState: TripState): Promise<void> {
    console.error('[Rerouting] Failed to generate reroute');

    tripState.deviationDetected = false;

    await this.notificationService.showInAppAlert(
      'Rerouting Failed',
      'Could not find alternative route. Continue to original destination.'
    );

    this.emitDeviationEvent({
      type: 'REROUTE_FAILED',
      tripId: tripState.tripId,
      timestamp: new Date()
    });
  }

  private createMilestonesFromRoute(route: GeneratedRoute): any[] {
    const milestones: any[] = [];
    let cumulativeTime = 0;

    route.segments.forEach((segment, index) => {
      cumulativeTime += segment.estimatedTime;

      milestones.push({
        stopId: segment.toStop.id,
        stopName: segment.toStop.name,
        segmentIndex: index,
        expectedArrivalTime: new Date(Date.now() + cumulativeTime * 60 * 1000),
        notified: false,
        skipped: false
      });
    });

    return milestones;
  }

  private formatCost(cost: number): string {
    return `₦${cost.toFixed(0)}`;
  }

  private emitDeviationEvent(event: DeviationEvent): void {
    this.rerouteEventsSubject.next(event);
    console.log('[Rerouting] Event emitted:', event.type);
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * PUBLIC GETTERS
   * ═══════════════════════════════════════════════════════════════
   */
  getRerouteHistory(): RerouteHistory[] {
    return [...this.rerouteHistory];
  }

  getPendingReroute(): RerouteDecision | null {
    return this.pendingRerouteSubject.value;
  }

  isDeviationTracking(): boolean {
    return this.deviationStartTime !== null;
  }

  getDeviationMetrics(): {
    isTracking: boolean;
    duration: number;
    consecutiveCount: number;
  } {
    return {
      isTracking: this.deviationStartTime !== null,
      duration: this.getDeviationDuration(),
      consecutiveCount: this.consecutiveDeviations
    };
  }
}