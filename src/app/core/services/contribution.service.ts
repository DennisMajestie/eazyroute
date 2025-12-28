import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    CommuterProtocol,
    PricingReport,
    PricingStats,
    SafetyRating
} from '../../models/crowdsourcing.model';

@Injectable({
    providedIn: 'root'
})
export class ContributionService {
    private readonly API_URL = `${environment.apiUrl}/contributions`;

    constructor(private http: HttpClient) { }

    /**
     * Submit pricing feedback after trip
     */
    submitPricingFeedback(data: {
        routeSegmentId: string;
        pricePaid: number;
        timeOfDay: string;
        conditions: {
            weather: 'clear' | 'rain' | 'harmattan';
            traffic: 'light' | 'moderate' | 'heavy' | 'extreme';
            wasSurge: boolean;
        };
    }): Observable<{ success: boolean; data: { pointsEarned: number } }> {
        return this.http.post<any>(`${this.API_URL}/pricing`, data);
    }

    /**
     * Get pricing statistics for a route
     */
    getPricingStats(fromId: string, toId: string, mode: string): Observable<{ success: boolean; data: PricingStats }> {
        return this.http.get<any>(`${this.API_URL}/pricing/stats`, {
            params: { from: fromId, to: toId, mode }
        });
    }

    /**
     * Submit safety rating
     */
    submitSafetyRating(data: {
        landmarkId: string;
        overallRating: number;
        daytimeRating: number;
        nighttimeRating: number;
        warnings?: Array<{
            condition: string;
            severity: 'low' | 'medium' | 'high' | 'critical';
            message: string;
        }>;
    }): Observable<{ success: boolean; data: { pointsEarned: number } }> {
        return this.http.post<any>(`${this.API_URL}/safety`, data);
    }

    /**
     * Get safety ratings for a route
     */
    getSafetyRatings(fromId: string, toId: string): Observable<{ success: boolean; data: SafetyRating[] }> {
        return this.http.get<any>(`${this.API_URL}/safety`, {
            params: { from: fromId, to: toId }
        });
    }

    /**
     * Submit commuter protocol
     */
    submitCommuterProtocol(data: Partial<CommuterProtocol>): Observable<{ success: boolean; data: { pointsEarned: number } }> {
        return this.http.post<any>(`${this.API_URL}/protocols`, data);
    }

    /**
     * Get commuter protocols for a junction
     */
    getProtocolsForJunction(junctionId: string, destinationId?: string): Observable<{ success: boolean; data: CommuterProtocol[] }> {
        const params: any = { junctionId };
        if (destinationId) params.destinationId = destinationId;

        return this.http.get<any>(`${this.API_URL}/protocols`, { params });
    }

    /**
     * Vote on a contribution (upvote/downvote)
     */
    voteOnContribution(contributionId: string, contributionType: 'protocol' | 'pricing' | 'safety', vote: 'up' | 'down'): Observable<any> {
        return this.http.post(`${this.API_URL}/${contributionType}/${contributionId}/vote`, { vote });
    }

    /**
     * Report inappropriate contribution
     */
    reportContribution(contributionId: string, contributionType: string, reason: string): Observable<any> {
        return this.http.post(`${this.API_URL}/${contributionType}/${contributionId}/report`, { reason });
    }
}
