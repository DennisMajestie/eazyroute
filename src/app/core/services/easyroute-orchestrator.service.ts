// src/app/core/services/easyroute-orchestrator.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { firstValueFrom } from 'rxjs';

// Import Engines
import { AlongService } from './along.service';
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
  activeRoute?: GeneratedRoute | null;
  currentSegmentIndex?: number;
  tripStartTime?: Date | null;
  currentLocation?: Location | null;
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

  // After-trip survey trigger
  private showSurveySubject = new BehaviorSubject<{ tripId: string; routeSegmentId: string } | null>(null);
  public showSurvey$ = this.showSurveySubject.asObservable();

  // Current trip state
  private currentTripState: TripState | null = null;

  // Location tracking subscription
  private locationTrackingSubscription: Subscription | null = null;
  private isUpdatingLocation: boolean = false;

  // Resumption tracking (to avoid immediate deviation alerts)
  private resumedAt: number = 0;

  // Stale trip threshold: trips not updated in the last 2 hours are considered stale
  private readonly STALE_TRIP_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

  constructor(
    private alongService: AlongService,
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
        // Check if trip is stale (not updated recently)
        const tripUpdatedAt = new Date(response.data.updatedAt || response.data.createdAt).getTime();
        const now = Date.now();
        const isStale = (now - tripUpdatedAt) > this.STALE_TRIP_THRESHOLD_MS;

        if (isStale) {
          console.log('[Orchestrator] Found stale trip (older than 2 hours), auto-cancelling:', response.data._id || response.data.id);
          // Auto-cancel stale trip to prevent zombie trips
          try {
            await firstValueFrom(this.tripHttpService.cancelTrip(
              response.data._id || response.data.id,
              'Auto-cancelled: Stale trip from previous session'
            ));
            console.log('[Orchestrator] Stale trip cancelled successfully');
          } catch (cancelError) {
            console.warn('[Orchestrator] Failed to auto-cancel stale trip:', cancelError);
          }
        } else {
          console.log('[Orchestrator] Found recent active trip, resuming:', response.data);
          await this.resumeTrip(response.data);
        }
      }
    } catch (error: any) {
      console.log('[Orchestrator] No active trip found or auth error');
      if (error?.status === 401) {
        this.reset();
      }
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
    console.log('[Orchestrator] Planning trip via AlongService...', { startLocation, endLocation });

    this.updateState({ tripStatus: 'planning' });

    try {
      // Generate routes using AlongService (Backend behavioral brain)
      const response = await firstValueFrom(this.alongService.generateRoute(
        startLocation,
        endLocation
      ));

      if (!response.success || !response.data) {
        console.warn('[Orchestrator] No routes found or error from AlongService:', response.message);
        return [];
      }

      // AlongService already sanitizes and maps to AlongRoute[]
      // Which matches the GeneratedRoute interface for the orchestrator
      const routes = response.data as any as GeneratedRoute[];

      console.log('[Orchestrator] Found routes:', routes.length);
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
        routeId: selectedRoute.id,
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

      console.log('[Orchestrator] createTrip raw response data:', JSON.stringify(response.data));

      // The sanitizer interceptor will have added an 'id' field, but we check raw data too for safety
      let tripId = response.data.id || response.data._id || (typeof response.data === 'string' ? response.data : undefined);

      console.log('[Orchestrator] Extracted tripId (initial):', tripId, 'Type:', typeof tripId);

      // Robust stringification if it's still an object
      if (typeof tripId === 'object' && tripId !== null) {
        console.warn('[Orchestrator] tripId is an object, attempting to extract string ID:', tripId);
        tripId = tripId.id || tripId._id || tripId.$oid || String(tripId);
      }

      console.log('[Orchestrator] Final tripId:', tripId, 'Type:', typeof tripId);

      if (!tripId || tripId === '[object Object]') {
        console.error('[Orchestrator] Invalid trip ID found in response:', response.data);
        throw new Error('Failed to extract valid trip ID from response');
      }

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
        tripStatus: 'active',
        activeRoute: selectedRoute,
        currentSegmentIndex: 0,
        tripStartTime: null
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
      const startTime = new Date();
      this.currentTripState.startTime = startTime;
      this.resumedAt = Date.now();

      this.updateState({ tripStatus: 'active', tripStartTime: startTime });

      // ✅ Now safe to pass - TypeScript knows it's not null
      await this.tripExecutionEngine.initializeTrip(this.currentTripState);

      // Start location tracking
      this.startLocationTracking();

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

      // Save trip data for survey BEFORE cleanup
      const tripId = this.currentTripState.tripId;
      const routeSegmentId = this.currentTripState.selectedRoute?.segments?.[0]?.id || tripId;

      this.stopLocationTracking();
      this.cleanupTrip();

      // Trigger after-trip survey
      setTimeout(() => {
        this.showSurveySubject.next({ tripId, routeSegmentId });
      }, 1000); // Show survey 1 second after completion

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

  async cancelTrip(reason?: string): Promise<void> {
    // ✅ NULL SAFETY CHECK
    if (!this.currentTripState?.tripId) {
      console.warn('[Orchestrator] Cannot cancel trip: No active trip ID found');
      // Fallback: cleanup local state anyway
      this.cleanupTrip();
      return;
    }

    console.log('[Orchestrator] Cancelling trip:', this.currentTripState.tripId);

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

  async endTrip(): Promise<void> {
    return this.cancelTrip('User ended trip');
  }

  private startLocationTracking(): void {
    console.log('[Orchestrator] Starting location tracking');
    // 🇳🇬 Optimized: 10s interval to reduce battery drain and backend load
    this.locationTrackingSubscription = interval(10000).subscribe(async () => {
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
    if (this.isUpdatingLocation) return;

    const state = this.currentTripState;
    if (!state?.tripId) return;

    this.isUpdatingLocation = true;
    try {
      const location = state.currentLocation;
      if (!location) return;

      await firstValueFrom(
        this.tripHttpService.updateLocation(
          state.tripId,
          {
            latitude: location.latitude,
            longitude: location.longitude
          }
        )
      );

      // 🛰️ Update state with latest location for UI distance calcs
      this.updateState({ currentLocation: location });

      await this.checkDeviation();
    } catch (error: any) {
      console.error('[Orchestrator] Error updating location:', error);
      // 🛡️ Safety: If we get 401 Unauthorized, the session is dead. Stop tracking to avoid loops.
      if (error?.status === 401) {
        console.warn('[Orchestrator] 401 detected during background update. Resetting state.');
        this.reset();
      }
    } finally {
      this.isUpdatingLocation = false;
    }
  }

  private async checkDeviation(): Promise<void> {
    if (!this.currentTripState) return;

    if (Date.now() - this.resumedAt < 15000) {
      return;
    }

    try {
      const analysis = await this.reroutingEngine.checkForDeviation(
        this.currentTripState
      );

      if (analysis.shouldReroute) {
        console.log(`[Orchestrator] Segment deviation detected: ${analysis.reason}`);
      }
    } catch (error) {
      console.error('[Orchestrator] Error checking deviation:', error);
    }
  }

  async acceptReroute(): Promise<void> {
    const state = this.currentTripState;
    if (!state) {
      throw new Error('No active trip');
    }

    console.log('[Orchestrator] Accepting reroute');

    try {
      await this.reroutingEngine.acceptReroute(state);
      console.log('[Orchestrator] Reroute accepted');
    } catch (error) {
      console.error('[Orchestrator] Error accepting reroute:', error);
      throw error;
    }
  }

  async declineReroute(): Promise<void> {
    const state = this.currentTripState;
    if (!state) {
      throw new Error('No active trip');
    }

    console.log('[Orchestrator] Declining reroute');

    try {
      await this.reroutingEngine.declineReroute(state);
      console.log('[Orchestrator] Reroute declined');
    } catch (error) {
      console.error('[Orchestrator] Error declining reroute:', error);
      throw error;
    }
  }

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
    console.log('[Orchestrator] Resuming trip from backend', tripData);

    const tripId = tripData._id || tripData.id || (tripData.data?._id) || (tripData.data?.id);

    if (!tripId) {
      console.error('[Orchestrator] Failed to resume trip: No ID found in data', tripData);
      return;
    }

    this.currentTripState = {
      tripId: tripId,
      userId: tripData.userId || '',
      status: tripData.status || 'active',
      startLocation: tripData.originLocation || tripData.startLocation,
      destinationLocation: tripData.destinationLocation,
      currentLocation: tripData.currentLocation || tripData.originLocation,
      selectedRoute: tripData.selectedRoute,
      currentSegmentIndex: tripData.currentSegmentIndex || 0,
      milestones: tripData.milestones || [],
      startTime: tripData.startTime ? new Date(tripData.startTime) : undefined,
      endTime: undefined,
      lastUpdated: new Date(),
      deviationDetected: tripData.deviationDetected || false,
      rerouteCount: tripData.rerouteCount || 0
    };

    this.resumedAt = Date.now();

    this.updateState({
      hasActiveTrip: true,
      currentTripId: this.currentTripState.tripId,
      tripStatus: tripData.status === 'paused' ? 'paused' : 'active',
      tripStartTime: this.currentTripState.startTime,
      currentLocation: this.currentTripState.currentLocation
    });

    if (this.currentTripState && (this.currentTripState.status === 'in_progress' || this.currentTripState.status === 'active')) {
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
   * Advance to the next segment of the trip
   */
  async advanceToNextSegment(): Promise<void> {
    const state = this.currentTripState;
    if (!state || !state.selectedRoute) {
      throw new Error('No active trip or route');
    }

    const segments = state.selectedRoute.segments;
    if (state.currentSegmentIndex < segments.length - 1) {
      state.currentSegmentIndex++;

      this.updateState({
        currentSegmentIndex: state.currentSegmentIndex
      });

      console.log('[Orchestrator] Advanced to segment:', state.currentSegmentIndex);
    } else {
      console.log('[Orchestrator] Already at the last segment');
    }
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
    const state = this.currentTripState;
    if (!state?.selectedRoute?.segments) return 0;

    const totalSegments = state.selectedRoute.segments.length;
    const currentSegment = state.currentSegmentIndex;

    return (currentSegment / totalSegments) * 100;
  }

  /**
   * Reset orchestrator
   * Called on logout or when manual reset is needed
   */
  reset(): void {
    console.log('[Orchestrator] Resetting orchestrator state');
    this.stopLocationTracking();
    this.reroutingEngine.reset();
    this.cleanupTrip();
    this.updateState({
      hasActiveTrip: false,
      currentTripId: null,
      tripStatus: 'idle',
      activeRoute: null,
      currentSegmentIndex: 0,
      currentLocation: null
    });
  }
}