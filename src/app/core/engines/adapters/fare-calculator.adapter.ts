// ═══════════════════════════════════════════════════════════════════
// FILE 4: Fare Calculator Implementation
// Location: src/app/core/engines/adapters/fare-calculator.adapter.ts
// ═══════════════════════════════════════════════════════════════════

import { Injectable } from '@angular/core';
import { IFareCalculator, RouteSegment, TransportMode, GeneratedRoute } from '../types/easyroute.types';

@Injectable({
    providedIn: 'root'
})
export class FareCalculatorAdapter implements IFareCalculator {
    constructor() { }

    calculateFare(distance: number, mode: TransportMode): number {
        // Distance is in meters, convert to kilometers
        const distanceKm = distance / 1000;

        // Use the mode's rate structure
        const baseRate = mode.baseRate || 0;
        const perKmRate = mode.perKmRate || 0;

        return baseRate + (distanceKm * perKmRate);
    }

    calculateSegmentFare(segment: RouteSegment): number {
        return this.calculateFare(segment.distance, segment.mode);
    }

    estimateTotalFare(route: GeneratedRoute): number {
        return route.segments.reduce((total, segment) => {
            return total + this.calculateSegmentFare(segment);
        }, 0);
    }

    /**
     * Apply discounts or surcharges
     */
    applyPriceModifiers(
        baseFare: number,
        options: {
            peakHour?: boolean;
            weekend?: boolean;
            discount?: number;
        }
    ): number {
        let fare = baseFare;

        if (options.peakHour) {
            fare *= 1.3; // 30% peak hour surcharge
        }

        if (options.weekend) {
            fare *= 0.9; // 10% weekend discount
        }

        if (options.discount) {
            fare *= (1 - options.discount);
        }

        return Math.round(fare);
    }
}

