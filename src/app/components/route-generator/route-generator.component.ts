import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BusStopService } from '../../core/services/bus-stop.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { AlongService } from '../../core/services/along.service'; // Fix path to core/services

@Component({
    selector: 'app-route-generator',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './route-generator.component.html',
    styleUrls: ['./route-generator.component.css'] // Adjusted from .scss to .css to match previous file content
})
export class RouteGeneratorComponent implements OnInit {
    nearbyStops: any[] = [];
    searchResults: any[] = [];
    selectedFrom: any = null;
    selectedTo: any = null;
    routes: any[] = [];
    routeLegs: any[] = [];
    totalDistance: number = 0;
    totalDuration: number = 0;
    loading = false;
    isLocating = false;
    error: string | null = null;
    showNearbyDropdown = false;
    fromLocation = { name: '', lat: 0, lng: 0 };
    toLocation = { name: '', lat: 0, lng: 0 };

    constructor(
        private busStopService: BusStopService,
        private geolocationService: GeolocationService,
        private alongService: AlongService
    ) { }

    ngOnInit(): void {
        this.loadNearbyStops();
    }

    /**
     * Use user's current location
     */
    useMyLocation(): void {
        this.isLocating = true;
        this.geolocationService.getCurrentPosition().subscribe({
            next: (pos) => {
                this.isLocating = false;
                this.fromLocation = {
                    name: 'Current Location',
                    lat: pos.latitude,
                    lng: pos.longitude
                };
                this.selectedFrom = this.fromLocation;
                this.loadNearbyStops();
            },
            error: (err) => {
                this.isLocating = false;
                console.error('[RouteGenerator] Could not get location:', err);
                this.error = 'Could not get your location. Please check permissions.';
            }
        });
    }

    /**
     * Select a stop from nearby list
     */
    selectNearbyStop(stop: any): void {
        this.fromLocation = {
            name: stop.name,
            lat: stop.lat,
            lng: stop.lng
        };
        this.selectedFrom = this.fromLocation;
        // this.showNearbyDropdown = false;
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

        const fromLocation = {
            name: this.selectedFrom.name,
            lat: this.selectedFrom.lat,
            lng: this.selectedFrom.lng
        };

        const toLocation = {
            name: this.selectedTo.name,
            lat: this.selectedTo.lat,
            lng: this.selectedTo.lng
        };

        console.log('[RouteGenerator] Generating route from:', fromLocation, 'to:', toLocation);

        this.alongService.generateRoute(fromLocation, toLocation).subscribe({
            next: (response: any) => {
                this.loading = false;
                this.error = null;

                // ✅ Sync with template: routeLegs, totalDistance, totalDuration
                const routeData = response?.data || response;

                if (routeData && Array.isArray(routeData.legs)) {
                    this.routeLegs = routeData.legs;
                    this.totalDistance = routeData.totalDistance || 0;
                    this.totalDuration = routeData.totalDuration || 0;
                } else if (routeData && Array.isArray(routeData.routes) && routeData.routes[0]?.legs) {
                    const bestRoute = routeData.routes[0];
                    this.routeLegs = bestRoute.legs;
                    this.totalDistance = bestRoute.totalDistance || 0;
                    this.totalDuration = bestRoute.totalDuration || 0;
                }

                console.log('[RouteGenerator] Route summary:', {
                    legs: this.routeLegs.length,
                    dist: this.totalDistance
                });

                if (this.routeLegs.length === 0) {
                    this.error = 'No valid routes found between these locations.';
                }
            },
            error: (err: any) => {
                this.loading = false;
                console.error('[RouteGenerator] Route generation failed:', err);
                this.error = err?.error?.message || 'Failed to generate route. Please try different locations.';
                this.routeLegs = [];
            }
        });
    }
}
