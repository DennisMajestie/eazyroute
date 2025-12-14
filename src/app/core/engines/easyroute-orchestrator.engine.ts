/**
 * ═══════════════════════════════════════════════════════════════════
 * EASYROUTE ORCHESTRATOR - MAIN COORDINATION SERVICE
 * ═══════════════════════════════════════════════════════════════════
 * 
 * File: src/app/core/engines/easyroute.orchestrator.ts
 * 
 * This is the BRAIN of EasyRoute. It coordinates all engines and provides
 * a single, clean API for your Angular components to interact with.
 * 
 * ARCHITECTURE:
 * - Single entry point for all EasyRoute features
 * - Manages engine lifecycle and coordination
 * - Handles cross-engine communication
 * - Provides observable streams for UI updates
 * - Manages state consistency across engines
 * 
 * USAGE IN COMPONENTS:
 * ```typescript
 * constructor(private easyroute: EasyRouteOrchestrator) {}
 * 
 * // Plan a trip
 * this.easyroute.planTrip(origin, destination).subscribe(routes => {
 *   // Show route options to user
 * });
 * 
 * // Start tracking
 * this.easyroute.startTrip(userId, selectedRoute);
 * 
 * // Listen to updates
 * this.easyroute.tripUpdates$.subscribe(update => {
 *   // Update UI
 * });
 * ```
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, combineLatest, merge } from 'rxjs';
import { map, filter, takeUntil, debounceTime } from 'rxjs/operators';

// Engines
import { RouteGenerationEngine } from './route-generation.engine';
import { TripExecutionEngine } from './trip-execution.engine';
import { ReroutingEngine } from './rerouting.engine';

// Types
import {
  Location,
  GeneratedRoute,
  TripState,
  TripEvent,
  TripStatus,
  TripSummary,
  EasyRouteConfig,
  DEFAULT_CONFIG
} from './types/easyroute.types';

/**
 * ═══════════════════════════════════════════════════════════════
 * ORCHESTRATOR STATE TYPES
 * ═══════════════════════════════════════════════════════════════
 */

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

