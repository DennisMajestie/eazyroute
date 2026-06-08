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
    public currentLocation = signal<Coordinates | null>(null);
    public isLocationEnabled = signal<boolean>(false);
    public locationError = signal<string | null>(null);

    private watchId: number | null = null;

    constructor() {
        this.checkGeolocationSupport();
    }

    private checkGeolocationSupport(): void {
        if ('geolocation' in navigator) {
            this.isLocationEnabled.set(true);
        } else {
            this.locationError.set('Geolocation is not supported by your browser');
        }
    }

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

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        try {
                            const coords = this.mapPositionToCoords(position);
                            this.currentLocation.set(coords);
                            resolve(coords);
                        } catch (error) {
                            reject(error instanceof Error ? error : new Error(String(error)));
                        }
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

    getCurrentPosition(): Observable<Coordinates> {
        return this.getCurrentPositionAccurate();
    }

    async getSmartLocation(): Promise<Coordinates | null> {
        try {
            return await this.getPositionWithTimeout(50, 5000, true);
        } catch (e: any) {
            if (e?.code === 1) {
                console.warn('[Geolocation] User denied location permission - using fallback locations');
            } else {
                console.warn('[Geolocation] GPS failed, falling back to Tower/WiFi...');

                try {
                    return await this.getPositionWithTimeout(100, 3000, false);
                } catch (e2: any) {
                    console.warn('[Geolocation] Attempt 2 failed:', e2);
                }
            }
        }

        console.warn('[Geolocation] GPS/Network failed. Checking for persistent fallbacks...');

        const primary = this.getPrimaryLocation();
        if (primary && this.isValidCoordinates(primary.latitude, primary.longitude)) {
            this.currentLocation.set(primary);
            return primary;
        }

        const lastKnown = this.getLastKnownLocation();
        if (lastKnown && this.isValidCoordinates(lastKnown.latitude, lastKnown.longitude)) {
            this.currentLocation.set(lastKnown);
            return lastKnown;
        }

        console.warn('[Geolocation] Using default location as fallback');
        const defaultLocation = this.getDefaultLocation();
        this.currentLocation.set(defaultLocation);
        return defaultLocation;
    }

    private getLastKnownLocation(): Coordinates | null {
        const stored = localStorage.getItem('lastKnownLocation');
        if (!stored) return null;

        try {
            const parsed = JSON.parse(stored);
            return {
                latitude: parsed.lat || parsed.latitude,
                longitude: parsed.lng || parsed.longitude,
                accuracy: 1000
            };
        } catch {
            return null;
        }
    }

    public setPrimaryLocation(coords: Coordinates): void {
        localStorage.setItem('primaryLocation', JSON.stringify({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy || 0,
            timestamp: Date.now()
        }));
    }

    public getPrimaryLocation(): Coordinates | null {
        const stored = localStorage.getItem('primaryLocation');
        if (!stored) return null;

        try {
            return JSON.parse(stored);
        } catch {
            return null;
        }
    }

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
            }, timeoutMs + 1000);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(tid);
                    try {
                        const coords = this.mapPositionToCoords(position);
                        resolve(coords);
                    } catch (error) {
                        reject(error instanceof Error ? error : new Error(String(error)));
                    }
                },
                (error) => {
                    clearTimeout(tid);
                    reject(error);
                },
                {
                    enableHighAccuracy: highAccuracy,
                    timeout: timeoutMs,
                    maximumAge: 300000
                }
            );
        });
    }

    private mapPositionToCoords(position: GeolocationPosition): Coordinates {
        const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
        };

        if (coords.accuracy && coords.accuracy > 1000) {
            console.warn(`[Geolocation] Rejected inaccurate fix: ${coords.accuracy}m`);
            throw new Error(`INACCURATE_FIX:${coords.accuracy}m`);
        }

        if (
            Math.abs(coords.latitude - 6.4474) < 0.0001 &&
            Math.abs(coords.longitude - 3.3903) < 0.0001
        ) {
            console.error('[Geolocation] Lagos Ghost detected! Blocking uninitialized GPS coords.');
            throw new Error('LAGOS_GHOST');
        }

        const isInsideAbuja =
            coords.latitude >= 8.8 && coords.latitude <= 9.2 &&
            coords.longitude >= 7.2 && coords.longitude <= 7.6;

        if (!isInsideAbuja) {
            console.warn(`[Geolocation] User is outside the Abuja coverage box (${coords.latitude}, ${coords.longitude})`);
        }

        this.currentLocation.set(coords);
        this.locationError.set(null);

        localStorage.setItem('lastKnownLocation', JSON.stringify({
            lat: coords.latitude,
            lng: coords.longitude,
            timestamp: Date.now()
        }));

        return coords;
    }

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

    clearWatch(): void {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371;
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

    formatDistance(distanceInKm: number): string {
        if (distanceInKm < 1) {
            return `${Math.round(distanceInKm * 1000)}m`;
        }
        return `${distanceInKm.toFixed(1)}km`;
    }

    private toRad(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    getAddressFromCoordinates(lat: number, lng: number): Observable<string> {
        return from(
            Promise.resolve(`Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        );
    }

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

    isValidCoordinates(lat: number, lng: number, accuracy?: number): boolean {
        const inRange =
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180 &&
            !isNaN(lat) && !isNaN(lng);
        if (!inRange) return false;

        if (lat === 0 && lng === 0) return false;
        if (
            Math.abs(lat - 6.4474) < 0.0001 &&
            Math.abs(lng - 3.3903) < 0.0001
        ) return false;

        if (accuracy !== undefined && accuracy > 1000) return false;

        return true;
    }

    getDefaultLocation(): Coordinates {
        return {
            latitude: environment.geolocation.defaultCenter.lat,
            longitude: environment.geolocation.defaultCenter.lng
        };
    }

    async requestPermission(): Promise<boolean> {
        try {
            const result = await firstValueFrom(this.getCurrentPosition());
            return !!result;
        } catch {
            return false;
        }
    }

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

    isWithinRadius(lat: number, lng: number, radius: number): boolean {
        const distance = this.getDistanceFromCurrentLocation(lat, lng);
        return distance !== null && distance <= radius;
    }
}
