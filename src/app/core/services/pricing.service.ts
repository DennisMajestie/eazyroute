/**
 * Pricing Service - Dynamic Fare Estimation and Price Reporting
 * 
 * Features:
 * - Get dynamic price estimates with surge detection
 * - Submit user-reported prices for crowdsourced pricing
 * - Track price history and trends
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
    PriceEstimate,
    PriceFeedback,
    PriceSubmitResponse,
    PriceHistory
} from '../../models/pricing.types';

@Injectable({
    providedIn: 'root'
})
export class PricingService {
    private apiUrl = `${environment.apiUrl}/fares`;

    constructor(private http: HttpClient) { }

    /**
     * Get dynamic price estimate for a route
     * Returns real-time pricing with surge info
     * 
     * @param fromStopId Origin bus stop ID
     * @param toStopId Destination bus stop ID
     * @param transportMode Transport mode (bus, taxi, keke, okada)
     */
    getDynamicPrice(
        fromStopId: string,
        toStopId: string,
        transportMode: string
    ): Observable<PriceEstimate> {
        const params = new HttpParams()
            .set('fromStopId', fromStopId)
            .set('toStopId', toStopId)
            .set('transportMode', transportMode);

        return this.http.get<{ success: boolean; data: PriceEstimate }>(
            `${this.apiUrl}/dynamic-price`,
            { params }
        ).pipe(
            map(response => response.data)
        );
    }

    /**
     * Submit a user-reported price
     * Contributes to crowdsourced pricing data
     * 
     * @param feedback Price feedback from user
     */
    submitPrice(feedback: PriceFeedback): Observable<PriceSubmitResponse> {
        return this.http.post<PriceSubmitResponse>(
            `${this.apiUrl}/submit-price`,
            {
                ...feedback,
                timestamp: feedback.timestamp || new Date()
            }
        );
    }

    /**
     * Get price history for a route
     * Shows pricing trends over time
     * 
     * @param fromStopId Origin bus stop ID
     * @param toStopId Destination bus stop ID
     * @param transportMode Transport mode
     * @param days Number of days of history (default 30)
     */
    getPriceHistory(
        fromStopId: string,
        toStopId: string,
        transportMode: string,
        days: number = 30
    ): Observable<PriceHistory> {
        const params = new HttpParams()
            .set('fromStopId', fromStopId)
            .set('toStopId', toStopId)
            .set('transportMode', transportMode)
            .set('days', days.toString());

        return this.http.get<{ success: boolean; data: PriceHistory }>(
            `${this.apiUrl}/history`,
            { params }
        ).pipe(
            map(response => response.data)
        );
    }

    /**
     * Check if surge pricing is active
     * Quick check without full price calculation
     */
    isSurgeActive(fromStopId: string, toStopId: string): Observable<boolean> {
        return this.getDynamicPrice(fromStopId, toStopId, 'bus').pipe(
            map(estimate => estimate.surgeMultiplier > 1.0)
        );
    }

    /**
     * Format price for display
     * Returns formatted Nigerian Naira string
     */
    formatPrice(amount: number): string {
        return `₦${amount.toLocaleString('en-NG')}`;
    }

    /**
     * Format price range for display
     */
    formatPriceRange(min: number, max: number): string {
        if (min === max) {
            return this.formatPrice(min);
        }
        return `${this.formatPrice(min)} - ${this.formatPrice(max)}`;
    }

    /**
     * Get confidence level description
     */
    getConfidenceLabel(confidence: number): string {
        if (confidence >= 80) return 'High confidence';
        if (confidence >= 50) return 'Medium confidence';
        return 'Low confidence';
    }

    /**
     * Get surge level description
     */
    getSurgeLabel(multiplier: number): string | null {
        if (multiplier <= 1.0) return null;
        if (multiplier <= 1.2) return 'Slight surge';
        if (multiplier <= 1.5) return 'Surge pricing';
        return 'High demand';
    }
}
