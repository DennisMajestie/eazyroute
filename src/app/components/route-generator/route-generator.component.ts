import { Component, OnInit } from '@angular/core';
import { BusStopService } from '../../core/services/bus-stop.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { AlongService } from '../../core/services/along.service'; // Fix path to core/services

@Component({
    selector: 'app-route-generator',
    templateUrl: './route-generator.component.html',
    styleUrls: ['./route-generator.component.css'] // Adjusted from .scss to .css to match previous file content
})
export class RouteGeneratorComponent implements OnInit {
    nearbyStops: any[] = [];
    searchResults: any[] = [];
    selectedFrom: any = null;
    selectedTo: any = null;
    routes: any[] = [];
    loading = false;

    constructor(
        private busStopService: BusStopService,
        private geolocationService: GeolocationService,
        private alongService: AlongService
    ) { }

    ngOnInit(): void {
        this.loadNearbyStops();
    }

    /**
     * Load nearby stops with comprehensive error handling
     */
    loadNearbyStops(): void {
        this.geolocationService.getCurrentPosition().subscribe({
            next: (position) => {
                if (!position || !position.latitude || !position.longitude) {
                    console.warn('[RouteGenerator] Invalid position:', position);
                    return;
                }

                this.busStopService.getNearbyStops(
                    position.latitude,
                    position.longitude,
                    1000,
                    5
                ).subscribe({
                    next: (response: any) => {
                        // ✅ Comprehensive null-safety
                        const rawData = response?.data || response || [];
                        const stopsArray = Array.isArray(rawData) ? rawData : [];

                        this.nearbyStops = stopsArray
                            .filter((stop: any) => stop != null) // Remove null/undefined
                            .map((stop: any) => ({
                                name: stop?.name || 'Unknown Stop',
                                lat: stop?.location?.coordinates?.[1] ?? stop?.latitude ?? 0,
                                lng: stop?.location?.coordinates?.[0] ?? stop?.longitude ?? 0,
                                distance: stop?.dist?.calculated ?? stop?.distance ?? 9999,
                                verified: !!stop?.verified || stop?.verificationStatus === 'verified'
                            }))
                            .filter((stop: any) => stop.lat !== 0 && stop.lng !== 0); // Remove invalid coordinates

                        console.log('[RouteGenerator] Loaded nearby stops:', this.nearbyStops.length);
                    },
                    error: (err: any) => {
                        console.error('[RouteGenerator] Failed to load nearby stops:', err);
                        this.nearbyStops = [];
                    }
                });
            },
            error: (err) => {
                console.error('[RouteGenerator] Geolocation error:', err);
            }
        });
    }

    /**
     * Search for stops with null-safety
     */
    searchStops(query: string): void {
        if (!query || query.trim().length === 0) {
            this.searchResults = [];
            return;
        }

        this.busStopService.searchBusStops(query).subscribe({
            next: (response: any) => {
                // ✅ Null-safe array extraction
                const rawData = response?.data || response?.results || [];
                const resultsArray = Array.isArray(rawData) ? rawData : [];

                this.searchResults = resultsArray
                    .filter((stop: any) => stop != null)
                    .map((stop: any) => ({
                        name: stop?.name || 'Unknown',
                        lat: stop?.location?.coordinates?.[1] ?? stop?.latitude ?? 0,
                        lng: stop?.location?.coordinates?.[0] ?? stop?.longitude ?? 0
                    }))
                    .filter((stop: any) => stop.lat !== 0 && stop.lng !== 0);

                console.log('[RouteGenerator] Search results:', this.searchResults.length);
            },
            error: (err: any) => {
                console.error('[RouteGenerator] Search failed:', err);
                this.searchResults = [];
            }
        });
    }

    /**
     * Generate route with comprehensive error handling
     */
    generateRoute(): void {
        if (!this.selectedFrom || !this.selectedTo) {
            console.warn('[RouteGenerator] Missing origin or destination');
            return;
        }

        this.loading = true;
        this.routes = [];

        const routeRequest = {
            from: this.selectedFrom.name,
            to: this.selectedTo.name,
            fromLat: this.selectedFrom.lat,
            fromLng: this.selectedFrom.lng,
            toLat: this.selectedTo.lat,
            toLng: this.selectedTo.lng
        };

        console.log('[RouteGenerator] Generating route:', routeRequest);

        this.alongService.generateRoute(routeRequest).subscribe({
            next: (response: any) => {
                this.loading = false;

                // ✅ Null-safe route extraction
                const rawRoutes = response?.data?.routes || response?.routes || response?.data || [];
                const routesArray = Array.isArray(rawRoutes) ? rawRoutes : [];

                this.routes = routesArray
                    .filter((route: any) => route != null)
                    .map((route: any) => ({
                        ...route,
                        segments: Array.isArray(route?.segments) ? route.segments : [],
                        legs: Array.isArray(route?.legs) ? route.legs : [],
                        polyline: Array.isArray(route?.polyline) ? route.polyline : []
                    }));

                console.log('[RouteGenerator] Routes generated:', this.routes.length);

                if (this.routes.length === 0) {
                    console.warn('[RouteGenerator] No valid routes found');
                }
            },
            error: (err: any) => {
                this.loading = false;
                console.error('[RouteGenerator] Route generation failed:', err);
                this.routes = [];
            }
        });
    }
}
