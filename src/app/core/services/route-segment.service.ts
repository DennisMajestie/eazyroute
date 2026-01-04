// src/app/core/services/route-segment.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    RouteSegment,
    CreateRouteSegmentRequest,
    RouteSegmentSearchParams
} from '../../models/route-segment.model';

@Injectable({
    providedIn: 'root'
})
export class RouteSegmentService {
    private apiUrl = `${environment.apiUrl}/route-segments`;

    constructor(private http: HttpClient) { }

    /**
     * Get route segments between two stops
     */
    getSegmentsBetweenStops(fromStopId: string, toStopId: string): Observable<RouteSegment[]> {
        const params = new HttpParams()
            .set('from', fromStopId)
            .set('to', toStopId);

        return this.http.get<RouteSegment[]>(this.apiUrl, { params });
    }

    /**
     * Search route segments with optional filters
     */
    searchSegments(searchParams: RouteSegmentSearchParams): Observable<RouteSegment[]> {
        let params = new HttpParams();

        if (searchParams.fromStopId) {
            params = params.set('from', searchParams.fromStopId);
        }
        if (searchParams.toStopId) {
            params = params.set('to', searchParams.toStopId);
        }
        if (searchParams.transportMode) {
            params = params.set('transportMode', searchParams.transportMode);
        }
        if (searchParams.limit) {
            params = params.set('limit', searchParams.limit.toString());
        }

        return this.http.get<RouteSegment[]>(this.apiUrl, { params });
    }

    /**
     * Get popular route segments
     */
    getPopularSegments(limit: number = 10): Observable<RouteSegment[]> {
        const params = new HttpParams().set('limit', limit.toString());
        return this.http.get<RouteSegment[]>(`${this.apiUrl}/popular`, { params });
    }

    /**
     * Create a new route segment
     */
    createSegment(segment: CreateRouteSegmentRequest): Observable<RouteSegment> {
        return this.http.post<RouteSegment>(this.apiUrl, segment);
    }

    /**
     * Increment popularity count for a segment (when used in a route)
     */
    incrementPopularity(segmentId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${segmentId}/use`, {});
    }

    /**
     * Submit a crowd-sourced route segment (price/time)
     */
    submitCommunitySegment(data: {
        fromStopId: string;
        toStopId: string;
        transportMode: string;
        priceRange: { min: number; max: number };
        estimatedTime: number;
    }): Observable<any> {
        return this.http.post(`${this.apiUrl}/community-submit`, data);
    }
}
