// ═══════════════════════════════════════════════════════════════════
// FILE 3: Routing Service Implementation
// Location: src/app/core/engines/adapters/routing-service.adapter.ts
// ═══════════════════════════════════════════════════════════════════

import { HttpClient } from '@angular/common/http';
import { IRoutingService, TransportMode, Location as EasyRouteLocation } from '../types/easyroute.types';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LocationServiceAdapter } from './location-service.adapter';

@Injectable({
    providedIn: 'root'
})
export class RoutingServiceAdapter implements IRoutingService {
    // You can integrate with Google Maps Directions API, Mapbox, or OpenRouteService
    private readonly GOOGLE_MAPS_API_KEY = environment.googleMapsApiKey || '';

    constructor(
        private http: HttpClient,
        private locationAdapter: LocationServiceAdapter
    ) { }

    async calculateRoute(
        from: EasyRouteLocation,
        to: EasyRouteLocation,
        mode: TransportMode
    ): Promise<{
        distance: number;
        duration: number;
        path: EasyRouteLocation[];
        polyline?: string;
    }> {
        try {
            // Option 1: Use Google Maps Directions API (if you have API key)
            if (this.GOOGLE_MAPS_API_KEY) {
                return await this.calculateRouteWithGoogleMaps(from, to, mode);
            }

            // Option 2: Fallback to simple straight-line calculation
            return this.calculateStraightLineRoute(from, to, mode);
        } catch (error) {
            console.error('[RoutingService] Error calculating route:', error);
            return this.calculateStraightLineRoute(from, to, mode);
        }
    }

    async calculateMultiStopRoute(
        stops: EasyRouteLocation[],
        mode: TransportMode
    ): Promise<{
        distance: number;
        duration: number;
        path: EasyRouteLocation[];
        polyline?: string;
    }> {
        try {
            // Calculate cumulative route through all stops
            let totalDistance = 0;
            let totalDuration = 0;
            const path: EasyRouteLocation[] = [];

            for (let i = 0; i < stops.length - 1; i++) {
                const segment = await this.calculateRoute(stops[i], stops[i + 1], mode);
                totalDistance += segment.distance;
                totalDuration += segment.duration;
                path.push(...segment.path);
            }

            return {
                distance: totalDistance,
                duration: totalDuration,
                path
            };
        } catch (error) {
            console.error('[RoutingService] Error calculating multi-stop route:', error);
            throw error;
        }
    }

    /**
     * Calculate route using Google Maps Directions API
     */
    private async calculateRouteWithGoogleMaps(
        from: EasyRouteLocation,
        to: EasyRouteLocation,
        mode: TransportMode
    ): Promise<any> {
        const travelMode = this.mapModeToGoogleMode(mode.type);
        const url = `https://maps.googleapis.com/maps/api/directions/json`;

        const params = {
            origin: `${from.latitude},${from.longitude}`,
            destination: `${to.latitude},${to.longitude}`,
            mode: travelMode,
            key: this.GOOGLE_MAPS_API_KEY
        };

        try {
            const response: any = await firstValueFrom(
                this.http.get(url, { params })
            );

            if (response.status === 'OK' && response.routes.length > 0) {
                const route = response.routes[0];
                const leg = route.legs[0];

                return {
                    distance: leg.distance.value, // meters
                    duration: leg.duration.value / 60, // convert seconds to minutes
                    path: this.decodePolyline(route.overview_polyline.points),
                    polyline: route.overview_polyline.points
                };
            }

            throw new Error('No route found');
        } catch (error) {
            console.error('[RoutingService] Google Maps API error:', error);
            throw error;
        }
    }

    /**
     * Fallback: Simple straight-line calculation
     */
    private calculateStraightLineRoute(
        from: EasyRouteLocation,
        to: EasyRouteLocation,
        mode: TransportMode
    ): {
        distance: number;
        duration: number;
        path: EasyRouteLocation[];
        polyline?: string;
    } {
        const distance = this.locationAdapter.calculateDistance(from, to);

        // Estimate duration based on mode speed
        const speedKmh = mode.avgSpeedKmh || 25;
        const duration = (distance / 1000) / speedKmh * 60; // Convert to minutes

        return {
            distance,
            duration,
            path: [from, to]
        };
    }

    /**
     * Map transport mode to Google Maps travel mode
     */
    private mapModeToGoogleMode(modeType: string): string {
        const modeMap: Record<string, string> = {
            'walk': 'walking',
            'bike': 'bicycling',
            'bus': 'transit',
            'train': 'transit',
            'taxi': 'driving',
            'keke': 'driving'
        };
        return modeMap[modeType] || 'driving';
    }

    /**
     * Decode Google Maps polyline to coordinates
     */
    private decodePolyline(encoded: string): EasyRouteLocation[] {
        const points: EasyRouteLocation[] = [];
        let index = 0;
        let lat = 0;
        let lng = 0;

        while (index < encoded.length) {
            let b;
            let shift = 0;
            let result = 0;

            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;

            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            points.push({
                latitude: lat / 1e5,
                longitude: lng / 1e5
            });
        }

        return points;
    }
}
