
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AlongService } from '../../core/services/along.service';
import { BusStopService } from '../../core/services/bus-stop.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { AlongRoute, AlongSegment } from '../../models/transport.types';
import { BusStopResponse } from '../../core/services/bus-stop.service';

@Component({
    selector: 'app-route-generator',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './route-generator.component.html',
    styleUrls: ['./route-generator.component.css']
})
export class RouteGeneratorComponent {
    routeLegs: AlongSegment[] = [];
    loading = false;
    error: string | null = null;
    totalDistance = 0;
    totalDuration = 0;
    alternativesCount = 0;

    // Location State
    isLocating = false;
    nearbyStops: any[] = []; // Using any to match API response structure flexibly
    showNearbyDropdown = false;

    fromLocation = {
        name: 'Dogongada Village',
        lat: 9.0067,
        lng: 7.3589,
        isHybrid: false
    };

    toLocation = {
        name: 'Lugbe Total',
        lat: 8.9897,
        lng: 7.3789,
        isHybrid: false
    };

    constructor(
        private alongService: AlongService,
        private busStopService: BusStopService,
        private geolocationService: GeolocationService
    ) { }

    /**
     * Use My Location to find nearest stops
     */
    async useMyLocation() {
        this.isLocating = true;
        this.error = null;
        this.nearbyStops = [];
        this.fromLocation.isHybrid = false;

        try {
            // 1. Get Coordinates (Smart Strategy)
            const position = await this.geolocationService.getSmartLocation();

            if (!position) {
                throw new Error('Could not retrieve location. Please ensure GPS is enabled.');
            }

            // Check for low accuracy
            if (position.accuracy && position.accuracy > 100) {
                // We could show a toast here, but for now we'll just log it or rely on the UI displaying "Unverified" implicit context
                console.warn(`[RouteGen] Low accuracy detected: ${position.accuracy}m`);
            }

            // 2. Fetch Nearby Stops with 1000m radius
            this.busStopService.getNearbyStops(position.latitude, position.longitude, 1000, 5)
                .subscribe({
                    next: (response: any) => {
                        const stops = Array.isArray(response) ? response : (response.data || []);
                    }));

            this.handleAbujaLogic(position, this.nearbyStops);
            this.isLocating = false;
        },
        error: (err) => {
            console.error('Nearby stops error:', err);
            // Fallback: Use raw coords even if API fails
            this.handleAbujaLogic(position, []);
            this.isLocating = false;
        }
    });

} catch (err: any) {
    console.error('Geolocation error:', err);
    this.error = err.message || 'Location access denied.';
    this.isLocating = false;
}
    }

    /**
     * Implement Abuja Entitlement Logic
     * - < 50m to Node: Snap to Node
     * - > 800m from Node: Warn "Walking Distance Exceeded"
     */
    private handleAbujaLogic(position: any, stops: any[]) {
    const nearest = stops.length > 0 ? stops[0] : null;

    if (nearest && nearest.distance < 50) {
        // Snap to Node
        this.selectNearbyStop(nearest);
        this.showNearbyDropdown = false; // Auto-selected
        console.log(`[AbujaLogic] Snapped to ${nearest.name} (< 50m)`);
    } else {
        // Use Raw Coords
        this.fromLocation = {
            name: `My Location (${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)})`,
            lat: position.latitude,
            lng: position.longitude,
            isHybrid: true // Flag to show warnings
        };

        // Check if stranded (Walking Distance Exceeded)
        if (!nearest || nearest.distance > 800) {
            this.error = '⚠️ Warning: You are far from verified stops (> 800m). Walking distance may be exceeded.';
        } else {
            // Just show dropdown for manual selection if desired
            this.showNearbyDropdown = true;
        }
    }
}

/**
 * Select a stop from nearby list
 */
selectNearbyStop(stop: any) {
    this.fromLocation = {
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        isHybrid: false
    };
    this.showNearbyDropdown = false;
}

generateRoute(): void {
    this.loading = true;
    this.error = null;
    this.routeLegs = [];
    this.alternativesCount = 0;

    // Ensure we pass the right format to AlongService
    const fromPayload = this.fromLocation.lat ? this.fromLocation : this.fromLocation.name;
    const toPayload = this.toLocation.lat ? this.toLocation : this.toLocation.name;

    this.alongService.generateRoute(fromPayload, toPayload).subscribe({
        next: (response) => {
            console.log('[RouteGenerator] API Response:', response);
            if (response.success && response.data && response.data.length > 0) {
                const route = response.data[0];
                console.log('[RouteGenerator] First Route:', route);
                this.routeLegs = route.segments || [];
                this.totalDistance = route.totalDistance;
                this.totalDuration = route.totalTime;

                if (this.routeLegs.length === 0) {
                    console.warn('[RouteGenerator] Route has no segments!', route);
                    this.error = 'Route found but has no segments.';
                }

                // K-Best Routing: Check for alternatives
                if (route.alternatives && route.alternatives.length > 0) {
                    this.alternativesCount = route.alternatives.length;
                    console.log('K-Best Routing: Found', this.alternativesCount, 'alternatives');
                }
            } else {
                console.warn('[RouteGenerator] No routes in response data:', response);
                this.error = response.message || 'No route found';
            }
            this.loading = false;
        },
        error: (err) => {
            console.error('[RouteGenerator] Error generating route:', err);
            this.error = err.error?.message || err.message || 'Failed to generate route';
            this.loading = false;
        }
    });
}
}
