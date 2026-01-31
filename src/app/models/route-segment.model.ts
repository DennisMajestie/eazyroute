// src/app/models/route-segment.model.ts

import { TransportMode } from './bus-stop.model';

export interface RouteSegment {
    id: string;
    fromStopId: string;
    toStopId: string;
    transportMode: TransportMode;
    priceRange: {
        min: number;
        max: number;
    };
    estimatedTime: number; // minutes
    distance: number; // meters
    popularity: number; // usage count
    createdAt: Date;

    // Populated fields (when fetched with details)
    fromStop?: {
        id: string;
        name: string;
        localNames?: string[];
        area: string;
        type?: string;
    };
    toStop?: {
        id: string;
        name: string;
        localNames?: string[];
        area: string;
        type?: string;
    };
}

export interface CreateRouteSegmentRequest {
    fromStopId: string;
    toStopId: string;
    transportMode: TransportMode;
    priceRange: {
        min: number;
        max: number;
    };
    estimatedTime: number;
    distance: number;
}

export interface RouteSegmentSearchParams {
    fromStopId?: string;
    toStopId?: string;
    transportMode?: TransportMode;
    limit?: number;
}
