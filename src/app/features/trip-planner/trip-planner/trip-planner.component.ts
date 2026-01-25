import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription, forkJoin, of, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';
import { MapComponent } from '../../../shared/components/map/map.component';
import { BusStopService, UnverifiedBusStop } from '../../../core/services/bus-stop.service';

import { EnhancedBusStop, BusStopTier } from '../../../models/enhanced-bus-stop.model';
import { GeocodingService } from '../../../core/services/geocoding.service';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { TripService } from '../../../core/services/trip.service';
import { AlongService } from '../../../core/services/along.service';

import { EasyrouteOrchestratorService } from '../../../core/services/easyroute-orchestrator.service';
import { CommuterProtocolService, HubProtocol, BoardingProtocol } from '../../../core/services/commuter-protocol.service';
import { SafetyService, SafetyLevel } from '../../../core/services/safety.service';
import { VerificationStatus, TransportMode, BusStop } from '../../../models/bus-stop.model';
import { GeneratedRoute, RouteSegment } from '../../../core/engines/types/easyroute.types';
import { SmartInstructionComponent } from '../../../shared/components/smart-instruction/smart-instruction.component';

interface SearchResult {
    name: string;
    displayName?: string;
    area?: string;
    latitude: number;
    longitude: number;
    type: 'bus_stop' | 'location';
    location?: {
        coordinates: [number, number];
    };
    // Local Route Intelligence fields
    localNames?: string[];
    verificationStatus?: VerificationStatus;
    upvotes?: number;
    transportModes?: TransportMode[];
    id?: string | number;
    tier?: 'primary' | 'sub-landmark' | 'node';
    source?: string;
    isVerifiedNeighborhood?: boolean;
}

