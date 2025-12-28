/**
 * ═══════════════════════════════════════════════════════════════════
 * EASYROUTE ORCHESTRATOR - REFACTORED VERSION
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Main coordination service using extracted focused services.
 * This is the BRAIN of EasyRoute - single API for Angular components.
 */

import { Injectable, OnDestroy, signal, computed, effect } from '@angular/core';
import { BehaviorSubject, Observable, Subject, merge } from 'rxjs';
import { map, filter, takeUntil, debounceTime } from 'rxjs/operators';

// Core Engines (existing)
import { RouteGenerationEngine } from './route-generation.engine';
import { TripExecutionEngine } from './trip-execution.engine';
import { ReroutingEngine } from './rerouting.engine';

// Extracted Services (new)
import { RouteComparatorService, RouteComparisonResult } from './routing/route-comparator.service';
import { RouteBuilderService } from './routing/route-builder.service';
import { SegmentFactoryService } from './routing/segment-factory.service';
import { TripLifecycleService, TripStartRequest } from './orchestrator/trip-lifecycle.service';
import { DeviationCheckerService } from './tracking/deviation-checker.service';
import { MilestoneTrackerService } from './tracking/milestone-tracker.service';
import { RerouteHandlerService } from './tracking/reroute-handler.service';

// Types
import {
  Location,
  GeneratedRoute,
  TripState,
  TripEvent,
  TripSummary,
  EasyRouteConfig,
  DEFAULT_CONFIG
} from './types/easyroute.types';

// ═══════════════════════════════════════════════════════════════
// STATE TYPES (exported for external use)
// ═══════════════════════════════════════════════════════════════

export interface OrchestratorState {
  isInitialized: boolean;
  hasActiveTrip: boolean;
  currentTripId: string | null;
  lastError: string | null;
}

export interface TripUpdateEvent {
  type: 'LOCATION_UPDATE' | 'MILESTONE' | 'DEVIATION' | 'REROUTE' | 'STATUS_CHANGE';
  timestamp: Date;
  tripState?: TripState;
  data?: any;
}

// Re-export for convenience
export type { RouteComparisonResult };

@Injectable({
  providedIn: 'root'
})
export class EasyRouteOrchestrator implements OnDestroy {

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC OBSERVABLES
  // ═══════════════════════════════════════════════════════════════

  public tripUpdates$: Observable<TripUpdateEvent>;
  public currentTrip$: Observable<TripState | null>;
  public state$: Observable<OrchestratorState>;
  public tripProgress$: Observable<number>;
  public remainingTime$: Observable<number | null>;
  public remainingDistance$: Observable<number | null>;

  // ═══════════════════════════════════════════════════════════════
  // SIGNALS (Modern Angular reactive state)
  // ═══════════════════════════════════════════════════════════════

  /** Read-only access to trip lifecycle state */
  readonly activeTrip = computed(() => this.tripLifecycle.activeTrip());
  readonly tripStatus = computed(() => this.tripLifecycle.status());
  readonly hasActiveTrip = computed(() => this.tripLifecycle.hasActiveTrip());
  readonly isPaused = computed(() => this.tripLifecycle.isPaused());

  /** Read-only access to milestone tracking */
  readonly milestones = computed(() => this.milestoneTracker.milestones());
  readonly currentMilestone = computed(() => this.milestoneTracker.currentMilestone());
  readonly tripProgressPercent = computed(() => this.milestoneTracker.progress());

  /** Read-only access to deviation state */
  readonly isDeviated = computed(() => this.deviationChecker.isDeviated());
  readonly currentDeviation = computed(() => this.deviationChecker.currentDeviation());

  /** Read-only access to reroute state */
  readonly hasPendingReroute = computed(() => this.rerouteHandler.hasPendingDecision());
  readonly pendingReroute = computed(() => this.rerouteHandler.getPendingDecision());

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE STATE
  // ═══════════════════════════════════════════════════════════════

  private stateSubject = new BehaviorSubject<OrchestratorState>({
    isInitialized: false,
    hasActiveTrip: false,
    currentTripId: null,
    lastError: null
  });

  private tripUpdatesSubject = new Subject<TripUpdateEvent>();
  private destroy$ = new Subject<void>();
  private config: EasyRouteConfig = DEFAULT_CONFIG;
  private deviationCheckInterval: any;

