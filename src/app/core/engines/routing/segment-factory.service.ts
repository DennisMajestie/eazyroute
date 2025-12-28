/**
 * Segment Factory Service
 * 
 * Creates route segments (walking, transit) with proper cost/time calculations
 * Extracted from route-generation.engine.ts
 */

import { Injectable } from '@angular/core';
import {
    RouteSegment,
    Location,
    TransportMode,
    TransportModeType,
    DEFAULT_TRANSPORT_MODES,
    BusStop
} from '../types/easyroute.types';

@Injectable({
    providedIn: 'root'
})
export class SegmentFactoryService {

    private readonly WALKING_SPEED_MPS = 1.4; // ~5 km/h
    private readonly DEFAULT_BUS_SPEED_KPH = 25;
    private readonly DEFAULT_KEKE_SPEED_KPH = 20;
    private readonly DEFAULT_TAXI_SPEED_KPH = 35;

    // ═══════════════════════════════════════════════════════════════
    // WALKING SEGMENTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create a walking segment between two locations
     */
    createWalkingSegment(
        from: Location,
        to: Location,
        segmentId: string,
        fromName: string = 'Start',
        toName: string = 'End'
    ): RouteSegment {
        const distance = this.calculateDistance(from, to);
        const time = Math.round(distance / this.WALKING_SPEED_MPS / 60); // minutes
        const mode = this.getMode('walk');

        return {
            id: segmentId,
            fromStop: this.createPseudoStop(from, fromName),
            toStop: this.createPseudoStop(to, toName),
            distance: Math.round(distance),
            estimatedTime: Math.max(1, time),
            mode,
            cost: 0,
            instructions: `Walk ${Math.round(distance)}m to ${toName}`
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // TRANSIT SEGMENTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create a transit segment between two bus stops
     */
    createTransitSegment(
        fromStop: BusStop,
        toStop: BusStop,
        modeType: TransportModeType,
        segmentId: string
    ): RouteSegment {
        const distance = this.calculateDistance(
            { latitude: fromStop.latitude, longitude: fromStop.longitude },
            { latitude: toStop.latitude, longitude: toStop.longitude }
        );

        const mode = this.getMode(modeType);
        const time = this.calculateTransitTime(distance, mode);
        const cost = this.calculateFare(distance, mode);

        return {
            id: segmentId,
            fromStop,
            toStop,
            distance: Math.round(distance),
            estimatedTime: time,
            mode,
            cost,
            instructions: `Take ${mode.name} from ${fromStop.name} to ${toStop.name}`
        };
    }

    /**
     * Create a quick transit segment with explicit values
     */
    createQuickTransitSegment(
        fromStop: BusStop,
        toStop: BusStop,
        modeType: TransportModeType,
        segmentId: string,
        overrides?: {
            distance?: number;
            time?: number;
            cost?: number;
        }
    ): RouteSegment {
        const segment = this.createTransitSegment(fromStop, toStop, modeType, segmentId);

        if (overrides) {
            if (overrides.distance !== undefined) segment.distance = overrides.distance;
            if (overrides.time !== undefined) segment.estimatedTime = overrides.time;
            if (overrides.cost !== undefined) segment.cost = overrides.cost;
        }

        return segment;
    }

    // ═══════════════════════════════════════════════════════════════
    // CALCULATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate fare based on distance and transport mode
     */
    calculateFare(distanceMeters: number, mode: TransportMode): number {
        const distanceKm = distanceMeters / 1000;
        const baseFare = mode.baseRate || 0;
        const perKmRate = mode.perKmRate || 0;
        return Math.round(baseFare + (distanceKm * perKmRate));
    }

    /**
     * Calculate transit time based on distance and mode
     */
    calculateTransitTime(distanceMeters: number, mode: TransportMode): number {
        const speedKph = mode.avgSpeedKmh || this.DEFAULT_BUS_SPEED_KPH;
        const distanceKm = distanceMeters / 1000;
        const timeHours = distanceKm / speedKph;
        return Math.max(1, Math.round(timeHours * 60)); // minutes, minimum 1
    }

    /**
     * Calculate Haversine distance between two locations
     */
    calculateDistance(from: Location, to: Location): number {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (from.latitude * Math.PI) / 180;
        const φ2 = (to.latitude * Math.PI) / 180;
        const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
        const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get transport mode by type
     */
    getMode(type: TransportModeType): TransportMode {
        return DEFAULT_TRANSPORT_MODES.find(m => m.type === type) || DEFAULT_TRANSPORT_MODES[0];
    }

    /**
     * Create a pseudo bus stop from a location
     */
    private createPseudoStop(location: Location, name: string): BusStop {
        return {
            id: 0,
            name,
            latitude: location.latitude,
            longitude: location.longitude,
            area: 'Unknown',
            isVerified: false,
            verificationCount: 0,
            type: 'bus_stop',
            localNames: [],
            address: '',
            city: '',
            state: '',
            country: 'Nigeria',
            transportModes: ['bus'],
            routes: [],
            upvotes: 0,
            verificationStatus: 'unverified'
        } as unknown as BusStop;
    }

    /**
     * Get all available transport modes
     */
    getAvailableModes(): TransportMode[] {
        return [...DEFAULT_TRANSPORT_MODES];
    }

    /**
     * Format segment for display
     */
    formatSegment(segment: RouteSegment): string {
        return `${segment.mode.name}: ${segment.fromStop.name} → ${segment.toStop.name} (${segment.estimatedTime}min, ₦${segment.cost})`;
    }
}