@Component({
    selector: 'app-trip-planner',
    standalone: true,
    imports: [CommonModule, FormsModule, MapComponent, SmartInstructionComponent],
    templateUrl: './trip-planner.component.html',
    styleUrl: './trip-planner.component.scss'
})
export class TripPlannerComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private busStopService = inject(BusStopService);
    private geocodingService = inject(GeocodingService);
    private tripService = inject(TripService);

    public orchestrator = inject(EasyrouteOrchestratorService);
    private alongService = inject(AlongService); // Inject AlongService
    private geolocationService = inject(GeolocationService);
    private protocolService = inject(CommuterProtocolService);
    private safetyService = inject(SafetyService);

    // Map Settings (Abuja)
    center = { lat: 9.0765, lng: 7.3986 };
    zoom = 12;
    // ... imports ...
    // --- Route Finding ---
    async findRoutes() {
        // Pre-validation: Don't send placeholder strings as queries
        if (!this.fromLocation && (this.fromQuery.includes('Waiting') || this.fromQuery.includes('Detecting'))) {
            this.locationError = 'Please wait for GPS lock or type your starting point manually.';
            return;
        }

        // Resolve locations if they are missing but text exists
        if (!this.fromLocation && this.fromQuery.length > 2) {
            const resolved = await this.resolveLocation(this.fromQuery);
            if (resolved) {
                this.fromLocation = resolved;
                this.addMarker(resolved.lat, resolved.lng, 'Origin');
            }
        }

        if (!this.toLocation && this.toQuery.length > 2) {
            const resolved = await this.resolveLocation(this.toQuery);
            if (resolved) {
                this.toLocation = resolved;
                this.addMarker(resolved.lat, resolved.lng, 'Destination');
                this.center = { ...resolved };
            }
        }

        if (!this.fromLocation) {
            alert('Please enter a starting point');
            return;
        }
        if (!this.toLocation) {
            alert('Please enter a destination');
            return;
        }

        this.isLoadingRoutes = true;
        this.generatedRoutes = [];
        this.selectedRoute = null;
        this.fetchCoverageStats();


        try {
            // Pass name/coords as payload
            const fromPayload = this.fromLocation || this.fromQuery;
            const toPayload = this.toLocation || this.toQuery;

            console.log('[TripPlanner] V4 Route Generation...', {
                from: fromPayload,
                to: toPayload
            });

            // Call Backend (V4 ALONG Algorithm Stack)
            const response = await firstValueFrom(
                this.alongService.generateRoute(fromPayload, toPayload).pipe(
                    catchError(err => {
                        console.error('[TripPlanner] API Error:', err);
                        throw err;
                    })
                )
            );

            console.log('[TripPlanner] API Response received:', response);

            // Handle Soft Failure (Location Not Covered)
            if (response.success === false && response.errorType === 'LOCATION_NOT_COVERED') {
                console.warn('[TripPlanner] Soft failure - location not covered:', response.suggestion);
                this.alertMessage = response.suggestion || 'This area is not yet covered by ALONG.';
                this.errorHubs = response.nearbyHubs || [];
                this.generatedRoutes = [];
                return;
            }

            if (response && response.success && Array.isArray(response.data)) {
                const routes: any[] = [];

                // Map all routes in the array, ensuring we don't map null/undefined elements
                const validRoutes = response.data.filter(r => !!r);
                console.log('[TripPlanner] Valid routes found:', validRoutes.length);

                validRoutes.forEach(r => {
                    const mapped = this.mapAlongRouteToGeneratedRoute(r);
                    if (mapped) routes.push(mapped);
                });

                this.generatedRoutes = routes;

                // Select FASTEST by default if available, otherwise first one
                const fastest = this.generatedRoutes.find(r => r?.classification === 'FASTEST');
                this.selectedRoute = fastest || this.generatedRoutes[0] || null;

                console.log('[TripPlanner] V3/V4 routes loaded:', this.generatedRoutes.length);
            } else {
                console.warn('[TripPlanner] No valid route data in response:', response);
                this.generatedRoutes = [];
                this.alertMessage = response?.message || 'No routes found. Try another location.';
            }

        } catch (error: any) {
            console.error('[TripPlanner] Route generation failed:', error);

            // Check for Lagos ISP leak in backend error message
            const errorMsg = error.error?.message || error.message || '';
            if (errorMsg.includes('Detected Lagos ISP leak')) {
                this.handleISPLeak();
            } else {
                this.errorHubs = error.error?.nearbyHubs || error.nearbyHubs || [];
            }
        } finally {
            this.isLoadingRoutes = false;
        }
    }

    /**
     * Recovery Helper: Select a suggested hub after a soft failure
     */
    selectHub(hub: { name: string, lat: number, lng: number }) {
        this.toLocation = { lat: hub.lat, lng: hub.lng };
        this.toQuery = hub.name;
        this.addMarker(hub.lat, hub.lng, 'Destination');
        this.center = { ...this.toLocation };
        this.errorHubs = [];
        this.findRoutes();
    }

    private fetchCoverageStats() {
        this.isLoadingStats = true;
        this.alongService.getStats().subscribe({
            next: (res) => {
                if (res.success) this.coverageStats = res.data;
                this.isLoadingStats = false;
            },
            error: () => this.isLoadingStats = false
        });
    }

    useHubAsLocation(hub: any, field: 'from' | 'to') {
        const result: SearchResult = {
            name: hub.name,
            latitude: hub.latitude,
            longitude: hub.longitude,
            type: 'bus_stop',
            tier: hub.tier || 'primary'
        };
        this.selectResult(result);

        // Update the query field manually
        if (field === 'from') this.fromQuery = hub.name;
        else this.toQuery = hub.name;

        // Auto-trigger route generation if both are set
        if (this.fromLocation && this.toLocation) {
            this.findRoutes();
        }
    }

    private mapAlongRouteToGeneratedRoute(alongRoute: any): GeneratedRoute {
        if (!alongRoute) return null as any;

        // Use optimized legs if available, otherwise map segments
        const useLegs = alongRoute.legs && Array.isArray(alongRoute.legs) && alongRoute.legs.length > 0;
        const sourceSegments = useLegs ? alongRoute.legs : (alongRoute.segments || []);

        // CRITICAL FIX: Ensure sourceSegments is always an array
        const safeSegments = Array.isArray(sourceSegments) ? sourceSegments : [];

        // Map segments (AlongSegment -> RouteSegment)
        const segments: RouteSegment[] = safeSegments.filter(s => !!s).map((seg: any, index: number) => {
            const modeType = (seg.vehicleType || seg.mode || seg.type || 'walk') as any;

            return {
                id: `seg-${index}-${Date.now()}`,
                fromStop: (typeof seg.fromStop === 'object' && seg.fromStop !== null) ? seg.fromStop : {
                    id: seg.fromStopId || 'temp-from',
                    name: seg.fromStop || seg.fromName || seg.from?.name || 'Start',
                    latitude: seg.from?.lat || 0,
                    longitude: seg.from?.lng || 0,
                    type: 'landmark'
                } as any,
                toStop: (typeof seg.toStop === 'object' && seg.toStop !== null) ? seg.toStop : {
                    id: seg.toStopId || 'temp-to',
                    name: seg.toStop || seg.toName || seg.to?.name || 'End',
                    latitude: seg.to?.lat || 0,
                    longitude: seg.to?.lng || 0,
                    type: 'landmark'
                } as any,
                vehicleType: modeType, // V4 Key
                fromStopName: seg.fromStop || seg.fromName, // Helper for UI
                toStopName: seg.toStop || seg.toName, // Helper for UI
                distance: seg.distance || 0,
                estimatedTime: seg.estimatedTime || seg.duration || 0,
                mode: {
                    type: modeType,
                    name: modeType.toUpperCase(),
                    availabilityFactor: 1,
                    avgSpeedKmh: 0
                } as any,
                cost: this.normalizeCost(seg.cost),
                instructions: seg.instruction || seg.instructions || '',
                microInstructions: seg.microInstructions || [],
                barriers: seg.barriers || [],
                // V3 Safety Guardrails
                isBridge: seg.isBridge || false,
                isBlocked: seg.isBlocked || false,
                backboneName: seg.backboneName || null
            } as RouteSegment;
        });

        const route: GeneratedRoute = {
            id: `route-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            segments: segments,
            totalDistance: alongRoute.totalDistance,
            totalTime: alongRoute.totalTime,
            totalCost: this.normalizeCost(alongRoute.totalCost),
            rankingScore: { shortest: 0, cheapest: 0, balanced: 100 },
            generatedAt: new Date(),
            strategy: (alongRoute.classification?.toLowerCase() as any) || 'balanced',
            classification: alongRoute.classification,
            comparisonLabel: alongRoute.comparisonLabel,
            suggestion: alongRoute.suggestion
        };

        // Preserve legs if they exist
        if (useLegs) {
            route.legs = segments;
        }

        // Preserve metadata if it exists
        if (alongRoute.metadata) {
            route.metadata = alongRoute.metadata;

            // Log optimization info
            if (alongRoute.metadata.optimizationApplied) {
                console.log('✅ Route optimized by backend - merged consecutive hops');
            }
            if (alongRoute.metadata.corridorBonus && alongRoute.metadata.corridorBonus < 0) {
                console.log('🛣️ Verified corridor route');
            }
        }

        return route;
    }

    private normalizeCost(cost: any): number {
        if (cost === null || cost === undefined) return 0;
        if (typeof cost === 'number') return cost;
        if (typeof cost === 'string') return parseFloat(cost) || 0;
        if (typeof cost === 'object') {
            return cost.min || cost.value || cost.amount || cost.total || 0;
        }
        return 0;
    }

    private async resolveLocation(query: string): Promise<{ lat: number, lng: number } | null> {
        try {
            // Try Geocoding Service First
            const results = await firstValueFrom(this.geocodingService.search(query)) as any[];
            if (results && results.length > 0) {
                return { lat: results[0].latitude, lng: results[0].longitude };
            }

            // Try Bus Stop Search Fallback
            const busStops = await firstValueFrom(this.busStopService.searchBusStops(query));
            if (busStops.success && busStops.data && busStops.data.length > 0) {
                const stop = busStops.data[0];
                const lat = stop.location?.coordinates?.[1];
                const lng = stop.location?.coordinates?.[0];

                if (lat !== undefined && lng !== undefined) {
                    return { lat, lng };
                }
            }
            return null;
        } catch (e) {
            console.error('Failed to resolve location for:', query, e);
            return null;
        }
    }
    testMarkers: any[] = [
        { lat: 9.0765, lng: 7.3986, title: 'Central Area' },
        { lat: 9.05, lng: 7.45, title: 'Wuse 2' }
    ];

    // Forms & Search
    fromQuery = '';
    toQuery = '';
    fromLocation: { lat: number, lng: number } | null = null;
    toLocation: { lat: number, lng: number } | null = null;

    searchResults: SearchResult[] = [];
    activeSearchField: 'from' | 'to' | null = null;
    private searchSubject = new Subject<{ query: string, field: 'from' | 'to' }>();
    private searchSubscription: Subscription | undefined;

    // Nearby Stops (New)
    nearbyStops: any[] = [];
    isLoadingNearby = false;

    // Location detection
    isDetectingLocation = false;
    locationError: string | null = null;
    isTrackingLocation = false;
    private locationWatchId: number | null = null;

    // Route Generation
    generatedRoutes: GeneratedRoute[] = [];
    selectedRoute: GeneratedRoute | null = null;
    isLoadingRoutes = false;

    // Crowdsourcing State
    showReportModal = false;
    newStop: UnverifiedBusStop = {
        name: '',
        description: '',
        latitude: 9.0765,
        longitude: 7.3986,
        localNames: [],
        transportModes: []
    };
    isSubmitting = false;

    // Traffic/Police Reporting
    showTrafficReportModal = false;
    reportType: 'traffic' | 'police' | 'vio' | 'accident' = 'traffic';
    reportDescription = '';

    toggleTrafficReport() {
        this.showTrafficReportModal = !this.showTrafficReportModal;
    }

    async submitTrafficReport() {
        if (!this.fromLocation) {
            alert('Cannot report without your current location. Please enable GPS.');
            return;
        }

        this.isSubmitting = true;
        try {
            const report = {
                type: this.reportType,
                location: this.fromLocation,
                description: this.reportDescription
            };

            await firstValueFrom(this.alongService.reportCondition(report));
            alert('Thank you! Your report has been submitted and will help other commuters.');
            this.showTrafficReportModal = false;
            this.reportDescription = '';
        } catch (error) {
            console.error('[TripPlanner] Report failed:', error);
            alert('Failed to submit report. Please try again.');
        } finally {
            this.isSubmitting = false;
        }
    }

    // Navigation State
    routes: any[] = [];
    activeTripId: string | null = null;
    isNavigating = false;
    isStartingTrip = false; // Loading state for start button
    showAlternatives = false; // Toggle for alternative routes
    alertMessage = '';
    private updateInterval: any;

    // Orchestrator State for UI
    orchestratorState$ = this.orchestrator.state$;
    pendingReroute$ = this.orchestrator.getPendingReroute();

    // Safety Features
    isNightMode = false;
    safetyTips: string[] = [
        "🛑 Don't board if the back seat is full of men and the front seat is empty.",
        "🛑 Don't board if the car has tinted glass or the inner door handles are missing.",
        "🛡️ Always sit by the door/window, never in the middle."
    ];

    // Shouting Protocols
    // Shouting Protocols
    activeProtocol$ = this.protocolService.getActiveProtocol();

    // Behavioral Layer (ALONG)
    coverageStats: { areasMapped: number; hotspotsActive: number; contributors: number } | null = null;
    errorHubs: any[] = [];
    isLoadingStats = false;


    // Safety & Panic Button
    showSafetyModal = false;
    showFakeCallOverlay = false;
    activeSafetyLevel: SafetyLevel | null = null;
    isLiveLocationSharing = false;

    toggleSafetyModal() {
        this.showSafetyModal = !this.showSafetyModal;
    }

    triggerSafetyLevel(level: SafetyLevel) {
        this.activeSafetyLevel = level;
        this.showSafetyModal = false;

        switch (level) {
            case 'yellow': // Fake Call
                this.showFakeCallOverlay = true;
                this.safetyService.triggerFakeCall();
                break;
            case 'orange': // Live Location
                this.isLiveLocationSharing = true;
                this.safetyService.startLiveLocationSharing();
                alert('Live Location Sharing Active. Contacts notified.');
                break;
            case 'red': // SOS
                if (confirm('Are you sure you want to send an SOS alert? This will notify nearby users and contacts.')) {
                    this.safetyService.sendSOS('SOS_SILENT');
                    alert('SOS Alert Sent. Help is on the way.');
                }
                break;
        }
    }

    endFakeCall() {
        this.showFakeCallOverlay = false;
        this.safetyService.stopFakeCall();
    }

    stopLiveLocation() {
        this.isLiveLocationSharing = false;
        this.safetyService.stopLiveLocationSharing();
    }

    ngOnInit() {
        this.checkNightMode();
        // ... (rest of ngOnInit)
        // Auto-detect user location on load (commented out to make it opt-in)
        // Uncomment the line below if you want automatic location detection
        // this.detectCurrentLocation();

        // Handle query params from Dashboard or other nav
        this.route.queryParams.subscribe(params => {
            if (params['to']) {
                this.toQuery = params['to'];
            }
            if (params['from']) {
                this.fromQuery = params['from'];
            }
            if (params['lat'] && params['lng']) {
                this.toLocation = {
                    lat: parseFloat(params['lat']),
                    lng: parseFloat(params['lng'])
                };
                this.addMarker(this.toLocation.lat, this.toLocation.lng, 'Destination');
                this.center = { ...this.toLocation };
            }
        });

        // Handle State passed via router
        const navState = history.state;
        if (navState) {
            if (navState.toLocation) {
                this.toLocation = navState.toLocation;
                this.center = { ...this.toLocation! };
            }
            if (navState.toName) this.toQuery = navState.toName;
            if (navState.fromLocation) this.fromLocation = navState.fromLocation;
            if (navState.fromName) this.fromQuery = navState.fromName;

            // Auto-trigger route generation if both locations are present
            if (this.toLocation) {
                setTimeout(() => this.findRoutes(), 100);
            }
        }

        // Setup Search
        this.searchSubscription = this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged((prev, curr) => prev.query === curr.query)
        ).subscribe(({ query, field }) => {
            this.performSearch(query, field);
        });

        // Listen for live reroutes
        this.tripService.onRerouteSuggestion().subscribe({
            next: (data: any) => {
                this.alertMessage = `New Route Found! Reason: ${data.reason} `;
                console.log('Reroute:', data.newRoute);
            },
            error: (err) => console.error('Socket Error:', err)
        });

        this.tripService.onMilestoneReached().subscribe({
            next: (data: any) => {
                console.log('Milestone reached:', data);

                // Trigger Shouting Protocol if this is a transfer hub
                if (data.milestone && data.milestone.stopName) {
                    // Try to find protocols for this stop
                    const hub = this.protocolService.findHub(data.milestone.stopName);
                    if (hub) {
                        console.log('[TripPlanner] Transfer hub detected:', hub.name);
                        // Get destination from next segment if available
                        const nextStopName = this.getNextDestinationName();
                        this.protocolService.setActiveProtocol(data.milestone.stopName, nextStopName);
                    }
                }
            }
        });
    }

    /**
     * Get the next destination name from current route
     */
    private getNextDestinationName(): string | undefined {
        if (!this.selectedRoute) return undefined;

        const segments = this.selectedRoute.legs || this.selectedRoute.segments;
        if (segments && segments.length > 0) {
            // Return the final destination
            return segments[segments.length - 1].toStop?.name;
        }
        return undefined;
    }

    /**
     * Dismiss the active protocol panel
     */
    dismissProtocol() {
        this.protocolService.clearActiveProtocol();
    }

    checkNightMode() {
        const hour = new Date().getHours();
        // Night mode from 8PM (20) to 5AM (5)
        this.isNightMode = hour >= 20 || hour < 5;
        console.log('[TripPlanner] Night mode check:', this.isNightMode, 'Hour:', hour);
    }

    // --- Location Detection ---
    async detectCurrentLocation() {
        if (this.isDetectingLocation) return;

        this.isDetectingLocation = true;
        this.locationError = null;

        this.locationError = '';
        this.fromQuery = '🛰️ Waiting for GPS lock (Improving accuracy)...';

        try {
            // Use the new smart location retry logic
            const coords = await this.geolocationService.getSmartLocation();

            if (!coords) {
                throw new Error('Could not lock GPS signal after multiple attempts.');
            }

            const lat = coords.latitude;
            const lng = coords.longitude;

            // 1. Abuja Bounding Box Warning
            const isInsideAbuja = lat >= 8.8 && lat <= 9.2 && lng >= 7.2 && lng <= 7.6;
            if (!isInsideAbuja) {
                this.handleISPLeak();
                this.isDetectingLocation = false;
                return;
            }

            // Set the location
            this.fromLocation = { lat, lng };
            this.center = { lat, lng };
            this.zoom = 15;

            // Immediately show coordinates in the field (fallback)
            this.fromQuery = `📍 My Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`;

            // Add marker for current location
            this.addMarker(lat, lng, 'My Location');

            // Try to get address using reverse geocoding (will replace coordinates with name)
            this.geocodingService.reverseGeocode(lat, lng).subscribe({
                next: (result: any) => {
                    if (result && (result.name || result.area)) {
                        // Replace coordinates with human-readable name
                        this.fromQuery = `📍 ${result.name || result.area}`;
                    }
                    // If no result, keep the coordinates that are already showing
                },
                error: () => {
                    // Keep the coordinates that are already showing
                    console.log('[TripPlanner] Reverse geocoding failed, keeping coordinates');
                }
            });

            console.log('[TripPlanner] Location detected:', { lat, lng });

            // Automatically start real-time tracking after initial detection
            if (!this.isTrackingLocation) {
                // this.startLocationTracking(); // Opt-in
            }

            // Fetch nearby stops
            this.fetchNearbyStops(lat, lng);
        } catch (error: any) {
            // Log as info instead of error since user denial is expected behavior
            console.log('[TripPlanner] Location detection:', error.code === 1 ? 'User denied permission' : error.message || error);

            if (error.code === 1) {
                this.locationError = 'Location access denied. Click the 🔒 icon in your browser\'s address bar to enable location, then click the refresh button.';
            } else if (error.code === 2) {
                this.locationError = 'Location unavailable. Please check your device settings and try again.';
            } else if (error.code === 3) {
                this.locationError = 'Location request timed out. Please check your connection and try again.';
            } else {
                this.locationError = error.message || 'Could not detect location. Please enter your location manually or try the refresh button.';
            }

            // Clear the "Detecting..." message on error
            this.fromQuery = '';
        } finally {
            this.isDetectingLocation = false;
        }
    }

    private handleISPLeak() {
        this.locationError = '🔌 ISP Leak: We detected you might be in Abuja, but your browser is reporting Lagos. Please type your location manually.';
        this.fromLocation = null;
        this.fromQuery = '';
        this.isDetectingLocation = false;
        console.warn('[TripPlanner] Lagos ISP Leak detected. Clearing phantom coords.');
    }

    /**
     * Start real-time location tracking (Simplified per revert)
     */
    startLocationTracking() {
        if (this.isTrackingLocation) return;
        this.isTrackingLocation = true;

        this.locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                this.updateTrackingLocation(lat, lng);
            },
            (error) => console.error('[TripPlanner] Watch error:', error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    private updateTrackingLocation(lat: number, lng: number) {
        this.fromLocation = { lat, lng };
        this.center = { lat, lng };
        this.addMarker(lat, lng, 'My Location');
        console.log('[TripPlanner] Tracking update:', { lat, lng });
    }

    /**
     * Fetch nearby bus stops
     */
    fetchNearbyStops(lat: number, lng: number) {
        this.isLoadingNearby = true;
        this.busStopService.getNearbyStops(lat, lng, 1000, 5).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.nearbyStops = response.data;
                    console.log('[TripPlanner] Nearby stops fetched:', response.data.length);

                    if (response.data.length > 0 && response.data[0].distance && response.data[0].distance <= 1000) {
                        const nearest = response.data[0];
                        this.fromQuery = `📍 ${nearest.name}`;
                        this.fromLocation = {
                            lat: nearest.location.coordinates[1],
                            lng: nearest.location.coordinates[0]
                        };
                    }
                }
                this.isLoadingNearby = false;
            },
            error: (err) => {
                console.error('[TripPlanner] Failed to fetch nearby stops', err);
                this.isLoadingNearby = false;
            }
        });
    }

    // Stop real-time location tracking
    stopLocationTracking() {
        if (this.locationWatchId !== null) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
            this.isTrackingLocation = false;
            console.log('[TripPlanner] Stopped real-time location tracking');
        }
    }

    // Toggle location tracking on/off
    toggleLocationTracking() {
        if (this.isTrackingLocation) {
            this.stopLocationTracking();
        } else {
            if (this.fromLocation) {
                this.startLocationTracking();
            } else {
                // Detect location first, then start tracking
                this.detectCurrentLocation();
            }
        }
    }

    // Manual location detection (for refresh button)
    refreshLocation() {
        this.detectCurrentLocation();
    }

    // --- Search Logic ---
    onSearchInput(field: 'from' | 'to', query: string) {
        this.activeSearchField = field;
        if (query.length > 2) {
            this.searchSubject.next({ query, field });
        } else {
            this.searchResults = [];
        }
    }

    performSearch(query: string, field: 'from' | 'to') {
        // Reset results first
        this.searchResults = [];

        // 1. Search Bus Stops (Local Data - High Priority)
        this.busStopService.searchWithLocalNames(query, 10).pipe(
            catchError(() => of({ success: false, data: [] }))
        ).subscribe(res => {
            if (this.activeSearchField !== field) return;

            const busStops = (res && res.success && Array.isArray(res.data) ? res.data : []).map((s: EnhancedBusStop) => ({
                name: s.name,
                displayName: this.formatStopDisplay(s),
                area: s.district || s.city,
                latitude: s.location?.coordinates?.[1] || 0,
                longitude: s.location?.coordinates?.[0] || 0,
                type: 'bus_stop' as const,
                location: s.location,
                localNames: s.localNames || [],
                verificationStatus: 'verified' as const,
                upvotes: 0,
                transportModes: s.transportModes || [],
                tier: s.tier || 'node',
                id: s._id || s.id
            }));

            // Merge with existing results, keeping bus stops at the top
            this.searchResults = [...busStops, ...this.searchResults.filter(r => r.type !== 'bus_stop')];
        });

        // 2. Search General Locations (OSM - Fallback)
        this.geocodingService.search(query).pipe(
            catchError(() => of([]))
        ).subscribe((locations: any) => {
            if (this.activeSearchField !== field) return;

            // CRITICAL FIX: Ensure locations is an array
            const mappedLocations = (Array.isArray(locations) ? locations : []).map(l => ({
                name: l.name,
                displayName: l.displayName,
                area: l.area,
                latitude: l.latitude,
                longitude: l.longitude,
                type: 'location' as const
            }));

            // Append to results if not already there (simple de-dupe by name)
            const existingNames = new Set((this.searchResults || []).map(r => r?.name).filter(n => !!n));
            const uniqueLocations = mappedLocations.filter(l => !existingNames.has(l.name));

            this.searchResults = [...this.searchResults, ...uniqueLocations];
        });

        // 3. Search Behavioral Localities (ALONG - High Priority neighborhoods)
        this.alongService.search(query).pipe(
            catchError(() => of({ success: false, data: [] }))
        ).subscribe(res => {
            if (this.activeSearchField !== field) return;

            const localities = (res && res.success && Array.isArray(res.data) ? res.data : []).map((l: any) => ({
                name: l.name,
                displayName: l.displayName || l.name,
                area: l.area || l.district,
                latitude: l.lat || l.latitude,
                longitude: l.lng || l.longitude,
                type: 'location' as const,
                source: l.source,
                isVerifiedNeighborhood: l.source === 'along-locality',
                tier: 'primary' as const
            }));

            // Merge and prioritize: verified neighborhoods should be at the top of 'location' type results
            const verified = localities.filter(l => l.isVerifiedNeighborhood);
            const others = localities.filter(l => !l.isVerifiedNeighborhood);

            // Logic: [Bus Stops] -> [Verified Neighborhoods] -> [Other Localities] -> [OSM Results]
            const safeResults = Array.isArray(this.searchResults) ? this.searchResults : [];
            const existingIds = new Set(safeResults.map(r => r?.name).filter(n => !!n));
            const uniqueVerified = verified.filter(v => !existingIds.has(v.name));
            const uniqueOthers = others.filter(o => !existingIds.has(o.name));

            // Insert verified neighborhoods after bus stops
            const busStops = safeResults.filter(r => r?.type === 'bus_stop');
            const everythingElse = safeResults.filter(r => r?.type !== 'bus_stop');

            this.searchResults = [...busStops, ...uniqueVerified, ...uniqueOthers, ...everythingElse];
        });
    }

    selectResult(result: SearchResult) {
        if (this.activeSearchField === 'from') {
            this.fromQuery = result.name;
            if (result.latitude && result.longitude) {
                this.fromLocation = {
                    lat: result.latitude,
                    lng: result.longitude
                };
                this.addMarker(this.fromLocation.lat, this.fromLocation.lng, 'Origin', result.tier);
            } else {
                this.fromLocation = null; // Forces recalculation/name use
            }
        } else if (this.activeSearchField === 'to') {
            this.toQuery = result.name;
            if (result.latitude && result.longitude) {
                this.toLocation = {
                    lat: result.latitude,
                    lng: result.longitude
                };
                this.addMarker(this.toLocation.lat, this.toLocation.lng, 'Destination', result.tier);
                this.center = { ...this.toLocation };
            } else {
                this.toLocation = null;
            }
        }
        this.searchResults = [];
        this.activeSearchField = null;
    }

    addMarker(lat: number, lng: number, title: string, tier?: 'primary' | 'sub-landmark' | 'node') {
        this.testMarkers = [
            ...this.testMarkers.filter(m => m.title !== title),
            { lat, lng, title, tier }
        ];
    }

    // --- City-Intelligent Snapping ---
    routePolylines: any[] = [];

    onMapClick(event: any) {
        // Handle both direct coords and Leaflet-style events
        const coords = event.latlng ? { lat: event.latlng.lat, lng: event.latlng.lng } : event;
        const lat = coords.lat;
        const lng = coords.lng;

        if (!this.fromLocation) {
            this.snapToSideOfRoad(coords.lat, coords.lng, 'from');
        } else if (!this.toLocation) {
            this.snapToSideOfRoad(coords.lat, coords.lng, 'to');
        } else {
            // Both set, maybe reset 'to'?
            this.snapToSideOfRoad(coords.lat, coords.lng, 'to');
        }
    }

    private snapToSideOfRoad(lat: number, lng: number, field: 'from' | 'to') {
        this.isLoadingNearby = true;
        this.busStopService.getAllStops({ page: 1, limit: 5 }).subscribe({
            next: (data: BusStop[]) => {
                if (data && data.length > 0) {
                    const nearest = data[0];
                    const side = nearest.backboneSide;

                    if (side && side !== 'C') {
                        console.log(`🧭 Snapped to ${side === 'L' ? 'Left' : 'Right'} side landmark: ${nearest.name}`);
                        if (field === 'from') {
                            this.alertMessage = `Pickup set at ${nearest.name} (${side === 'L' ? 'Left' : 'Right'} side). Use pedestrian bridge if you are on the other side!`;
                        }
                    }

                    // Use safe coordinate extraction
                    const latitude = nearest.latitude || (nearest.location?.coordinates?.[1]);
                    const longitude = nearest.longitude || (nearest.location?.coordinates?.[0]);

                    if (latitude && longitude) {
                        this.activeSearchField = field;
                        this.selectResult({
                            name: nearest.name,
                            displayName: nearest.name,
                            latitude,
                            longitude,
                            type: 'bus_stop',
                            tier: nearest.tier,
                            id: nearest.id || (nearest as any)._id
                        } as any);
                    } else {
                        this.rawCoordFallback(lat, lng, field);
                    }
                } else {
                    this.rawCoordFallback(lat, lng, field);
                }
                this.isLoadingNearby = false;
            },
            error: () => {
                this.rawCoordFallback(lat, lng, field);
                this.isLoadingNearby = false;
            }
        });
    }

    private rawCoordFallback(lat: number, lng: number, field: 'from' | 'to') {
        const point = { lat, lng };
        if (field === 'from') {
            this.fromLocation = point;
            this.fromQuery = `📍 Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            this.addMarker(lat, lng, 'Origin');
        } else {
            this.toLocation = point;
            this.toQuery = `📍 Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            this.addMarker(lat, lng, 'Destination');
        }
    }

    private updateRoutePolylines() {
        if (!this.selectedRoute) {
            this.routePolylines = [];
            return;
        }

        const segments = this.selectedRoute.legs || this.selectedRoute.segments;
        // CRITICAL FIX: Ensure segments is an array
        this.routePolylines = (Array.isArray(segments) ? segments : []).map(seg => ({
            path: [], // Backend needs to provide decoded polyline or we decode here
            color: this.getSegmentHexColor(seg),
            isBackbone: seg.backbonePriority
        }));
    }

    private getSegmentHexColor(seg: any): string {
        const type = seg.vehicleType || seg.type;
        switch (type) {
            case 'walk': return '#94a3b8';
            case 'bus': return '#0ea5e9';
            case 'keke': return '#f59e0b';
            case 'taxi': return '#8b5cf6';
            default: return '#0ea5e9';
        }
    }

    // --- Route Finding ---
    // --- Route Finding ---




    selectRoute(route: GeneratedRoute) {
        this.selectedRoute = route;
        console.log('[TripPlanner] Selected route:', route);
    }

    async startTripWithRoute(route: GeneratedRoute) {
        if (!this.fromLocation || !this.toLocation) {
            alert('Missing location data');
            return;
        }

        if (this.isStartingTrip) return;

        this.isStartingTrip = true;

        try {
            console.log('[TripPlanner] Creating trip with route:', route);

            const tripId = await this.orchestrator.createTrip(
                { latitude: this.fromLocation.lat, longitude: this.fromLocation.lng },
                { latitude: this.toLocation.lat, longitude: this.toLocation.lng },
                route
            );

            console.log('[TripPlanner] Trip created:', tripId);

            // Start the trip
            await this.orchestrator.startTrip(tripId);

            // Hide route results after starting
            this.generatedRoutes = [];
            this.selectedRoute = null;

            console.log('[TripPlanner] Trip started successfully');
        } catch (error) {
            console.error('[TripPlanner] Failed to start trip:', error);
            alert('Failed to start trip. Please check your connection and try again.');
        } finally {
            this.isStartingTrip = false;
        }
    }

    async stopActiveTrip() {
        if (confirm('Are you sure you want to stop the current trip?')) {
            try {
                await this.orchestrator.cancelTrip('User terminated trip');
                this.isNavigating = false;
                console.log('[TripPlanner] Trip stopped by user');
            } catch (error) {
                console.error('[TripPlanner] Failed to stop trip:', error);
                alert('Failed to stop trip. Please try again.');
            }
        }
    }

    getTransportIcon(mode: any): string {
        const iconMap: { [key: string]: string } = {
            'bus': 'fas fa-bus',
            'walk': 'fas fa-walking',
            'keke': 'fas fa-motorcycle',
            'taxi': 'fas fa-taxi',
            'bike': 'fas fa-bicycle',
            'train': 'fas fa-train'
        };
        return iconMap[mode.type] || 'fas fa-map-marker';
    }

    // --- Local Route Intelligence Helpers ---

    /**
     * Get verification badge for a bus stop
     */
    getVerificationBadge(status?: VerificationStatus, upvotes: number = 0): { icon: string, text: string, class: string } {
        // Community Verified logic: 5+ upvotes -> Community, 10+ -> Verified (or admin)
        if (status === 'verified') {
            return { icon: '✓', text: 'Verified', class: 'badge-verified' };
        }

        if (upvotes >= 10) {
            return { icon: '✓', text: 'Verified', class: 'badge-verified' };
        }

        if (upvotes >= 5 || status === 'community') {
            return { icon: '⭐', text: 'Community', class: 'badge-community' };
        }

        return { icon: '🆕', text: 'New', class: 'badge-pending' };
    }

    /**
     * Get display text for local names
     */
    getLocalNamesText(localNames?: string[]): string {
        if (!localNames || localNames.length === 0) return '';
        return `Also known as: ${localNames.join(', ')}`;
    }

    /**
     * Get transport mode icons
     */
    getTransportModeIcons(modes?: TransportMode[]): string[] {
        if (!modes || modes.length === 0) return [];
        const iconMap: { [key in TransportMode]: string } = {
            'keke': 'fas fa-motorcycle',
            'bus': 'fas fa-bus',
            'okada': 'fas fa-motorcycle',
            'taxi': 'fas fa-taxi',
            'walking': 'fas fa-walking'
        };
        return modes.map(mode => iconMap[mode]);
    }

    /**
     * Upvote a stop
     */
    upvoteStop(stopId: string | number | undefined) {
        if (stopId === undefined || stopId === null || stopId === '') {
            console.warn('[TripPlanner] Cannot upvote: Stop ID is missing');
            return;
        }
        this.busStopService.upvoteStop(stopId).subscribe({
            next: (res) => {
                console.log('Upvoted successfully');
            },
            error: (err) => console.error('Failed to upvote', err)
        });
    }

    /**
     * Format stop display with local names and tier
     */
    formatStopDisplay(stop: EnhancedBusStop): string {
        const tierIcon = this.getTierIcon(stop.tier);
        const localName = stop.localNames && stop.localNames.length > 0 ? stop.localNames[0] : '';

        if (localName && localName !== stop.name) {
            return `${tierIcon} ${stop.name} (${localName})`;
        }
        return `${tierIcon} ${stop.name}`;
    }

    /**
     * Get tier icon
     */
    getTierIcon(tier: BusStopTier): string {
        const icons = {
            'primary': '⭐',
            'sub-landmark': '📍',
            'node': '⚪'
        };
        return icons[tier] || '⚪';
    }

    /**
     * Get icon for landmark types
     */
    getLandmarkIcon(type: string): string {
        const iconMap: { [key: string]: string } = {
            'medical': 'fas fa-hospital',
            'shopping': 'fas fa-shopping-cart',
            'government': 'fas fa-building',
            'education': 'fas fa-graduation-cap',
            'transport': 'fas fa-bus',
            'landmark': 'fas fa-map-marker-alt'
        };
        return iconMap[type.toLowerCase()] || 'fas fa-map-marker-alt';
    }

    // --- Navigation Logic ---
    startNavigation(routeId: string) {
        this.tripService.startTrip(routeId, this.center).subscribe({
            next: (res) => {
                this.activeTripId = res.data._id;
                this.isNavigating = true;
                this.startLocationUpdates();
            },
            error: (err) => console.error(err)
        });
    }

    startLocationUpdates() {
        this.updateInterval = setInterval(() => {
            if (this.activeTripId) {
                // Simulate movement
                const activeLoc = {
                    lat: this.center.lat + (Math.random() * 0.001),
                    lng: this.center.lng + (Math.random() * 0.001)
                };
                this.tripService.updateLocation(this.activeTripId, activeLoc).subscribe();
            }
        }, 5000);
    }

    // --- Crowdsourcing Logic ---
    toggleReportModal() {
        this.showReportModal = !this.showReportModal;
    }

    submitStop() {
        this.isSubmitting = true;
        this.busStopService.submitMissingStop(this.newStop).subscribe({
            next: () => {
                alert('Stop submitted for verification! Thank you.');
                this.isSubmitting = false;
                this.showReportModal = false;
                this.newStop = {
                    name: '',
                    description: '',
                    latitude: 9.0765,
                    longitude: 7.3986,
                    localNames: [],
                    transportModes: []
                };
            },
            error: (err) => {
                console.error(err);
                alert('Failed to submit stop.');
                this.isSubmitting = false;
            }
        });
    }

    /**
     * Add a local name to the newStop
     */
    addLocalName(name: string) {
        if (!name || name.trim() === '') return;

        if (!this.newStop.localNames) {
            this.newStop.localNames = [];
        }

        // Avoid duplicates
        if (!this.newStop.localNames.includes(name.trim())) {
            this.newStop.localNames.push(name.trim());
        }
    }

    /**
     * Remove a local name from the newStop
     */
    removeLocalName(index: number) {
        if (this.newStop.localNames) {
            this.newStop.localNames.splice(index, 1);
        }
    }

    /**
     * Toggle a transport mode on/off
     */
    toggleTransportMode(mode: TransportMode) {
        if (!this.newStop.transportModes) {
            this.newStop.transportModes = [];
        }

        const index = this.newStop.transportModes.indexOf(mode);
        if (index > -1) {
            // Remove if already present
            this.newStop.transportModes.splice(index, 1);
        } else {
            // Add if not present
            this.newStop.transportModes.push(mode);
        }
    }

    ngOnDestroy() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        if (this.searchSubscription) this.searchSubscription.unsubscribe();
        // Stop location tracking to prevent memory leaks
        this.stopLocationTracking();
    }
}
