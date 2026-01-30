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
     * Get smart location with retry logic (Smart Strategy)
     * 1. High-Accuracy (GPS) < 50m
     * 2. Retry 1: Threshold < 100m
     * 3. Retry 2: Accept Coarse (IP-based)
     */
    async getSmartLocation(): Promise<Coordinates | null> {
        // Attempt 1: High Accuracy (GPS) - Increased to 15s timeout
        try {
            console.log('[Geolocation] Attempt 1: High Accuracy (GPS)');
            return await this.getPositionWithTimeout(50, 15000, true);
        } catch (e) {
            console.warn("[Geolocation] GPS failed, falling back to Tower/WiFi...");
        }

        // Attempt 2: Low Accuracy (Fast) - Increased to 10s timeout
        try {
            console.log('[Geolocation] Attempt 2: Low Accuracy (Cell/WiFi)');
            return await this.getPositionWithTimeout(100, 10000, false);
        } catch (e) {
            console.warn('[Geolocation] Attempt 2 failed:', e);
        }

        // Attempt 3: Coarse Location (Accept anything) - Increased to 10s timeout
        try {
            console.log('[Geolocation] Attempt 3: Coarse Location');
            const pos = await this.getPositionWithTimeout(Infinity, 10000, false);
            // Mark as coarse/low accuracy for UI warnings
            pos.accuracy = pos.accuracy || 5000;
            return pos;
        } catch (e) {
            console.error('[Geolocation] All attempts failed, using fallback from environment');
            const fallback = this.getDefaultLocation();
            if (fallback) {
                fallback.accuracy = 10000; // Indicate low accuracy/fallback
                this.currentLocation.set(fallback);
            }
            return fallback;
        }
    }

    /**
     * Helper to get position with timeout and specific options
     */
    private getPositionWithTimeout(
        targetAccuracy: number,
        timeoutMs: number,
        highAccuracy: boolean = true
    ): Promise<Coordinates> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            const tid = setTimeout(() => {
                reject(new Error('Timeout'));
            }, timeoutMs + 1000); // Give native timeout 1s head start

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(tid);
                    const coords = this.mapPositionToCoords(position);
                    resolve(coords);
                },
                (error) => {
                    clearTimeout(tid);
                    reject(error);
                },
                {
                    enableHighAccuracy: highAccuracy,
                    timeout: timeoutMs,
                    maximumAge: 60000 // 🇳🇬 Optimized: Use cached position if < 1 min old
                }
            );
        });
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

        // 1. Accuracy Filter: Reject if accuracy > 1000m
        if (coords.accuracy && coords.accuracy > 1000) {
            console.warn(`[Geolocation] Rejected inaccurate fix: ${coords.accuracy}m`);
            return coords; // Return anyway, but components should check accuracy
        }

        // 2. Detect "Lagos Ghost": 6.4474, 3.3903
        if (Math.abs(coords.latitude - 6.4474) < 0.0001 && Math.abs(coords.longitude - 3.3903) < 0.0001) {
            console.error('[Geolocation] Lagos Ghost detected! Blocking uninitialized GPS coords.');
            return coords;
        }

        // 3. Abuja Bounding Box Check: [7.2, 7.6] (lng) and [8.8, 9.2] (lat)
        const isInsideAbuja =
            coords.latitude >= 8.8 && coords.latitude <= 9.2 &&
            coords.longitude >= 7.2 && coords.longitude <= 7.6;

        if (!isInsideAbuja) {
            console.warn(`[Geolocation] User is outside the Abuja coverage box (${coords.latitude}, ${coords.longitude})`);
        }

        this.currentLocation.set(coords);
        this.locationError.set(null);

        // 🇳🇬 Persistent Fallback: Save to localStorage for thick-building scenarios
        localStorage.setItem('lastKnownLocation', JSON.stringify({
            lat: coords.latitude,
            lng: coords.longitude,
            timestamp: Date.now()
        }));

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
     * Check if coordinates are valid and trustable
     */
    isValidCoordinates(lat: number, lng: number, accuracy?: number): boolean {
        // 1. Range Check
        const inRange = lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !isNaN(lat) && !isNaN(lng);
        if (!inRange) return false;

        // 2. 0,0 and Lagos Ghost Block
        if (lat === 0 && lng === 0) return false;
        if (Math.abs(lat - 6.4474) < 0.0001 && Math.abs(lng - 3.3903) < 0.0001) return false;

        // 3. Accuracy Filter
        if (accuracy !== undefined && accuracy > 1000) return false;

        return true;
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