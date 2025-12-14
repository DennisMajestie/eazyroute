
// ═══════════════════════════════════════════════════════════════════
// FILE 2: Location Service Adapter
// Location: src/app/core/engines/adapters/location-service.adapter.ts
// ═══════════════════════════════════════════════════════════════════

import { Injectable } from '@angular/core';
import { GeolocationService, Coordinates } from '../../services/geolocation.service';
import { ILocationService, Location } from '../types/easyroute.types';
import { Observable, firstValueFrom, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class LocationServiceAdapter implements ILocationService {
    constructor(private geolocationService: GeolocationService) { }

    async getCurrentLocation(): Promise<Location> {
        try {
            const coords = await firstValueFrom(
                this.geolocationService.getCurrentPosition()
            );
            return {
                latitude: coords.latitude,
                longitude: coords.longitude,
                timestamp: coords.timestamp ? new Date(coords.timestamp) : new Date()
            };
        } catch (error) {
            console.error('[LocationService] Error getting current location:', error);
            // Return default location on error
            const defaultCoords = this.geolocationService.getDefaultLocation();
            return {
                latitude: defaultCoords.latitude,
                longitude: defaultCoords.longitude,
                timestamp: new Date()
            };
        }
    }

    watchLocation(): Observable<Location> {
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

    calculateDistance(from: Location, to: Location): number {
        // Your service returns distance in km, we need meters
        const distanceInKm = this.geolocationService.calculateDistance(
            from.latitude,
            from.longitude,
            to.latitude,
            to.longitude
        );
        return distanceInKm * 1000; // Convert to meters
    }

    calculateBearing(from: Location, to: Location): number {
        const lat1 = this.toRadians(from.latitude);
        const lat2 = this.toRadians(to.latitude);
        const dLon = this.toRadians(to.longitude - from.longitude);

        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

        const bearing = Math.atan2(y, x);
        return (this.toDegrees(bearing) + 360) % 360; // Normalize to 0-360
    }

    isWithinRadius(point: Location, center: Location, radiusMeters: number): boolean {
        const distance = this.calculateDistance(point, center);
        return distance <= radiusMeters;
    }

    isOnRoute(
        currentLocation: Location,
        routePath: Location[],
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

    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    private toDegrees(radians: number): number {
        return radians * (180 / Math.PI);
    }
}
