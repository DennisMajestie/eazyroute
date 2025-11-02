// // src/app/core/services/geolocation.service.ts
// import { Injectable, signal } from '@angular/core';
// import { Observable, from, throwError } from 'rxjs';
// import { environment } from '../../../environments/environment';

// export interface Coordinates {
//   latitude: number;
//   longitude: number;
//   accuracy?: number;
//   timestamp?: number;
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class GeolocationService {
//   // Current location state
//   public currentLocation = signal<Coordinates | null>(null);
//   public isLocationEnabled = signal<boolean>(false);
//   public locationError = signal<string | null>(null);

//   private watchId: number | null = null;

//   constructor() {
//     this.checkGeolocationSupport();
//   }

//   /**
//    * Check if geolocation is supported
//    */
//   private checkGeolocationSupport(): void {
//     if ('geolocation' in navigator) {
//       this.isLocationEnabled.set(true);
//     } else {
//       this.locationError.set('Geolocation is not supported by your browser');
//     }
//   }

//   /**
//    * Get current position (one-time)
//    */
//   getCurrentPosition(): Observable<Coordinates> {
//     if (!environment.enableGeolocation) {
//       return throwError(() => new Error('Geolocation is disabled'));
//     }

//     if (!navigator.geolocation) {
//       return throwError(() => new Error('Geolocation is not supported'));
//     }

//     return from(
//       new Promise<Coordinates>((resolve, reject) => {
//         navigator.geolocation.getCurrentPosition(
//           (position) => {
//             const coords: Coordinates = {
//               latitude: position.coords.latitude,
//               longitude: position.coords.longitude,
//               accuracy: position.coords.accuracy,
//               timestamp: position.timestamp
//             };
//             this.currentLocation.set(coords);
//             this.locationError.set(null);
//             resolve(coords);
//           },
//           (error) => {
//             const errorMsg = this.handleGeolocationError(error);
//             this.locationError.set(errorMsg);
//             reject(new Error(errorMsg));
//           },
//           {
//             enableHighAccuracy: true,
//             timeout: 10000,
//             maximumAge: 0
//           }
//         );
//       })
//     );
//   }

//   /**
//    * Watch position (continuous tracking)
//    */
//   watchPosition(callback: (coords: Coordinates) => void): void {
//     if (!navigator.geolocation) {
//       this.locationError.set('Geolocation is not supported');
//       return;
//     }

//     this.watchId = navigator.geolocation.watchPosition(
//       (position) => {
//         const coords: Coordinates = {
//           latitude: position.coords.latitude,
//           longitude: position.coords.longitude,
//           accuracy: position.coords.accuracy,
//           timestamp: position.timestamp
//         };
//         this.currentLocation.set(coords);
//         this.locationError.set(null);
//         callback(coords);
//       },
//       (error) => {
//         const errorMsg = this.handleGeolocationError(error);
//         this.locationError.set(errorMsg);
//       },
//       {
//         enableHighAccuracy: true,
//         timeout: 10000,
//         maximumAge: 30000 // Accept cached position up to 30 seconds old
//       }
//     );
//   }

//   /**
//    * Stop watching position
//    */
//   clearWatch(): void {
//     if (this.watchId !== null) {
//       navigator.geolocation.clearWatch(this.watchId);
//       this.watchId = null;
//     }
//   }

//   /**
//    * Calculate distance between two coordinates (Haversine formula)
//    * Returns distance in kilometers
//    */
//   calculateDistance(
//     lat1: number,
//     lon1: number,
//     lat2: number,
//     lon2: number
//   ): number {
//     const R = 6371; // Earth's radius in km
//     const dLat = this.toRad(lat2 - lat1);
//     const dLon = this.toRad(lon2 - lon1);
//     const a =
//       Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//       Math.cos(this.toRad(lat1)) *
//         Math.cos(this.toRad(lat2)) *
//         Math.sin(dLon / 2) *
//         Math.sin(dLon / 2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     return R * c;
//   }

//   /**
//    * Convert degrees to radians
//    */
//   private toRad(degrees: number): number {
//     return degrees * (Math.PI / 180);
//   }

//   /**
//    * Get formatted address from coordinates (requires geocoding API)
//    */
//   getAddressFromCoordinates(lat: number, lng: number): Observable<string> {
//     // This would use a geocoding service (Google Maps, Mapbox, etc.)
//     // For now, return a placeholder
//     return from(
//       Promise.resolve(`Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
//     );
//   }

//   /**
//    * Handle geolocation errors
//    */
//   private handleGeolocationError(error: GeolocationPositionError): string {
//     switch (error.code) {
//       case error.PERMISSION_DENIED:
//         return 'Location permission denied. Please enable location access.';
//       case error.POSITION_UNAVAILABLE:
//         return 'Location information is unavailable.';
//       case error.TIMEOUT:
//         return 'Location request timed out.';
//       default:
//         return 'An unknown error occurred while getting location.';
//     }
//   }

//   /**
//    * Check if coordinates are valid
//    */
//   isValidCoordinates(lat: number, lng: number): boolean {
//     return (
//       lat >= -90 &&
//       lat <= 90 &&
//       lng >= -180 &&
//       lng <= 180 &&
//       !isNaN(lat) &&
//       !isNaN(lng)
//     );
//   }

//   /**
//    * Get default location (fallback)
//    */
//   getDefaultLocation(): Coordinates {
//     return {
//       latitude: environment.defaultMapCenter.lat,
//       longitude: environment.defaultMapCenter.lng
//     };
//   }

//   /**
//    * Request location permission
//    */
//   async requestPermission(): Promise<boolean> {
//     try {
//       const result = await this.getCurrentPosition().toPromise();
//       return !!result;
//     } catch (error) {
//       return false;
//     }
//   }
// }


import { Injectable, signal } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
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
     * Get current position (one-time)
     */
    getCurrentPosition(): Observable<Coordinates> {
        if (!environment.geolocation.enabled) {
            return throwError(() => new Error('Geolocation is disabled'));
        }

        if (!navigator.geolocation) {
            return throwError(() => new Error('Geolocation is not supported'));
        }

        return from(
            new Promise<Coordinates>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const coords: Coordinates = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            timestamp: position.timestamp
                        };
                        this.currentLocation.set(coords);
                        this.locationError.set(null);
                        resolve(coords);
                    },
                    (error) => {
                        const errorMsg = this.handleGeolocationError(error);
                        this.locationError.set(errorMsg);
                        reject(new Error(errorMsg));
                    },
                    {
                        enableHighAccuracy: environment.geolocation.enableHighAccuracy,
                        timeout: environment.geolocation.timeout,
                        maximumAge: 0
                    }
                );
            })
        );
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