  constructor(
    // Core Engines
    private routeGeneration: RouteGenerationEngine,
    private tripExecution: TripExecutionEngine,
    private rerouting: ReroutingEngine,
    // Extracted Services
    private routeComparator: RouteComparatorService,
    private routeBuilder: RouteBuilderService,
    private segmentFactory: SegmentFactoryService,
    private tripLifecycle: TripLifecycleService,
    private deviationChecker: DeviationCheckerService,
    private milestoneTracker: MilestoneTrackerService,
    private rerouteHandler: RerouteHandlerService
  ) {
    this.state$ = this.stateSubject.asObservable();
    this.tripUpdates$ = this.tripUpdatesSubject.asObservable();
    this.currentTrip$ = this.tripExecution.activeTrip$;

    // Derived observables
    this.tripProgress$ = this.currentTrip$.pipe(
      map(trip => trip ? this.milestoneTracker.progress() : 0)
    );

    this.remainingTime$ = this.currentTrip$.pipe(
      map(() => this.tripExecution.getRemainingTime())
    );

    this.remainingDistance$ = this.currentTrip$.pipe(
      map(() => this.tripExecution.getRemainingDistance())
    );

    // Setup event subscriptions using the new services
    this.setupServiceSubscriptions();

    // Initialize
    this.initialize();
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  private async initialize(): Promise<void> {
    console.log('[EasyRoute] Initializing orchestrator (refactored)...');

    try {
      this.connectEngineEvents();
      await this.checkForActiveTrips();
      this.updateState({ isInitialized: true });
      console.log('[EasyRoute] Orchestrator initialized successfully');
    } catch (error) {
      console.error('[EasyRoute] Initialization failed:', error);
      this.updateState({
        isInitialized: false,
        lastError: 'Failed to initialize EasyRoute'
      });
    }
  }

  private setupServiceSubscriptions(): void {
    // Milestone events → Trip updates
    this.milestoneTracker.milestoneEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.emitTripUpdate({
          type: 'MILESTONE',
          timestamp: event.timestamp,
          tripState: this.tripLifecycle.activeTrip() || undefined,
          data: event
        });
      });

