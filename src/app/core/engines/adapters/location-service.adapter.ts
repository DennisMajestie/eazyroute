
// ═══════════════════════════════════════════════════════════════════
// FILE 2: Location Service Adapter
// Location: src/app/core/engines/adapters/location-service.adapter.ts
// ═══════════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@angular/core';
import { GeolocationService, Coordinates } from '../../services/geolocation.service';
// 🛡️ Safety: Rename 'Location' to 'AppLocation' to avoid collision with DOM 'Location'
import { ILocationService, Location as AppLocation, IBusStopRepository } from '../types/easyroute.types';
import { Observable, firstValueFrom, map } from 'rxjs';
import { BUS_STOP_REPOSITORY } from './engine-adapters.provider';

@Injectable({
    providedIn: 'root'
})
export class LocationServiceAdapter implements ILocationService {
    constructor(
        private geolocationService: GeolocationService,
        @Inject(BUS_STOP_REPOSITORY) private busStopRepo: IBusStopRepository
    ) { }

    async getCurrentLocation(): Promise<AppLocation> {
        try {
            // 🇳🇬 Use smart location for better resilience (GPS -> WiFi -> LastKnown)
            const coords = await this.geolocationService.getSmartLocation();

            if (!coords) {
                throw new Error('Unable to determine location');
            }

            return {
                latitude: coords.latitude,
                longitude: coords.longitude,
                timestamp: coords.timestamp ? new Date(coords.timestamp) : new Date()
            };
        } catch (error) {
            console.error('[LocationService] Error getting current location:', error);
            // 🛡️ Safety: Propagate error instead of returning a default location.
            // Returning default transmits "Abuja City Center" to the backend, causing false deviations.
            throw error;
        }
    }

    watchLocation(): Observable<AppLocation> {
        return new Observable(subscriber => {
            this.geolocationService.watchPosition((coords: Coordinates) => {
                subscriber.next({
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    timestamp: coords.timestamp ? new Date(coords.timestamp) : new Date()
                });
            });

            // Cleanup function
            return () => {
                this.geolocationService.clearWatch();
            };
        });
    }

    calculateDistance(from: AppLocation, to: AppLocation): number {
        // Your service returns distance in km, we need meters
        const distanceInKm = this.geolocationService.calculateDistance(
            from.latitude,
            from.longitude,
            to.latitude,
            to.longitude
        );
        return distanceInKm * 1000; // Convert to meters
    }

    calculateBearing(from: AppLocation, to: AppLocation): number {
        const lat1 = this.toRadians(from.latitude);
        const lat2 = this.toRadians(to.latitude);
        const dLon = this.toRadians(to.longitude - from.longitude);

        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

        const bearing = Math.atan2(y, x);
        return (this.toDegrees(bearing) + 360) % 360; // Normalize to 0-360
    }

    isWithinRadius(point: AppLocation, center: AppLocation, radiusMeters: number): boolean {
        const distance = this.calculateDistance(point, center);
        return distance <= radiusMeters;
    }

    isOnRoute(
        currentLocation: AppLocation,
        routePath: AppLocation[],
        toleranceMeters: number
    ): boolean {
        // Check if current location is within tolerance of any point on the route
        for (const pathPoint of routePath) {
            const distance = this.calculateDistance(currentLocation, pathPoint);
            if (distance <= toleranceMeters) {
                return true;
            }
        }
        return false;
    }

    async snapToNearestNode(location: AppLocation): Promise<AppLocation> {
        try {
            const nearbyStops = await this.busStopRepo.findNearby(location, 150);
            if (!nearbyStops || nearbyStops.length === 0) {
                return location;
            }
            // Find the closest stop
            let closest = nearbyStops[0];
            let minDist = this.calculateDistance(location, {
                latitude: closest.latitude,
                longitude: closest.longitude
            } as AppLocation);
            for (let i = 1; i < nearbyStops.length; i++) {
                const stop = nearbyStops[i];
                const dist = this.calculateDistance(location, {
                    latitude: stop.latitude,
                    longitude: stop.longitude
                } as AppLocation);
                if (dist < minDist) {
                    minDist = dist;
                    closest = stop;
                }
            }
            // Snap only if within 75 meters
            if (minDist <= 75) {
                return {
                    latitude: closest.latitude,
                    longitude: closest.longitude,
                    timestamp: new Date(),
                    confidence: 95,
                    isFiltered: true
                };
            }
            return location;
        } catch (e) {
            return location;
        }
    }

    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    private toDegrees(radians: number): number {
        return radians * (180 / Math.PI);
    }
}
