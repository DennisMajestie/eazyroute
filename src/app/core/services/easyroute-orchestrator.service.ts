// src/app/core/services/easyroute-orchestrator.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { firstValueFrom } from 'rxjs';

// Import Engines
import { RouteGenerationEngine } from '../engines/route-generation.engine';
import { TripExecutionEngine } from '../engines/trip-execution.engine';
import { ReroutingEngine } from '../engines/rerouting.engine';

// Import HTTP Services
import { TripHttpService, CreateTripRequest } from './trip-http.service';
import { ReroutingHttpService } from './rerouting-http.service';

// Import Types
import { TripState, Location, GeneratedRoute } from '../engines/types/easyroute.types';

export interface OrchestratorState {
  isInitialized: boolean;
  hasActiveTrip: boolean;
  currentTripId: string | null;
  tripStatus: 'idle' | 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
}

@Injectable({
  providedIn: 'root'
})
export class EasyrouteOrchestratorService {
  // State management
  private stateSubject = new BehaviorSubject<OrchestratorState>({
    isInitialized: false,
    hasActiveTrip: false,
    currentTripId: null,
    tripStatus: 'idle'
  });
  public state$ = this.stateSubject.asObservable();

  // Current trip state
  private currentTripState: TripState | null = null;

  // Location tracking subscription
  private locationTrackingSubscription: Subscription | null = null;