export interface RouteComparisonResult {
  routes: GeneratedRoute[];
  recommended: GeneratedRoute;
  comparisonFactors: {
    fastest: GeneratedRoute;
    cheapest: GeneratedRoute;
    mostBalanced: GeneratedRoute;
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * MAIN ORCHESTRATOR CLASS
 * ═══════════════════════════════════════════════════════════════
 */

@Injectable({
  providedIn: 'root'
})
export class EasyRouteOrchestrator implements OnDestroy {

  // ═══════════════════════════════════════════════════════════════
  // OBSERVABLES - Subscribe to these in your components!
  // ═══════════════════════════════════════════════════════════════

  /**
   * Main stream of trip updates - subscribe to this for real-time tracking
   */
  public tripUpdates$: Observable<TripUpdateEvent>;

  /**
   * Current trip state - always has the latest trip info
   */
  public currentTrip$: Observable<TripState | null>;

  /**
   * Orchestrator state - initialization, errors, etc.
   */
  public state$: Observable<OrchestratorState>;

  /**
   * Trip progress percentage (0-100)
   */
  public tripProgress$: Observable<number>;

  /**
   * Remaining time to destination (in minutes)
   */
  public remainingTime$: Observable<number | null>;

  /**
   * Remaining distance to destination (in meters)
   */
  public remainingDistance$: Observable<number | null>;

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

  constructor(
    private routeGeneration: RouteGenerationEngine,
    private tripExecution: TripExecutionEngine,
    private rerouting: ReroutingEngine
  ) {
    // Initialize observables
    this.state$ = this.stateSubject.asObservable();
    this.tripUpdates$ = this.tripUpdatesSubject.asObservable();
    this.currentTrip$ = this.tripExecution.activeTrip$;

    // Derived observables
    this.tripProgress$ = this.currentTrip$.pipe(
      map(trip => {
        if (!trip) return 0;
        const progress = this.tripExecution.getTripProgress();
        return progress ? progress.percentage : 0;
      })
    );

    this.remainingTime$ = this.currentTrip$.pipe(
      map(() => this.tripExecution.getRemainingTime())
    );

    this.remainingDistance$ = this.currentTrip$.pipe(
      map(() => this.tripExecution.getRemainingDistance())
    );

    // Initialize
    this.initialize();
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * INITIALIZATION
   * ═══════════════════════════════════════════════════════════════
   */
  private async initialize(): Promise<void> {
    console.log('[EasyRoute] Initializing orchestrator...');

    try {
      // Wire up engine events
      this.connectEngineEvents();

      // Check for active trips (resume functionality)
      await this.checkForActiveTrips();

      // Mark as initialized
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

  /**
   * Connect to all engine event streams and unify them
   */
  private connectEngineEvents(): void {
    // Trip execution events
    this.tripExecution.tripEvents$
      .pipe(
        filter(event => event !== null),
        takeUntil(this.destroy$)
      )
      .subscribe(event => {
        if (event) {
          this.handleTripEvent(event);
        }
      });

    // Rerouting events
    this.rerouting.rerouteEvents$
      .pipe(
        filter(event => event !== null),
        takeUntil(this.destroy$)
      )
      .subscribe(event => {
        if (event) {
          this.handleRerouteEvent(event);
        }
      });

    // Active trip changes
    this.tripExecution.activeTrip$
      .pipe(
        debounceTime(100), // Debounce rapid updates
        takeUntil(this.destroy$)
      )
      .subscribe(trip => {
        this.updateState({
          hasActiveTrip: trip !== null,
          currentTripId: trip?.tripId || null
        });

        if (trip) {
          this.emitTripUpdate({
            type: 'STATUS_CHANGE',
            timestamp: new Date(),
            tripState: trip
          });
        }
      });
  }

  /**
   * Check if there are any active trips to resume
   */
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

  /**
   * ═══════════════════════════════════════════════════════════════
   * ROUTE PLANNING API
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * Plan a trip - generates multiple route options
   * 
   * @param origin Starting location
   * @param destination Ending location
   * @param maxAlternatives Number of route options to generate (default: 3)
   * @returns Array of route options
   */
  async planTrip(
    origin: Location,
    destination: Location,
    maxAlternatives: number = 3
  ): Promise<RouteComparisonResult> {
    console.log('[EasyRoute] Planning trip...', { origin, destination });

    try {
      // Generate routes using the route generation engine
      const routes = await this.routeGeneration.generateRoutes(
        origin,
        destination,
        maxAlternatives
      );

      if (routes.length === 0) {
        throw new Error('No routes found between origin and destination');
      }

      // Analyze and compare routes
      const comparison = this.compareRoutes(routes);

      console.log('[EasyRoute] Trip planned successfully', {
        routeCount: routes.length,
        recommended: comparison.recommended.id
      });

      return comparison;

    } catch (error) {
      console.error('[EasyRoute] Trip planning failed:', error);
      this.updateState({ lastError: 'Failed to plan trip' });
      throw error;
    }
  }

  /**
   * Compare multiple routes and identify the best option
   */
  private compareRoutes(routes: GeneratedRoute[]): RouteComparisonResult {
    // Find fastest route
    const fastest = routes.reduce((min, route) =>
      route.totalTime < min.totalTime ? route : min
    );

    // Find cheapest route
    const cheapest = routes.reduce((min, route) =>
      route.totalCost < min.totalCost ? route : min
    );

    // Find most balanced (weighted score)
    const mostBalanced = routes.reduce((best, route) => {
      const currentScore = this.calculateBalanceScore(route);
      const bestScore = this.calculateBalanceScore(best);
      return currentScore > bestScore ? route : best;
    });

    // Recommend the balanced route by default
    const recommended = mostBalanced;

    return {
      routes,
      recommended,
      comparisonFactors: {
        fastest,
        cheapest,
        mostBalanced
      }
    };
  }

  /**
   * Calculate a balanced score for route ranking
   * Higher score = better overall value
   */
  private calculateBalanceScore(route: GeneratedRoute): number {
    // Normalize values (0-100 scale)
    const timeScore = 100 - Math.min(route.totalTime / 2, 100); // Favor shorter times
    const costScore = 100 - Math.min(route.totalCost / 20, 100); // Favor lower costs

    // Weighted average (60% time, 40% cost)
    return (timeScore * 0.6) + (costScore * 0.4);
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * TRIP EXECUTION API
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * Start a trip with the selected route
   * 
   * @param userId User starting the trip
   * @param selectedRoute The route to follow
   * @param currentLocation Optional current location (will detect if not provided)
   * @returns The started trip state
   */
  async startTrip(
    userId: string,
    selectedRoute: GeneratedRoute,
    currentLocation?: Location
  ): Promise<TripState> {
    console.log('[EasyRoute] Starting trip...', { userId, routeId: selectedRoute.id });

    try {
      // Start trip via execution engine
      const tripState = await this.tripExecution.startTrip(
        userId,
        selectedRoute,
        currentLocation
      );

      // Enable automatic deviation checking
      this.startDeviationMonitoring(tripState);

      console.log('[EasyRoute] Trip started successfully', tripState.tripId);

      return tripState;

    } catch (error) {
      console.error('[EasyRoute] Failed to start trip:', error);
      this.updateState({ lastError: 'Failed to start trip' });
      throw error;
    }
  }

  /**
   * Pause the active trip
   */
  pauseTrip(): void {
    console.log('[EasyRoute] Pausing trip...');
    this.tripExecution.pauseTrip();
    this.stopDeviationMonitoring();
  }

  /**
   * Resume a paused trip
   */
  resumeTrip(): void {
    console.log('[EasyRoute] Resuming trip...');
    const trip = this.tripExecution.getActiveTrip();
    this.tripExecution.resumeTrip();
    if (trip) {
      this.startDeviationMonitoring(trip);
    }
  }

  /**
   * Complete the active trip
   */
  async completeTrip(): Promise<void> {
    console.log('[EasyRoute] Completing trip...');
    const trip = this.tripExecution.getActiveTrip();
    if (trip) {
      await this.tripExecution.stopTrip(trip.tripId, 'completed');
      this.stopDeviationMonitoring();

      // Generate trip summary
      const summary = this.generateTripSummary(trip);
      console.log('[EasyRoute] Trip completed', summary);
    }
  }

  /**
   * Cancel the active trip
   */
  async cancelTrip(): Promise<void> {
    console.log('[EasyRoute] Cancelling trip...');
    const trip = this.tripExecution.getActiveTrip();
    if (trip) {
      await this.tripExecution.stopTrip(trip.tripId, 'cancelled');
      this.stopDeviationMonitoring();
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * DEVIATION MONITORING
   * ═══════════════════════════════════════════════════════════════
   */

  private deviationCheckInterval: any;

  /**
   * Start monitoring for route deviations
   */
  private startDeviationMonitoring(tripState: TripState): void {
    console.log('[EasyRoute] Starting deviation monitoring...');

    // Check for deviations every 10 seconds
    this.deviationCheckInterval = setInterval(async () => {
      const currentTrip = this.tripExecution.getActiveTrip();

      if (!currentTrip || currentTrip.status !== 'in_progress') {
        this.stopDeviationMonitoring();
        return;
      }

      try {
        const analysis = await this.rerouting.checkForDeviation(currentTrip);

        if (analysis.isDeviated) {
          console.log('[EasyRoute] Deviation detected:', analysis);

          this.emitTripUpdate({
            type: 'DEVIATION',
            timestamp: new Date(),
            tripState: currentTrip,
            data: analysis
          });
        }
      } catch (error) {
        console.error('[EasyRoute] Deviation check failed:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop deviation monitoring
   */
  private stopDeviationMonitoring(): void {
    if (this.deviationCheckInterval) {
      clearInterval(this.deviationCheckInterval);
      this.deviationCheckInterval = null;
      console.log('[EasyRoute] Stopped deviation monitoring');
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * REROUTING API
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * Accept a pending reroute
   */
  async acceptReroute(): Promise<void> {
    const trip = this.tripExecution.getActiveTrip();
    if (!trip) return;

    console.log('[EasyRoute] Accepting reroute...');
    await this.rerouting.acceptReroute(trip);
  }

  /**
   * Decline a pending reroute
   */
  async declineReroute(): Promise<void> {
    const trip = this.tripExecution.getActiveTrip();
    if (!trip) return;

    console.log('[EasyRoute] Declining reroute...');
    await this.rerouting.declineReroute(trip);
  }

  /**
   * Get pending reroute decision (if any)
   */
  getPendingReroute() {
    return this.rerouting.getPendingReroute();
  }

  /**
   * Observable for pending reroutes
   */
  get pendingReroute$() {
    return this.rerouting.pendingReroute$;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * TRIP INFORMATION API
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * Get the current active trip
   */
  getCurrentTrip(): TripState | null {
    return this.tripExecution.getActiveTrip();
  }

  /**
   * Get trip progress metrics
   */
  getTripProgress() {
    return this.tripExecution.getTripProgress();
  }

  /**
   * Get remaining distance to destination
   */
  getRemainingDistance(): number | null {
    return this.tripExecution.getRemainingDistance();
  }

  /**
   * Get remaining time to destination
   */
  getRemainingTime(): number | null {
    return this.tripExecution.getRemainingTime();
  }

  /**
   * Generate trip summary
   */
  private generateTripSummary(trip: TripState): TripSummary {
    const progress = this.tripExecution.getTripProgress();
    const actualDuration = trip.endTime && trip.startTime
      ? (trip.endTime.getTime() - trip.startTime.getTime()) / 60000
      : 0;

    return {
      tripId: trip.tripId,
      userId: trip.userId,
      route: trip.selectedRoute,
      plannedDuration: trip.selectedRoute.totalTime,
      actualDuration,
      plannedCost: trip.selectedRoute.totalCost,
      actualCost: trip.selectedRoute.totalCost, // TODO: Track actual spending
      milestonesReached: progress?.completedMilestones || 0,
      totalMilestones: progress?.totalMilestones || 0,
      completionPercentage: progress?.percentage || 0,
      startedAt: trip.startTime || new Date(),
      completedAt: trip.endTime || new Date(),
      deviations: trip.rerouteCount,
      reroutes: trip.rerouteCount
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * EVENT HANDLING
   * ═══════════════════════════════════════════════════════════════
   */

  private handleTripEvent(event: TripEvent): void {
    console.log('[EasyRoute] Trip event:', event.type);

    const trip = this.tripExecution.getActiveTrip();

    switch (event.type) {
      case 'MILESTONE_REACHED':
        this.emitTripUpdate({
          type: 'MILESTONE',
          timestamp: event.timestamp,
          tripState: trip || undefined,
          data: event.data
        });
        break;

      case 'MILESTONE_APPROACHING':
        this.emitTripUpdate({
          type: 'MILESTONE',
          timestamp: event.timestamp,
          tripState: trip || undefined,
          data: { ...event.data, approaching: true }
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
    console.log('[EasyRoute] Reroute event:', event.type);

    const trip = this.tripExecution.getActiveTrip();

    this.emitTripUpdate({
      type: 'REROUTE',
      timestamp: event.timestamp,
      tripState: trip || undefined,
      data: event
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * UTILITY METHODS
   * ═══════════════════════════════════════════════════════════════
   */

  private updateState(updates: Partial<OrchestratorState>): void {
    const current = this.stateSubject.value;
    this.stateSubject.next({ ...current, ...updates });
  }

  private emitTripUpdate(update: TripUpdateEvent): void {
    this.tripUpdatesSubject.next(update);
  }

  /**
   * Configure the orchestrator
   */
  configure(config: Partial<EasyRouteConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[EasyRoute] Configuration updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): EasyRouteConfig {
    return { ...this.config };
  }

  /**
   * Check if orchestrator is ready
   */
  isReady(): boolean {
    return this.stateSubject.value.isInitialized;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * CLEANUP
   * ═══════════════════════════════════════════════════════════════
   */

  ngOnDestroy(): void {
    console.log('[EasyRoute] Destroying orchestrator...');
    this.stopDeviationMonitoring();
    this.destroy$.next();
    this.destroy$.complete();
  }
}