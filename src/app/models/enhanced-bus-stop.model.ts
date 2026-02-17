export type BusStopTier = 'primary' | 'sub-landmark' | 'node';
export type TransportMode = 'walking' | 'bus' | 'taxi' | 'keke' | 'okada';
export type BusStopRole = 'boarding' | 'alighting' | 'transfer';

export interface EnhancedBusStop {
    _id?: string;
    id?: string;
    name: string;
    localNames?: string[];
    location: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
    tier: BusStopTier;
    transportModes: TransportMode[];
    roles: BusStopRole[];
    droppingPoints?: string[];
    city: string;
    state: string;
    district?: string;
    areaCouncil?: string; // NEW - Area Council (AMAC, Bwari, Gwagwalada, etc.)
    distanceFromCity?: number; // NEW - Distance from city center in km
    distance?: number; // Distance from user (for nearby searches)
    notes?: string;
    securityProfile?: {
        level: 'safe' | 'caution' | 'high_risk';
        safeZones: string[];
        riskAlerts: string[];
    };
}

export interface RouteSegment {
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    mode: TransportMode;
    distance: number; // in meters
    duration: number; // in minutes
    cost?: number | { min: number, max: number }; // in Naira
    instruction: string;
    dropPoints?: string[];
}

export interface EnhancedRoute {
    from: string;
    to: string;
    segments: RouteSegment[];
    totalDistance: number; // in meters
    totalTime: number; // in minutes
    totalCost: number | { min: number, max: number }; // in Naira
    instructions: string[];
    rationale: string;
}

export interface EnhancedRouteResponse {
    success: boolean;
    data: EnhancedRoute;
    message?: string;
}

export interface SearchParams {
    isCityCenterFallback?: boolean;
    source?: 'local_db' | 'external_map_cached' | 'major_hubs_fallback';
    radius?: number;
    limit?: number;
}

export interface BusStopSearchResponse {
    success: boolean;
    data: EnhancedBusStop[];
    total?: number;
    message?: string;
    searchParams?: SearchParams; // NEW - Metadata about the search result
}