  constructor(
    private routeGenerationEngine: RouteGenerationEngine,
    private tripExecutionEngine: TripExecutionEngine,
    private reroutingEngine: ReroutingEngine,
    private tripHttpService: TripHttpService,
    private reroutingHttpService: ReroutingHttpService
  ) {
    this.initialize();
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * INITIALIZATION
   * ═══════════════════════════════════════════════════════════════
   */
  private async initialize(): Promise<void> {
    console.log('[Orchestrator] Initializing...');

    // Check for active trip from backend
    try {
      const response = await firstValueFrom(this.tripHttpService.getActiveTrip());

      if (response.success && response.data) {
        console.log('[Orchestrator] Found active trip:', response.data);
        await this.resumeTrip(response.data);
      }
    } catch (error) {
      console.log('[Orchestrator] No active trip found');
    }

    this.updateState({ isInitialized: true });
    console.log('[Orchestrator] Initialized successfully');
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * ROUTE PLANNING
   * ═══════════════════════════════════════════════════════════════
   */
  async planTrip(
    startLocation: Location,
    endLocation: Location
  ): Promise<GeneratedRoute[]> {
    console.log('[Orchestrator] Planning trip...', { startLocation, endLocation });

    this.updateState({ tripStatus: 'planning' });

    try {
      // Generate routes using RouteGenerationEngine
      const routes = await this.routeGenerationEngine.generateRoutes(
        startLocation,
        endLocation,
        3 // maxAlternatives
      );

      console.log('[Orchestrator] Generated routes:', routes.length);
      return routes;
    } catch (error) {
      console.error('[Orchestrator] Error planning trip:', error);
      this.updateState({ tripStatus: 'idle' });
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * TRIP EXECUTION
   * ═══════════════════════════════════════════════════════════════
   */
  async createTrip(
    originLocation: Location,
    destinationLocation: Location,
    selectedRoute: GeneratedRoute
  ): Promise<string> {
    console.log('[Orchestrator] Creating trip...');

    try {
      // Create trip in backend
      const request: CreateTripRequest = {
        originLocation,
        destinationLocation,
        selectedRoute
      };

      const response = await firstValueFrom(
        this.tripHttpService.createTrip(request)
      );

      if (!response.success || !response.data) {
        throw new Error('Failed to create trip');
      }

      const tripId = response.data._id || response.data.id;

      // Initialize trip state locally
      this.currentTripState = {
        tripId,
        userId: '',
        status: 'not_started',
        startLocation: originLocation,
        destinationLocation,
        currentLocation: originLocation,
        selectedRoute,
        currentSegmentIndex: 0,
        milestones: [],
        startTime: undefined,
        endTime: undefined,
        lastUpdated: new Date(),
        deviationDetected: false,
        rerouteCount: 0
      };

      this.updateState({
        hasActiveTrip: true,
        currentTripId: tripId,
        tripStatus: 'active'
      });

      console.log('[Orchestrator] Trip created:', tripId);
      return tripId;
    } catch (error) {
      console.error('[Orchestrator] Error creating trip:', error);
      throw error;
    }
  }

  /**
   * Start trip execution
   */
  async startTrip(tripId: string): Promise<void> {
    console.log('[Orchestrator] Starting trip:', tripId);

    try {
      // Start trip in backend
      await firstValueFrom(this.tripHttpService.startTrip(tripId));

      // ✅ NULL SAFETY CHECK
      if (!this.currentTripState) {
        throw new Error('Cannot start trip: No current trip state');
      }

      this.currentTripState.status = 'in_progress';
      this.currentTripState.startTime = new Date();

      // ✅ Now safe to pass - TypeScript knows it's not null
      await this.tripExecutionEngine.initializeTrip(this.currentTripState);

      // Start location tracking
      this.startLocationTracking();

      this.updateState({ tripStatus: 'active' });
      console.log('[Orchestrator] Trip started successfully');
    } catch (error) {
      console.error('[Orchestrator] Error starting trip:', error);
      throw error;
    }
  }

  /**
   * Pause trip
   */
  async pauseTrip(): Promise<void> {
    // ✅ NULL SAFETY CHECK
    if (!this.currentTripState) {
      throw new Error('No active trip');
    }

    console.log('[Orchestrator] Pausing trip');

    try {
      await firstValueFrom(
        this.tripHttpService.pauseTrip(this.currentTripState.tripId)
      );

      this.currentTripState.status = 'paused';
      this.stopLocationTracking();

      this.updateState({ tripStatus: 'paused' });
      console.log('[Orchestrator] Trip paused');
    } catch (error) {
      console.error('[Orchestrator] Error pausing trip:', error);
      throw error;
    }
  }

  /**
   * Resume trip
   */
  async resumeTripExecution(): Promise<void> {
    // ✅ NULL SAFETY CHECK
    if (!this.currentTripState) {
      throw new Error('No active trip');
    }

    console.log('[Orchestrator] Resuming trip');

    try {
      await firstValueFrom(
        this.tripHttpService.resumeTrip(this.currentTripState.tripId)
      );

      this.currentTripState.status = 'in_progress';
      this.startLocationTracking();

      this.updateState({ tripStatus: 'active' });
      console.log('[Orchestrator] Trip resumed');
    } catch (error) {
      console.error('[Orchestrator] Error resuming trip:', error);
      throw error;
    }
  }

  /**
   * Complete trip
   */
  async completeTrip(actualCost?: number, feedback?: string): Promise<void> {
    // ✅ NULL SAFETY CHECK
    if (!this.currentTripState) {
      throw new Error('No active trip');
    }

    console.log('[Orchestrator] Completing trip');

    try {
      await firstValueFrom(
        this.tripHttpService.completeTrip(
          this.currentTripState.tripId,
          actualCost,
          feedback
        )
      );

      this.currentTripState.status = 'completed';
      this.currentTripState.endTime = new Date();

      this.stopLocationTracking();
      this.cleanupTrip();

      this.updateState({
        hasActiveTrip: false,
        currentTripId: null,
        tripStatus: 'completed'
      });

      console.log('[Orchestrator] Trip completed');
    } catch (error) {
      console.error('[Orchestrator] Error completing trip:', error);
      throw error;
    }
  }

  /**
   * Cancel trip
   */
  async cancelTrip(reason?: string): Promise<void> {
    // ✅ NULL SAFETY CHECK
    if (!this.currentTripState) {
      throw new Error('No active trip');
    }

    console.log('[Orchestrator] Cancelling trip');

    try {
      await firstValueFrom(
        this.tripHttpService.cancelTrip(this.currentTripState.tripId, reason)
      );

      this.currentTripState.status = 'cancelled';

      this.stopLocationTracking();
      this.cleanupTrip();

      this.updateState({
        hasActiveTrip: false,
        currentTripId: null,
        tripStatus: 'cancelled'
      });

      console.log('[Orchestrator] Trip cancelled');
    } catch (error) {
      console.error('[Orchestrator] Error cancelling trip:', error);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * LOCATION TRACKING
   * ═══════════════════════════════════════════════════════════════
   */
  private startLocationTracking(): void {
    console.log('[Orchestrator] Starting location tracking');

    // Track location every 5 seconds
    this.locationTrackingSubscription = interval(5000).subscribe(async () => {
      await this.updateCurrentLocation();
    });
  }

  private stopLocationTracking(): void {
    console.log('[Orchestrator] Stopping location tracking');

    if (this.locationTrackingSubscription) {
      this.locationTrackingSubscription.unsubscribe();
      this.locationTrackingSubscription = null;
    }
  }

  private async updateCurrentLocation(): Promise<void> {
    // ✅ NULL SAFETY CHECK
    if (!this.currentTripState) return;

    try {
      // Get current location from TripExecutionEngine
      const location = this.currentTripState.currentLocation;

      if (!location) return;

      // Update location in backend
      await firstValueFrom(
        this.tripHttpService.updateLocation(
          this.currentTripState.tripId,
          {
            latitude: location.latitude,
            longitude: location.longitude
          }
        )
      );

      // Check for deviation
      await this.checkDeviation();
    } catch (error) {
      console.error('[Orchestrator] Error updating location:', error);
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * REROUTING
   * ═══════════════════════════════════════════════════════════════
   */
  private async checkDeviation(): Promise<void> {
    // ✅ NULL SAFETY CHECK
    if (!this.currentTripState) return;

    try {
      // Use ReroutingEngine to check deviation
      const analysis = await this.reroutingEngine.checkForDeviation(
        this.currentTripState
      );

      if (analysis.shouldReroute) {
        console.log('[Orchestrator] Deviation detected, rerouting needed');
        // ReroutingEngine will handle the reroute process automatically
      }
    } catch (error) {
      console.error('[Orchestrator] Error checking deviation:', error);
    }
  }

  /**
   * Accept reroute suggestion
   */
  async acceptReroute(): Promise<void> {
    // ✅ NULL SAFETY CHECK
    if (!this.currentTripState) {
      throw new Error('No active trip');
    }

    console.log('[Orchestrator] Accepting reroute');

    try {
      await this.reroutingEngine.acceptReroute(this.currentTripState);
      console.log('[Orchestrator] Reroute accepted');
    } catch (error) {
      console.error('[Orchestrator] Error accepting reroute:', error);
      throw error;
    }
  }

  /**
   * Decline reroute suggestion
   */
  async declineReroute(): Promise<void> {
    // ✅ NULL SAFETY CHECK
    if (!this.currentTripState) {
      throw new Error('No active trip');
    }

    console.log('[Orchestrator] Declining reroute');

    try {
      await this.reroutingEngine.declineReroute(this.currentTripState);
      console.log('[Orchestrator] Reroute declined');
    } catch (error) {
      console.error('[Orchestrator] Error declining reroute:', error);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * STATE MANAGEMENT
   * ═══════════════════════════════════════════════════════════════
   */
  getCurrentTripState(): TripState | null {
    return this.currentTripState;
  }

  getState(): OrchestratorState {
    return this.stateSubject.value;
  }

  private updateState(partial: Partial<OrchestratorState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partial
    });
  }

  /**
   * Resume trip from backend data
   */
  private async resumeTrip(tripData: any): Promise<void> {
    console.log('[Orchestrator] Resuming trip from backend');

    // ✅ FIX: Remove locationHistory (not in TripState interface)
    this.currentTripState = {
      tripId: tripData._id || tripData.id,
      userId: tripData.userId,
      status: tripData.status,
      startLocation: tripData.originLocation, // ✅ FIX: Use startLocation
      destinationLocation: tripData.destinationLocation,
      currentLocation: tripData.currentLocation,
      selectedRoute: tripData.selectedRoute,
      currentSegmentIndex: tripData.currentSegmentIndex || 0,
      milestones: tripData.milestones || [],
      startTime: tripData.startTime ? new Date(tripData.startTime) : undefined,
      endTime: undefined,
      lastUpdated: new Date(), // ✅ FIX: Add required field
      deviationDetected: tripData.deviationDetected || false,
      rerouteCount: tripData.rerouteCount || 0
      // ✅ locationHistory removed - not in interface
    };

    this.updateState({
      hasActiveTrip: true,
      currentTripId: this.currentTripState.tripId,
      tripStatus: tripData.status === 'paused' ? 'paused' : 'active'
    });

    // ✅ NULL SAFETY: Check before calling initializeTrip
    if (tripData.status === 'in_progress' && this.currentTripState) {
      await this.tripExecutionEngine.initializeTrip(this.currentTripState);
      this.startLocationTracking();
    }
  }

  /**
   * Cleanup trip state
   */
  private cleanupTrip(): void {
    this.currentTripState = null;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * PUBLIC GETTERS
   * ═══════════════════════════════════════════════════════════════
   */
  getPendingReroute(): Observable<any> {
    return this.reroutingEngine.pendingReroute$;
  }

  getTripProgress(): number {
    // ✅ NULL SAFETY CHECK
    if (!this.currentTripState) return 0;

    const totalSegments = this.currentTripState.selectedRoute.segments.length;
    const currentSegment = this.currentTripState.currentSegmentIndex;

    return (currentSegment / totalSegments) * 100;
  }
}