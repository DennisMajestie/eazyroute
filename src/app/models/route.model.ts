
// src/app/models/route.model.ts

/**
 * SHARED ROUTE MODELS
 * Aligned with Backend Response Structure
 */

export interface Location {
    name: string;
    type?: 'node' | 'hub' | 'village' | 'bus_stop' | string;
    lat: number;
    lng: number;
}

export interface RouteLeg {
    mode: 'walking' | 'keke' | 'okada' | 'bus' | string;
    from: Location;
    to: Location;
    distance: number;
    duration: number;
    cost?: number;
    instruction?: string;
}

export interface RouteData {
    legs: RouteLeg[];
    segments?: RouteLeg[]; // Alias for legs
    totalDistance?: number;
    totalDuration?: number;
    totalCost?: number;
    instructions?: string[];
}

export interface RouteResponse {
    success: boolean;
    data?: any; // Original field
    route?: RouteData | any;
    legs?: RouteLeg[];  // Fallback if structure is different
    alternatives?: RouteData[];
    message?: string;
    error?: string;
    errorType?: string;
    nearbyHubs?: any[];
    suggestion?: string;
}

export interface RouteRequest {
    fromLocation: {
        name: string;
        lat: number;
        lng: number;
    } | string;
    toLocation: {
        name: string;
        lat: number;
        lng: number;
    } | string;
}