    // Deviation events → Trip updates
    this.deviationChecker.deviation$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.emitTripUpdate({
          type: 'DEVIATION',
          timestamp: new Date(),
          tripState: this.tripLifecycle.activeTrip() || undefined,
          data: event
        });
      });

    // Reroute events → Trip updates
    this.rerouteHandler.rerouteEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.emitTripUpdate({
          type: 'REROUTE',
          timestamp: event.timestamp,
          tripState: this.tripLifecycle.activeTrip() || undefined,
          data: event
        });
      });

    // Trip lifecycle events → Trip updates
    this.tripLifecycle.lifecycleEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.updateState({
          hasActiveTrip: this.tripLifecycle.hasActiveTrip(),
          currentTripId: this.tripLifecycle.activeTrip()?.tripId || null
        });
        this.emitTripUpdate({
          type: 'STATUS_CHANGE',
          timestamp: event.timestamp,
          tripState: this.tripLifecycle.activeTrip() || undefined,
          data: event
        });
      });
  }

  private connectEngineEvents(): void {
    // Trip execution events
    this.tripExecution.tripEvents$
      .pipe(filter(e => e !== null), takeUntil(this.destroy$))
      .subscribe(event => {
        if (event) this.handleTripEvent(event);
      });

    // Rerouting events
    this.rerouting.rerouteEvents$
      .pipe(filter(e => e !== null), takeUntil(this.destroy$))
      .subscribe(event => {
        if (event) this.handleRerouteEvent(event);
      });

    // Active trip changes
    this.tripExecution.activeTrip$
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(trip => {
        this.updateState({
          hasActiveTrip: trip !== null,
          currentTripId: trip?.tripId || null
        });
      });
  }

  private async checkForActiveTrips(): Promise<void> {
    const activeTrip = this.tripExecution.getActiveTrip();
    if (activeTrip && activeTrip.status === 'in_progress') {
      console.log('[EasyRoute] Found active trip, resuming...', activeTrip.tripId);
      this.updateState({
        hasActiveTrip: true,
        currentTripId: activeTrip.tripId
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API: TRIP PLANNING (uses RouteComparator)
  // ═══════════════════════════════════════════════════════════════

  async planTrip(
    origin: Location,
    destination: Location,
    maxAlternatives: number = 3
  ): Promise<RouteComparisonResult> {
    console.log('[EasyRoute] Planning trip...');

    try {
      const routes = await this.routeGeneration.generateRoutes(
        origin,
        destination,
        maxAlternatives
      );

      // Use the extracted RouteComparator service
      const comparisonResult = this.routeComparator.compare(routes);

      console.log('[EasyRoute] Generated', routes.length, 'route options');
      return comparisonResult;
    } catch (error) {
      console.error('[EasyRoute] Trip planning failed:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API: TRIP LIFECYCLE (uses TripLifecycle + MilestoneTracker)
  // ═══════════════════════════════════════════════════════════════

  async startTrip(
    userId: string,
    selectedRoute: GeneratedRoute,
    currentLocation?: Location
  ): Promise<TripState> {
    console.log('[EasyRoute] Starting trip...');

    const startLocation = currentLocation || selectedRoute.segments[0].fromStop;
    const destinationLocation = selectedRoute.segments[selectedRoute.segments.length - 1].toStop;

    // Use TripLifecycle to create trip state
    const tripState = this.tripLifecycle.startTrip({
      userId,
      selectedRoute,
      startLocation: {
        latitude: startLocation.latitude,
        longitude: startLocation.longitude
      },
      destinationLocation: {
        latitude: destinationLocation.latitude,
        longitude: destinationLocation.longitude
      }
    });

    // Initialize milestone tracking
    this.milestoneTracker.initializeFromTrip(tripState);

    // Reset reroute handler
    this.rerouteHandler.resetForNewTrip();

    // Start deviation monitoring
    this.startDeviationMonitoring(tripState);

    // Also start on legacy engine for compatibility
    await this.tripExecution.startTrip(userId, selectedRoute, currentLocation);

    console.log('[EasyRoute] Trip started:', tripState.tripId);
    return tripState;
  }

  pauseTrip(): void {
    this.tripLifecycle.pauseTrip();
    this.tripExecution.pauseTrip();
    this.stopDeviationMonitoring();
  }

  resumeTrip(): void {
    this.tripLifecycle.resumeTrip();
    this.tripExecution.resumeTrip();
    const trip = this.tripLifecycle.activeTrip();
    if (trip) this.startDeviationMonitoring(trip);
  }

  async completeTrip(): Promise<void> {
    const completedTrip = this.tripLifecycle.completeTrip();
    this.stopDeviationMonitoring();
    this.milestoneTracker.reset();
    await this.tripExecution.stopTrip(completedTrip?.tripId || '', 'completed');

    if (completedTrip) {
      console.log('[EasyRoute] Trip completed:', completedTrip.tripId);
    }
  }

  async cancelTrip(): Promise<void> {
    this.tripLifecycle.cancelTrip();
    this.stopDeviationMonitoring();
    this.milestoneTracker.reset();
    this.rerouteHandler.clearPendingDecision();
    const trip = this.tripLifecycle.activeTrip();
    await this.tripExecution.stopTrip(trip?.tripId || '', 'cancelled');
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API: REROUTING (uses RerouteHandler)
  // ═══════════════════════════════════════════════════════════════

  async acceptReroute(): Promise<void> {
    const decision = this.rerouteHandler.acceptPendingReroute();
    if (decision) {
      this.tripLifecycle.applyNewRoute(decision.proposedRoute);
      this.milestoneTracker.initializeFromTrip(this.tripLifecycle.activeTrip()!);
      const trip = this.tripExecution.getActiveTrip();
      if (trip) {
        await this.rerouting.acceptReroute(trip);
      }
    }
  }

  async declineReroute(): Promise<void> {
    this.rerouteHandler.declinePendingReroute();
    const trip = this.tripExecution.getActiveTrip();
    if (trip) {
      await this.rerouting.declineReroute(trip);
    }
  }

  getPendingReroute() {
    return this.rerouteHandler.getPendingDecision();
  }

  pendingReroute$() {
    return this.rerouteHandler.rerouteEvent$;
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API: GETTERS
  // ═══════════════════════════════════════════════════════════════

  getCurrentTrip(): TripState | null {
    return this.tripLifecycle.activeTrip() || this.tripExecution.getActiveTrip();
  }

  getTripProgress() {
    return {
      percentage: this.milestoneTracker.progress(),
      currentMilestone: this.milestoneTracker.currentMilestone(),
      totalMilestones: this.milestoneTracker.milestones().length
    };
  }

  getRemainingDistance(): number | null {
    return this.tripExecution.getRemainingDistance();
  }

  getRemainingTime(): number | null {
    return this.tripExecution.getRemainingTime();
  }

  generateTripSummary(trip: TripState): TripSummary {
    return {
      tripId: trip.tripId,
      userId: trip.userId,
      route: trip.selectedRoute,
      plannedDuration: trip.selectedRoute.totalTime,
      actualDuration: trip.startTime
        ? Math.round((new Date().getTime() - trip.startTime.getTime()) / 60000)
        : 0,
      plannedCost: trip.selectedRoute.totalCost,
      actualCost: trip.selectedRoute.totalCost,
      milestonesReached: this.milestoneTracker.milestones().filter(m => m.reached).length,
      totalMilestones: this.milestoneTracker.milestones().length,
      completionPercentage: this.milestoneTracker.progress(),
      startedAt: trip.startTime || new Date(),
      completedAt: trip.endTime || new Date(),
      deviations: trip.deviationDetected ? 1 : 0,
      reroutes: trip.rerouteCount
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // DEVIATION MONITORING (uses DeviationChecker)
  // ═══════════════════════════════════════════════════════════════

  private startDeviationMonitoring(tripState: TripState): void {
    console.log('[EasyRoute] Starting deviation monitoring...');

    this.deviationChecker.startMonitoring(
      () => this.tripExecution.getActiveTrip(),
      async (trip) => {
        const result = await this.rerouting.checkForDeviation(trip);
        // Map ReroutingEngine's DeviationAnalysis to DeviationChecker's format
        return {
          isDeviated: result.isDeviated,
          distanceFromRoute: result.deviationDistance,
          deviationType: this.mapSeverityToType(result.severity),
          suggestReroute: result.shouldReroute,
          timestamp: new Date()
        };
      }
    );
  }

  private stopDeviationMonitoring(): void {
    this.deviationChecker.stopMonitoring();
  }

  private mapSeverityToType(severity: 'minor' | 'moderate' | 'severe'): 'minor' | 'moderate' | 'severe' | 'none' {
    return severity;
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════

  private handleTripEvent(event: TripEvent): void {
    const trip = this.tripExecution.getActiveTrip();

    switch (event.type) {
      case 'MILESTONE_REACHED':
      case 'MILESTONE_APPROACHING':
        this.emitTripUpdate({
          type: 'MILESTONE',
          timestamp: event.timestamp,
          tripState: trip || undefined,
          data: event.data
        });
        break;

      case 'TRIP_STARTED':
      case 'TRIP_COMPLETED':
      case 'TRIP_CANCELLED':
      case 'TRIP_PAUSED':
      case 'TRIP_RESUMED':
        this.emitTripUpdate({
          type: 'STATUS_CHANGE',
          timestamp: event.timestamp,
          tripState: trip || undefined,
          data: event.data
        });
        break;
    }
  }

  private handleRerouteEvent(event: any): void {
    if (event.type === 'REROUTE_APPLIED') {
      const trip = this.tripExecution.getActiveTrip();
      this.emitTripUpdate({
        type: 'REROUTE',
        timestamp: event.timestamp,
        tripState: trip || undefined,
        data: event
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════

  private updateState(updates: Partial<OrchestratorState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...updates });
  }

  private emitTripUpdate(update: TripUpdateEvent): void {
    this.tripUpdatesSubject.next(update);
  }

  configure(config: Partial<EasyRouteConfig>): void {
    this.config = { ...this.config, ...config };
    this.routeGeneration.setConfig(this.config);
  }

  getConfig(): EasyRouteConfig {
    return { ...this.config };
  }

  isReady(): boolean {
    return this.stateSubject.value.isInitialized;
  }

  ngOnDestroy(): void {
    this.stopDeviationMonitoring();
    this.destroy$.next();
    this.destroy$.complete();
  }
}