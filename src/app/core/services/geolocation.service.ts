import { Injectable, signal } from '@angular/core';
import { Observable, from, throwError, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Coordinates {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: number;
}

@Injectable({
    providedIn: 'root'
})
export class GeolocationService {
    // Current location state
    public currentLocation = signal<Coordinates | null>(null);
    public isLocationEnabled = signal<boolean>(false);
    public locationError = signal<string | null>(null);

    private watchId: number | null = null;

    constructor() {
        this.checkGeolocationSupport();
    }

    /**
     * Check if geolocation is supported
     */
    private checkGeolocationSupport(): void {
        if ('geolocation' in navigator) {
            this.isLocationEnabled.set(true);
        } else {
            this.locationError.set('Geolocation is not supported by your browser');
        }
    }

    /**
     * Get highly accurate position (Simplified)
     */
    getCurrentPositionAccurate(): Observable<Coordinates> {
        if (!environment.geolocation.enabled) {
            return throwError(() => new Error('Geolocation is disabled'));
        }

        if (!navigator.geolocation) {
            return throwError(() => new Error('Geolocation is not supported'));
        }

        return from(
            new Promise<Coordinates>((resolve, reject) => {
                const config = environment.geolocation;
                console.log('[Geolocation] Requesting simple high-accuracy fix');

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const coords = this.mapPositionToCoords(position);
                        this.currentLocation.set(coords);
                        resolve(coords);
                    },
                    (error) => {
                        reject(new Error(this.handleGeolocationError(error)));
                    },
                    {
                        enableHighAccuracy: config.enableHighAccuracy,
                        timeout: config.timeout,
                        maximumAge: config.maximumAge
                    }
                );
            })
        );
    }

    /**
     * Get current position (one-time)
     * Now defaults to high-accuracy accurate method
     */
    getCurrentPosition(): Observable<Coordinates> {
        return this.getCurrentPositionAccurate();
    }

    /**
     * Get smart location with retry logic (handle GPS warm-up)
     */
    async getSmartLocation(): Promise<Coordinates | null> {
        for (let i = 0; i < 3; i++) {
            try {
                console.log(`[Geolocation] Smart location attempt ${i + 1}...`);
                const pos = await firstValueFrom(this.getCurrentPosition());

                // On some mobile devices, initial lock might return 0,0
                if (pos.latitude !== 0 || pos.longitude !== 0) {
                    console.log('[Geolocation] GPS Lock successful!');
                    return pos;
                }

                console.log(`[Geolocation] GPS Warming up (0,0)... retry ${i + 1}`);
            } catch (error) {
                console.warn(`[Geolocation] attempt ${i + 1} failed:`, error);
            }

            // Wait 2 seconds before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.error('[Geolocation] Failed to get lock after 3 attempts');
        return null;
    }

    /**
     * Helper to map GeolocationPosition to Coordinates
     */
    private mapPositionToCoords(position: GeolocationPosition): Coordinates {
        const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
        };

        this.currentLocation.set(coords);
        this.locationError.set(null);

        // Abuja Proximity Check (Lagos Bias Prevention)
        const distanceToAbuja = this.calculateDistance(
            coords.latitude, coords.longitude,
            environment.geolocation.defaultCenter.lat, environment.geolocation.defaultCenter.lng
        );

        if (distanceToAbuja > 100) { // More than 100km from Abuja
            console.warn(`[Geolocation] User is far from Abuja (${distanceToAbuja.toFixed(1)}km). Environmental bias suspected.`);
            // Note: We don't force a move, but we could set a flag for other components to show a warning
        }

        return coords;
    }

    /**
     * Watch position (continuous tracking)
     */
    watchPosition(callback: (coords: Coordinates) => void): void {
        if (!navigator.geolocation) {
            this.locationError.set('Geolocation is not supported');
            return;
        }

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const coords: Coordinates = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
                this.currentLocation.set(coords);
                this.locationError.set(null);
                callback(coords);
            },
            (error) => {
                const errorMsg = this.handleGeolocationError(error);
                this.locationError.set(errorMsg);
            },
            {
                enableHighAccuracy: environment.geolocation.enableHighAccuracy,
                timeout: environment.geolocation.timeout,
                maximumAge: environment.geolocation.maximumAge
            }
        );
    }

    /**
     * Stop watching position
     */
    clearWatch(): void {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    /**
     * Calculate distance between two coordinates (Haversine formula)
     * Returns distance in kilometers
     */
    calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
            Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Format distance for display
     */
    formatDistance(distanceInKm: number): string {
        if (distanceInKm < 1) {
            return `${Math.round(distanceInKm * 1000)}m`;
        }
        return `${distanceInKm.toFixed(1)}km`;
    }

    /**
     * Convert degrees to radians
     */
    private toRad(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Get formatted address from coordinates (requires geocoding API)
     */
    getAddressFromCoordinates(lat: number, lng: number): Observable<string> {
        // This would use a geocoding service (Google Maps, Mapbox, etc.)
        // For now, return a placeholder
        return from(
            Promise.resolve(`Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        );
    }

    /**
     * Handle geolocation errors
     */
    private handleGeolocationError(error: GeolocationPositionError): string {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return 'Location permission denied. Please enable location access.';
            case error.POSITION_UNAVAILABLE:
                return 'Location information is unavailable.';
            case error.TIMEOUT:
                return 'Location request timed out.';
            default:
                return 'An unknown error occurred while getting location.';
        }
    }

    /**
     * Check if coordinates are valid
     */
    isValidCoordinates(lat: number, lng: number): boolean {
        return (
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180 &&
            !isNaN(lat) &&
            !isNaN(lng)
        );
    }

    /**
     * Get default location (fallback)
     */
    getDefaultLocation(): Coordinates {
        return {
            latitude: environment.geolocation.defaultCenter.lat,
            longitude: environment.geolocation.defaultCenter.lng
        };
    }

    /**
     * Request location permission
     */
    async requestPermission(): Promise<boolean> {
        try {
            const result = await this.getCurrentPosition().toPromise();
            return !!result;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get distance from current location
     */
    getDistanceFromCurrentLocation(lat: number, lng: number): number | null {
        const current = this.currentLocation();
        if (!current) return null;

        return this.calculateDistance(
            current.latitude,
            current.longitude,
            lat,
            lng
        );
    }

    /**
     * Check if location is within radius (in km)
     */
    isWithinRadius(lat: number, lng: number, radius: number): boolean {
        const distance = this.getDistanceFromCurrentLocation(lat, lng);
        return distance !== null && distance <= radius;
    }
}