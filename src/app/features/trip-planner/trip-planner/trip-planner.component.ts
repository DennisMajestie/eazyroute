import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';
import { MapComponent } from '../../../shared/components/map/map.component';
import { BusStopService, UnverifiedBusStop } from '../../../core/services/bus-stop.service';
import { BusStopHttpService } from '../../../core/services/bus-stop-http.service';
import { GeocodingService } from '../../../core/services/geocoding.service';
import { TripService } from '../../../core/services/trip.service';
import { RouteHttpService } from '../../../core/services/route-http.service';
import { EasyrouteOrchestratorService } from '../../../core/services/easyroute-orchestrator.service';
import { GeneratedRoute, RouteSegment } from '../../../core/engines/types/easyroute.types';
import { VerificationStatus, TransportMode } from '../../../models/bus-stop.model';

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
}

@Component({
    selector: 'app-trip-planner',
    standalone: true,
    imports: [CommonModule, FormsModule, MapComponent],
    templateUrl: './trip-planner.component.html',
    styleUrl: './trip-planner.component.scss'
})
export class TripPlannerComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private busStopService = inject(BusStopService);
    private busStopHttpService = inject(BusStopHttpService);
    private geocodingService = inject(GeocodingService);
    private tripService = inject(TripService);
    private routeService = inject(RouteHttpService);
    private orchestrator = inject(EasyrouteOrchestratorService);

    // Map Settings (Abuja)
    center = { lat: 9.0765, lng: 7.3986 };
    zoom = 12;
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

    // Navigation State
    routes: any[] = [];
    activeTripId: string | null = null;
    isNavigating = false;
    alertMessage = '';
    private updateInterval: any;

    ngOnInit() {
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
            }
        });
    }

    // --- Location Detection ---
    async detectCurrentLocation() {
        if (this.isDetectingLocation) return;

        this.isDetectingLocation = true;
        this.locationError = null;

        // Immediately show "Detecting..." in the field when button is clicked
        this.fromQuery = '📍 Detecting your location...';

        try {
            if (!navigator.geolocation) {
                throw new Error('Geolocation is not supported by your browser');
            }

            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            });

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

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
                next: (result) => {
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
                this.startLocationTracking();
            }
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

    // Start real-time location tracking
    startLocationTracking() {
        if (this.isTrackingLocation || !navigator.geolocation) return;

        this.isTrackingLocation = true;
        console.log('[TripPlanner] Starting real-time location tracking');

        this.locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Update location
                this.fromLocation = { lat, lng };
                this.center = { lat, lng };

                // Update marker
                this.addMarker(lat, lng, 'My Location');

                // Update coordinates in field
                this.fromQuery = `📍 My Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`;

                // Optionally update address (throttled to avoid too many API calls)
                // You might want to add debouncing here
                this.geocodingService.reverseGeocode(lat, lng).subscribe({
                    next: (result) => {
                        if (result && (result.name || result.area)) {
                            this.fromQuery = `📍 ${result.name || result.area}`;
                        }
                    },
                    error: () => {
                        // Keep coordinates on error
                    }
                });

                console.log('[TripPlanner] Location updated:', { lat, lng });
            },
            (error) => {
                console.log('[TripPlanner] Location tracking error:', error.message);
                this.stopLocationTracking();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 5000 // Cache position for 5 seconds
            }
        );
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
        // Search both bus stops AND general locations
        forkJoin({
            busStops: this.busStopHttpService.searchBusStops(query).pipe(
                catchError(() => of({ success: false, data: [] }))
            ),
            locations: this.geocodingService.search(query).pipe(
                catchError(() => of([]))
            )
        }).subscribe(results => {
            const busStopResults: SearchResult[] = results.busStops.success && results.busStops.data
                ? results.busStops.data.map((s: any) => ({
                    name: s.name,
                    displayName: s.name,
                    area: s.area,
                    latitude: s.location?.coordinates?.[1] || 0,
                    longitude: s.location?.coordinates?.[0] || 0,
                    type: 'bus_stop' as const,
                    location: s.location,
                    // Local Route Intelligence fields
                    localNames: s.localNames || [],
                    verificationStatus: s.verificationStatus || 'pending',
                    upvotes: s.upvotes || 0,
                    transportModes: s.transportModes || []
                }))
                : [];

            const locationResults: SearchResult[] = results.locations.map(l => ({
                name: l.name,
                displayName: l.displayName,
                area: l.area,
                latitude: l.latitude,
                longitude: l.longitude,
                type: 'location' as const
            }));

            // Combine results, prioritizing bus stops
            this.searchResults = [...busStopResults, ...locationResults];
        });
    }

    selectResult(result: SearchResult) {
        if (this.activeSearchField === 'from') {
            this.fromQuery = result.name;
            this.fromLocation = {
                lat: result.latitude,
                lng: result.longitude
            };
            this.addMarker(this.fromLocation.lat, this.fromLocation.lng, 'Origin');
        } else if (this.activeSearchField === 'to') {
            this.toQuery = result.name;
            this.toLocation = {
                lat: result.latitude,
                lng: result.longitude
            };
            this.addMarker(this.toLocation.lat, this.toLocation.lng, 'Destination');
            this.center = { ...this.toLocation };
        }
        this.searchResults = [];
        this.activeSearchField = null;
    }

    addMarker(lat: number, lng: number, title: string) {
        this.testMarkers = [
            ...this.testMarkers.filter(m => m.title !== title),
            { lat, lng, title }
        ];
    }

    // --- Route Finding ---
    async findRoutes() {
        if (!this.fromLocation) {
            alert('Please select a starting point');
            return;
        }
        if (!this.toLocation) {
            alert('Please select a destination');
            return;
        }

        this.isLoadingRoutes = true;
        this.generatedRoutes = [];
        this.selectedRoute = null;

        try {
            console.log('[TripPlanner] Generating routes...', {
                from: this.fromLocation,
                to: this.toLocation
            });

            const routes = await this.orchestrator.planTrip(
                {
                    latitude: this.fromLocation.lat,
                    longitude: this.fromLocation.lng
                },
                {
                    latitude: this.toLocation.lat,
                    longitude: this.toLocation.lng
                }
            );

            this.generatedRoutes = routes;
            console.log('[TripPlanner] Generated routes:', routes);

            if (routes.length === 0) {
                alert('No routes found. Try different locations.');
            }
        } catch (error) {
            console.error('[TripPlanner] Route generation failed:', error);
            alert('Failed to generate routes. Please try again.');
        } finally {
            this.isLoadingRoutes = false;
        }
    }

    selectRoute(route: GeneratedRoute) {
        this.selectedRoute = route;
        console.log('[TripPlanner] Selected route:', route);
    }

    async startTripWithRoute(route: GeneratedRoute) {
        if (!this.fromLocation || !this.toLocation) {
            alert('Missing location data');
            return;
        }

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

            alert('Trip started! Redirecting to tracking...');
            // TODO: Navigate to trip tracking page
            // this.router.navigate(['/trip-tracking']);
        } catch (error) {
            console.error('[TripPlanner] Failed to start trip:', error);
            alert('Failed to start trip. Please try again.');
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
    getVerificationBadge(status?: VerificationStatus): { icon: string, text: string, class: string } {
        switch (status) {
            case 'verified':
                return { icon: '✓', text: 'Verified', class: 'badge-verified' };
            case 'community':
                return { icon: '⭐', text: 'Community', class: 'badge-community' };
            case 'pending':
            default:
                return { icon: '🆕', text: 'New', class: 'badge-pending' };
        }
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
