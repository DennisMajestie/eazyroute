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
import { WebSocketService } from './websocket.service';
import { resolveTripRouteId } from '../utils/trip-request.utils';

export interface OrchestratorState {
  isInitialized: boolean;
  hasActiveTrip: boolean;
  currentTripId: string | null;
  tripStatus: 'idle' | 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  activeRoute?: GeneratedRoute | null;
  currentSegmentIndex?: number;
  tripStartTime?: Date | null;
  currentLocation?: Location | null;
  deviationDetected?: boolean;
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
    private reroutingHttpService: ReroutingHttpService,
    private webSocketService: WebSocketService
  ) {
    this.initialize();
    this.setupSocketListeners();
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * INITIALIZATION
   * ═══════════════════════════════════════════════════════════════
   */
  private async initialize(): Promise<void> {
    
    // Check for active trip from backend
    try {
      const response = await firstValueFrom(this.tripHttpService.getActiveTrip());
      const hasData = response.success && response.data && (!Array.isArray(response.data) || response.data.length > 0);

      if (hasData) {
        const tripData = Array.isArray(response.data) ? response.data[0] : response.data;
        
        // Check if trip is stale (not updated recently)
        const tripUpdatedAt = new Date(tripData.updatedAt || tripData.createdAt).getTime();
        const now = Date.now();
        const isStale = (now - tripUpdatedAt) > this.STALE_TRIP_THRESHOLD_MS;

        if (isStale) {
                    // Auto-cancel stale trip to prevent zombie trips
          try {
            await firstValueFrom(this.tripHttpService.cancelTrip(
              tripData._id || tripData.id,
              'Auto-cancelled: Stale trip from previous session'
            ));
                      } catch (cancelError) {
            console.warn('[Orchestrator] Failed to auto-cancel stale trip:', cancelError);
          }
        } else {
                    await this.resumeTrip(tripData);
        }
      } else {
              }
    } catch (error: any) {
            if (error?.status === 401) {
        this.reset();
      }
    }

    this.updateState({ isInitialized: true });
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * SOCKET LISTENERS
   * ═══════════════════════════════════════════════════════════════
   */
  private setupSocketListeners(): void {
    // 🎯 Milestone Reached - Authoritative update from backend
    this.webSocketService.on('milestone_reached').subscribe((data) => {
      
      const state = this.currentTripState;
      if (!state || state.tripId !== data.tripId) return;

      // Advance segment index
      state.currentSegmentIndex = data.nextSegmentIndex;
      
      this.updateState({
        currentSegmentIndex: data.nextSegmentIndex
      });

      // Synchronize Engine
      this.tripExecutionEngine.initializeTrip(state);

      if (data.isCompleted) {
        state.status = 'completed';
        this.updateState({ tripStatus: 'completed', hasActiveTrip: false });
      }
    });

    // ⚠️ Route Deviation - Authoritative signal from backend
    this.webSocketService.on('route_deviation').subscribe((data) => {
      
      const state = this.currentTripState;
      if (!state || state.tripId !== data.tripId) return;

      state.deviationDetected = true;
      this.updateState({ deviationDetected: true });
      
      // Synchronize Engine
      this.tripExecutionEngine.initializeTrip(state);
    });

    // ✅ Deviation Cleared - User is back on track
    this.webSocketService.on('deviation_cleared').subscribe((data) => {
      
      const state = this.currentTripState;
      if (!state || state.tripId !== data.tripId) return;

      state.deviationDetected = false;
      this.updateState({ deviationDetected: false });

      // Synchronize Engine
      this.tripExecutionEngine.initializeTrip(state);
    });
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
    
    try {
      // Create trip in backend
      const request: CreateTripRequest = {
        routeId: resolveTripRouteId(selectedRoute) || (selectedRoute as any)?.id || (selectedRoute as any)?.routeId,
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

      
      // The sanitizer interceptor will have added an 'id' field, but we check raw data too for safety
      let tripId = response.data.id || response.data._id || (typeof response.data === 'string' ? response.data : undefined);

      
      // Robust stringification if it's still an object
      if (typeof tripId === 'object' && tripId !== null) {
        console.warn('[Orchestrator] tripId is an object, attempting to extract string ID:', tripId);
        tripId = tripId.id || tripId._id || tripId.$oid || String(tripId);
      }

      
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

    
    try {
      await firstValueFrom(
        this.tripHttpService.pauseTrip(this.currentTripState.tripId)
      );

      this.currentTripState.status = 'paused';
      this.stopLocationTracking();

      this.updateState({ tripStatus: 'paused' });
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

    
    try {
      await firstValueFrom(
        this.tripHttpService.resumeTrip(this.currentTripState.tripId)
      );

      this.currentTripState.status = 'in_progress';
      this.startLocationTracking();

      this.updateState({ tripStatus: 'active' });
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

          } catch (error) {
      console.error('[Orchestrator] Error cancelling trip:', error);
      throw error;
    }
  }

  async endTrip(): Promise<void> {
    return this.cancelTrip('User ended trip');
  }

  private startLocationTracking(): void {
        // 🇳🇬 Optimized: 10s interval to reduce battery drain and backend load
    this.locationTrackingSubscription = interval(10000).subscribe(async () => {
      await this.updateCurrentLocation();
    });
  }

  private stopLocationTracking(): void {
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

    
    try {
      await this.reroutingEngine.acceptReroute(state);
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

    
    try {
      await this.reroutingEngine.declineReroute(state);
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
    
    const tripId = tripData._id || tripData.id || (tripData.data?._id) || (tripData.data?.id);

    if (!tripId) {
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

          } else {
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