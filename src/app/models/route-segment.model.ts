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
    isOneWay?: boolean;
    activeHours?: { start: number; end: number };

    // 🗺️ V5: Spatial Engine Fields
    /** GeoJSON LineString for map polyline rendering */
    path?: {
        type: 'LineString';
        coordinates: number[][]; // [[lng, lat], ...]
    };
    /** Start point for spatial queries */
    startPoint?: {
        type: 'Point';
        coordinates: number[]; // [lng, lat]
    };
    /** End point for spatial queries */
    endPoint?: {
        type: 'Point';
        coordinates: number[]; // [lng, lat]
    };
    /** OSM road metadata for UI hints */
    osmMetadata?: {
        roadType?: string;   // e.g., 'residential', 'primary'
        surface?: string;    // e.g., 'paved', 'unpaved'
        maxspeed?: number;
        lanes?: number;
    };
    /** Geometry validation status */
    geometryStatus?: 'VALID' | 'FLOATING' | 'OFF_ROAD' | 'PENDING';
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
    isOneWay?: boolean;
    activeHours?: { start: number; end: number };
}

export interface RouteSegmentSearchParams {
    fromStopId?: string;
    toStopId?: string;
    transportMode?: TransportMode;
    limit?: number;
}
